import { NextRequest, NextResponse } from 'next/server';
import { getAllLoans, updateLoan } from '@/lib/edge-db-v2';
import { getPaymentStatus } from '@/lib/xdigitex';

// Webhook handler for XDigitex payment notifications
// This endpoint is called by XDigitex when payment status changes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference } = body;

    // Verify this is a legitimate webhook by checking the payment status
    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 });
    }

    // Fetch the actual payment status from XDigitex (security: don't trust webhook payload)
    let paymentStatus;
    try {
      paymentStatus = await getPaymentStatus(reference);
    } catch {
      // If we can't verify, ignore the webhook
      return NextResponse.json({ error: 'Could not verify payment' }, { status: 400 });
    }

    // Find the loan with this payment reference
    const allLoans = await getAllLoans();
    const loan = allLoans.find(l => l.activationFeeReference === reference);

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found for reference' }, { status: 404 });
    }

    // Update loan based on verified payment status
    if (paymentStatus.status === 'completed' && loan.activationFeeStatus !== 'paid') {
      await updateLoan(loan.id, {
        activationFeeStatus: 'paid',
        activationFeePaidAt: new Date().toISOString(),
        status: 'approved', // Loan is approved once activation fee is paid
      });
    } else if (paymentStatus.status === 'failed' && loan.activationFeeStatus !== 'paid') {
      await updateLoan(loan.id, {
        activationFeeStatus: 'failed',
      });
    }

    return NextResponse.json({ success: true, status: paymentStatus.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Also support GET for manual status checks
export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 });
    }

    const paymentStatus = await getPaymentStatus(reference);

    // Also update the loan status
    const allLoans = await getAllLoans();
    const loan = allLoans.find(l => l.activationFeeReference === reference);

    if (loan) {
      if (paymentStatus.status === 'completed' && loan.activationFeeStatus !== 'paid') {
        await updateLoan(loan.id, {
          activationFeeStatus: 'paid',
          activationFeePaidAt: new Date().toISOString(),
          status: 'approved',
        });
      } else if (paymentStatus.status === 'failed' && loan.activationFeeStatus !== 'paid') {
        await updateLoan(loan.id, {
          activationFeeStatus: 'failed',
        });
      }
    }

    return NextResponse.json({
      reference: paymentStatus.reference,
      status: paymentStatus.status,
      amount: paymentStatus.amount,
      gateway: paymentStatus.gateway,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
