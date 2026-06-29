import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, findLoanById, updateLoan } from '@/lib/edge-db';
import { initiatePayment, normalizePhone, detectNetwork } from '@/lib/xdigitex';
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
    const network = detectNetwork(body.phone);

    // Determine the best gateway based on network
    // safaricom/airtel gateways use Pesapal (redirect_url) - more reliable for hosted checkout
    // mobile gateway uses PawaPay (actual STK push) - may be rejected for some numbers
    // We'll use safaricom/airtel gateways and embed the checkout in an iframe within the app
    const gateway = network === 'safaricom' ? 'safaricom' : network === 'airtel' ? 'airtel' : 'safaricom';

    const payment = await initiatePayment({
      amount: loan.activationFee,
      currency: 'KES',
      gateway,
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

    // For safaricom/airtel gateways: return redirect_url to embed in iframe
    // For mobile gateway: STK push is sent to phone
    const hasRedirectUrl = !!payment.redirect_url;
    const hasStkPush = !!payment.deposit_id;

    return NextResponse.json({
      success: true,
      reference: payment.reference,
      gateway: payment.gateway,
      amount: loan.activationFee,
      // For safaricom/airtel: embed this in an iframe within the app
      redirect_url: payment.redirect_url,
      order_tracking_id: payment.order_tracking_id,
      // For mobile: STK push status
      stkPushSent: hasStkPush,
      stkStatus: payment.pawa_status,
      correspondent: payment.correspondent,
      checkout_url: payment.checkout_url,
      // Payment method type for UI
      paymentType: hasRedirectUrl ? 'iframe' : 'stk_push',
      message: hasRedirectUrl
        ? 'Complete payment in the secure checkout below.'
        : 'STK push sent to your phone. Enter your PIN to complete.',
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
