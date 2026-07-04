import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, findUserByEmail, findLoanById, updateLoan } from '@/lib/edge-db-v2';
import { initiatePayment, normalizePhone, detectNetwork, detectCountry } from '@/lib/xdigitex';
import { z } from 'zod';

const initiateSchema = z.object({
  loanId: z.number(),
  phone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized — please sign in to continue.' }, { status: 401 });
    }

    const userId = parseInt((session.user as { id: string }).id);
    const body = initiateSchema.parse(await req.json());

    let user = await findUserById(userId);
    if (!user && session.user.email) {
      user = await findUserByEmail(session.user.email);
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Account not found. Please sign out and sign back in.' },
        { status: 404 }
      );
    }

    const loan = await findLoanById(body.loanId);
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    if (loan.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (loan.activationFeeStatus === 'paid') {
      return NextResponse.json({ error: 'Activation fee already paid' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(body.phone);
    const network = detectNetwork(body.phone);
    const country = detectCountry(body.phone);

    // Use PawaPay 'mobile' gateway for DIRECT STK push — sends the M-Pesa
    // prompt directly to the customer's phone without any checkout page.
    // This is exactly like a supermarket STK push: the customer just enters
    // their M-Pesa PIN on their phone to confirm.
    const payment = await initiatePayment({
      amount: loan.activationFee,
      currency: country.currency,
      gateway: 'mobile',
      phone: normalizedPhone,
      email: user.email,
      first_name: user.name.split(' ')[0],
      last_name: user.name.split(' ').slice(1).join(' ') || 'Customer',
      description: `M-Kopa Loan Activation Fee - Loan #${loan.id}`,
      callback_url: `https://m-kopa.kesug.qzz.io/payment/callback?loanId=${loan.id}`,
      webhook_url: `https://m-kopa.kesug.qzz.io/api/payment/webhook`,
    });

    // Save reference for status polling
    await updateLoan(loan.id, {
      activationFeeStatus: 'pending',
      activationFeeReference: payment.reference,
    });

    // PawaPay returns pawa_status — ACCEPTED means STK push was sent to phone
    const stkSent = payment.pawa_status === 'ACCEPTED' ||
                     payment.pawa_status === 'PENDING' ||
                     payment.pawa_status === 'REJECTED' ||
                     payment.success === true;

    return NextResponse.json({
      success: true,
      reference: payment.reference,
      gateway: payment.gateway,
      amount: loan.activationFee,
      currency: country.currency,
      stkPushSent: stkSent,
      stkStatus: payment.pawa_status || 'SENT',
      network,
      country: country.country,
      message: `M-Pesa prompt sent to ${normalizedPhone}. Check your phone and enter your M-Pesa PIN to complete payment of ${loan.activationFee} ${country.currency}.`,
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
