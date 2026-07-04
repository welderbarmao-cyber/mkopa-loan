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
    // Auth required — never bypass. We need the session to know WHO is paying
    // and to confirm the loan belongs to them. Removing this would let anyone
    // trigger STK pushes against any phone number.
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized — please sign in to continue.' }, { status: 401 });
    }

    const userId = parseInt((session.user as { id: string }).id);
    const body = initiateSchema.parse(await req.json());

    // Tolerant user lookup: try by ID first, then by email. This avoids
    // false "User not found" errors when Edge Config has stale IDs.
    let user = await findUserById(userId);
    if (!user && session.user.email) {
      user = await findUserByEmail(session.user.email);
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Account not found. Please sign out and sign back in, then try again.' },
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

    // Route to the correct gateway based on detected network.
    // Safaricom (M-Pesa Kenya) → 'safaricom' gateway (direct Daraja STK push)
    // Airtel (Kenya)           → 'airtel'   gateway (direct Airtel STK push)
    // All other networks       → 'mobile'   gateway (PawaPay universal)
    let gateway: 'safaricom' | 'airtel' | 'mobile' = 'mobile';
    if (country.country === 'Kenya') {
      if (network.toLowerCase().includes('mpesa') || network.toLowerCase().includes('m-pesa') || network.toLowerCase().includes('safaricom')) {
        gateway = 'safaricom';
      } else if (network.toLowerCase().includes('airtel')) {
        gateway = 'airtel';
      }
    }

    // Send STK push directly to the customer's phone — they only enter their PIN
    const payment = await initiatePayment({
      amount: loan.activationFee,
      currency: country.currency,
      gateway,
      phone: normalizedPhone,
      email: user.email,
      first_name: user.name.split(' ')[0],
      last_name: user.name.split(' ').slice(1).join(' ') || 'Customer',
      description: `M-Kopa Loan Activation Fee - Loan #${loan.id}`,
      callback_url: `https://m-kopa.kesug.qzz.io/payment/callback?loanId=${loan.id}`,
      webhook_url: `https://m-kopa.kesug.qzz.io/api/payment/webhook`,
    });

    // Check if the STK push was actually accepted by the mobile network.
    // PawaPay returns pawa_status: ACCEPTED | PENDING | REJECTED | FAILED
    // Only ACCEPTED and PENDING mean a prompt was actually sent to the phone.
    const stkAccepted = payment.pawa_status === 'ACCEPTED' || payment.pawa_status === 'PENDING';

    if (!stkAccepted) {
      // STK push was REJECTED or FAILED — no prompt will appear on the phone.
      // Common causes: fake/test number, number not registered for mobile money,
      // wrong network, or network-side rejection.
      const reason =
        payment.pawa_status === 'REJECTED'
          ? `The mobile network rejected the payment prompt for ${normalizedPhone}. This usually means the number is not registered for ${network} mobile money, or the number is invalid. Please use a real ${network} registered phone number.`
          : `Payment could not be initiated (status: ${payment.pawa_status}). Please try again or contact support.`;
      return NextResponse.json(
        {
          error: reason,
          stkStatus: payment.pawa_status,
          reference: payment.reference,
        },
        { status: 400 }
      );
    }

    // STK push accepted — prompt is on its way to the customer's phone
    await updateLoan(loan.id, {
      activationFeeStatus: 'pending',
      activationFeeReference: payment.reference,
    });

    return NextResponse.json({
      success: true,
      reference: payment.reference,
      gateway: payment.gateway,
      amount: loan.activationFee,
      currency: country.currency,
      stkPushSent: true,
      stkStatus: payment.pawa_status,
      correspondent: payment.correspondent,
      network: network,
      country: country.country,
      message: `${network} prompt sent to ${normalizedPhone}. Enter your PIN on your phone to complete payment of ${loan.activationFee} ${country.currency}.`,
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
