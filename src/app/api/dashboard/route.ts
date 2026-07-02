import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserByEmail, findUserById, getLoansByUserId, getKycByUserId } from '@/lib/edge-db-v2';

export async function GET(req: NextRequest) {
  try {
    // Use session if available, otherwise allow email query for backward compat
    const session = await getServerSession(authOptions);
    let email: string | null = null;

    if (session?.user?.email) {
      email = session.user.email;
    } else {
      email = req.nextUrl.searchParams.get('email');
    }

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    let user = await findUserByEmail(email);
    if (!user) {
      // Fallback: try by session ID
      const userId = parseInt((session?.user as { id?: string })?.id || "0");
      user = await findUserById(userId);
    }
    if (!user) return NextResponse.json({ loans: [], kyc: [], user: null });

    const loans = await getLoansByUserId(user.id);
    const kyc = await getKycByUserId(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        kycStatus: user.kycStatus,
        loanLimit: user.loanLimit,
        kycReviewedAt: user.kycReviewedAt,
        kycRejectionReason: user.kycRejectionReason,
      },
      loans,
      kyc,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
