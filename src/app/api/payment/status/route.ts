import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findLoanById, updateLoan } from '@/lib/edge-db';
import { getPaymentStatus } from '@/lib/xdigitex';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reference = req.nextUrl.searchParams.get('reference');
    const loanId = req.nextUrl.searchParams.get('loanId');

    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 });
    }

    // Fetch payment status from XDigitex
    const status = await getPaymentStatus(reference);

    // If loanId provided, update the loan record
    if (loanId) {
      const loan = await findLoanById(parseInt(loanId));
      if (loan && loan.activationFeeReference === reference) {
        if (status.status === 'completed' && loan.activationFeeStatus !== 'paid') {
          await updateLoan(loan.id, {
            activationFeeStatus: 'paid',
            activationFeePaidAt: new Date().toISOString(),
            status: 'approved', // Loan is approved once activation fee is paid
          });
        } else if (status.status === 'failed' && loan.activationFeeStatus !== 'paid') {
          await updateLoan(loan.id, {
            activationFeeStatus: 'failed',
          });
        }
      }
    }

    return NextResponse.json({
      reference: status.reference,
      status: status.status,
      amount: status.amount,
      gateway: status.gateway,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
