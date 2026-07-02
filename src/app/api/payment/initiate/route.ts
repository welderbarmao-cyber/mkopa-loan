import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, findUserByEmail, findLoanById, updateLoan } from '@/lib/edge-db';
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((session.user as { id: string }).id);
    const body = initiateSchema.parse(await req.json());

    let user = await findUserById(userId);
    if (!user && session.user.email) {
      user = await findUserByEmail(session.user.email);
    }
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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

    // Use 'mobile' gateway (PawaPay) - supports all African mobile money networks
    // Sends direct STK push to the customer's phone
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

    await updateLoan(loan.id, {
      activationFeeStatus: 'pending',
      activationFeeReference: payment.reference,
    });

    const stkAccepted = payment.pawa_status === 'ACCEPTED' || payment.pawa_status === 'PENDING';

    return NextResponse.json({
      success: true,
      reference: payment.reference,
      gateway: payment.gateway,
      amount: loan.activationFee,
      currency: country.currency,
      stkPushSent: stkAccepted,
      stkStatus: payment.pawa_status,
      correspondent: payment.correspondent,
      network: network,
      country: country.country,
      message: stkAccepted
        ? `M-Pesa/Mobile Money prompt sent to ${normalizedPhone}. Enter your PIN on your phone to complete payment.`
        : `Payment initiated for ${normalizedPhone}. Check your phone for the prompt.`,
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
