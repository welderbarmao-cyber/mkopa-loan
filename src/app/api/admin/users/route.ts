import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllUsers } from '@/lib/edge-db-v2';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const users = await getAllUsers();
    // Exclude passwordHash from response
    const records = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      kycStatus: u.kycStatus,
      loanLimit: u.loanLimit,
      loanLimitAssignedAt: u.loanLimitAssignedAt,
      kycSubmittedAt: u.kycSubmittedAt,
      kycReviewedAt: u.kycReviewedAt,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ records, total: records.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
