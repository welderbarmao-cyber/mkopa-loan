import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, createLoan } from '@/lib/edge-db';
import { calculateActivationFee } from '@/lib/utils';
import { z } from 'zod';

const applySchema = z.object({
  amount: z.number().min(5000).max(500000),
  termMonths: z.number().min(1).max(60),
  productType: z.string(),
  purpose: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Please sign in to apply for a loan' }, { status: 401 });
    }

    const userId = parseInt((session.user as { id: string }).id);
    const user = await findUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Check KYC is approved
    if (user.kycStatus !== 'approved') {
      return NextResponse.json({
        error: 'KYC verification required before applying for a loan',
        code: 'KYC_REQUIRED',
      }, { status: 400 });
    }

    const body = applySchema.parse(await req.json());

    // Customer can select ANY amount between 5,000 and 500,000
    // No loan limit restriction - customer chooses their preferred amount
    // The loan limit is just a suggested maximum, not enforced

    // Calculate activation fee
    const activationFee = calculateActivationFee(body.amount);

    // Create loan with unpaid activation fee
    const loan = await createLoan({
      userId,
      amount: body.amount,
      termMonths: body.termMonths,
      productType: body.productType,
      purpose: body.purpose || '',
      activationFee,
    });

    return NextResponse.json({
      loanId: loan.id,
      activationFee,
      message: 'Loan application created. Please pay the activation fee to proceed.',
      paymentRequired: true,
    }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
