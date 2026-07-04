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

    // Route to the correct gateway based on detected network.
    // Safaricom (M-Pesa) → 'safaricom' gateway (Pesapal STK push)
    // Airtel → 'airtel' gateway (Pesapal STK push)
    // Other → 'mobile' gateway (PawaPay)
    let gateway: 'safaricom' | 'airtel' | 'mobile' = 'mobile';
    if (country.country === 'Kenya') {
      const netLower = network.toLowerCase();
      if (netLower.includes('mpesa') || netLower.includes('m-pesa') || netLower.includes('safaricom')) {
        gateway = 'safaricom';
      } else if (netLower.includes('airtel')) {
        gateway = 'airtel';
      }
    }

    // Initiate payment via XDigitex — returns a Pesapal checkout URL
    // that triggers the STK push on the customer's phone
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

    // Save reference for status polling
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
      stkStatus: payment.pawa_status || (payment.redirect_url ? 'CHECKOUT_READY' : 'UNKNOWN'),
      network,
      country: country.country,
      // Pesapal checkout URL — frontend opens this to trigger STK push
      checkout_url: payment.redirect_url,
      order_tracking_id: payment.order_tracking_id,
      message: `${network} payment initiated for ${normalizedPhone}. Open the payment page to complete.`,
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
