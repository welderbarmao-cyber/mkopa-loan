import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserByEmail, getLoansByUserId, getKycByUserId } from '@/lib/edge-db';

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

    const user = await findUserByEmail(email);
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
