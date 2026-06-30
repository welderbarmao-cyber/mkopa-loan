import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, findLoanById, updateLoan } from '@/lib/edge-db';
import { initiatePayment, normalizePhone } from '@/lib/xdigitex';
import { z } from 'zod';

const initiateSchema = z.object({
  loanId: z.number(),
  phone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((session.user as { id: string }).id);
    const body = initiateSchema.parse(await req.json());

    const loan = await findLoanById(body.loanId);
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    if (loan.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (loan.activationFeeStatus === 'paid') {
      return NextResponse.json({ error: 'Activation fee already paid' }, { status: 400 });
    }

    const user = await findUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const normalizedPhone = normalizePhone(body.phone);

    // Use 'mobile' gateway - sends ACTUAL STK push to the customer's phone
    // pawa_status: ACCEPTED = STK push sent successfully to phone
    // The customer will see an M-Pesa prompt ON THEIR PHONE
    const payment = await initiatePayment({
      amount: loan.activationFee,
      currency: 'KES',
      gateway: 'mobile',
      phone: normalizedPhone,
      email: user.email,
      first_name: user.name.split(' ')[0],
      last_name: user.name.split(' ').slice(1).join(' ') || 'Customer',
      description: `M-Kopa Loan Activation Fee - Loan #${loan.id}`,
      callback_url: `https://m-kopa.kesug.qzz.io/payment/callback?loanId=${loan.id}`,
      webhook_url: `https://m-kopa.kesug.qzz.io/api/payment/webhook`,
    });

    // Update loan with payment reference
    await updateLoan(loan.id, {
      activationFeeStatus: 'pending',
      activationFeeReference: payment.reference,
    });

    return NextResponse.json({
      success: true,
      reference: payment.reference,
      gateway: payment.gateway,
      amount: loan.activationFee,
      // STK push status
      stkPushSent: payment.pawa_status === 'ACCEPTED' || payment.pawa_status === 'PENDING',
      stkStatus: payment.pawa_status,
      correspondent: payment.correspondent,
      checkout_url: payment.checkout_url,
      message: payment.pawa_status === 'ACCEPTED'
        ? `STK push sent to ${normalizedPhone}. Check your phone and enter your M-Pesa PIN to complete payment.`
        : 'Payment initiated. Please check your phone.',
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
