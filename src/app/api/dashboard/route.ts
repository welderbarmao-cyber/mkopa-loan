import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, getLoansByUserId, getKycByUserId } from '@/lib/edge-db';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const user = await findUserByEmail(email);
    if (!user) return NextResponse.json({ loans: [], kyc: [] });

    const loans = await getLoansByUserId(user.id);
    const kyc = await getKycByUserId(user.id);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      loans,
      kyc,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
