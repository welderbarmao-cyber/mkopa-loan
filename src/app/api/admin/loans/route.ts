import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllLoans, getAllUsers, updateLoan, User, Loan } from '@/lib/edge-db';

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

    const loans = await getAllLoans();
    const users = await getAllUsers();
    const userMap = new Map<number, User>(users.map((u: User) => [u.id, u]));

    const records = loans.map((loan: Loan) => {
      const user = userMap.get(loan.userId);
      return {
        id: loan.id,
        userId: loan.userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown',
        userPhone: user?.phone || 'Unknown',
        amount: loan.amount,
        termMonths: loan.termMonths,
        productType: loan.productType,
        purpose: loan.purpose,
        status: loan.status,
        activationFee: loan.activationFee,
        activationFeeStatus: loan.activationFeeStatus,
        activationFeeReference: loan.activationFeeReference,
        activationFeePaidAt: loan.activationFeePaidAt,
        createdAt: loan.createdAt,
      };
    });

    // Sort: newest first
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ records, total: records.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id, status } = await req.json();
    await updateLoan(id, { status });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
