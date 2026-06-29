import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loans, users, kycUploads } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!userRows.length) return NextResponse.json({ loans: [], kyc: [] });

    const user = userRows[0];
    const userLoans = await db.select().from(loans).where(eq(loans.userId, user.id));
    const userKyc = await db.select().from(kycUploads).where(eq(kycUploads.userId, user.id));

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, loans: userLoans, kyc: userKyc });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
