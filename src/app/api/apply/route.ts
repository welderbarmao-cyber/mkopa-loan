import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, findUserByEmail, createLoan } from '@/lib/edge-db-v2';
import { calculateActivationFee } from '@/lib/utils';
import { z } from 'zod';

const applySchema = z.object({
  amount: z.number().min(5000, 'Amount must be at least KES 5,000').max(500000, 'Amount must not exceed KES 500,000'),
  termMonths: z.number().min(1, 'Term must be at least 1 month').max(120, 'Term must not exceed 120 months'),
  productType: z.string().min(1, 'Product type is required'),
  purpose: z.string().optional(),
  fullName: z.string().min(2, 'Full name is required'),
  nationalId: z.string().min(4, 'National ID is required'),
  dob: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  occupation: z.string().min(1, 'Occupation is required'),
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
  incomeRange: z.string().min(1, 'Income range is required'),
  dependants: z.string().min(1, 'Number of dependants is required'),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  mpesaPhone: z.string().min(10, 'Valid M-Pesa phone number is required'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Please sign in to apply for a loan' }, { status: 401 });
    }

    const userId = parseInt((session.user as { id: string }).id);
    let user = await findUserById(userId);
    if (!user && session.user.email) {
      user = await findUserByEmail(session.user.email);
    }
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const actualUserId = user.id;

    if (user.kycStatus !== 'approved') {
      return NextResponse.json({
        error: 'KYC verification required before applying for a loan',
        code: 'KYC_REQUIRED',
      }, { status: 400 });
    }

    const body = applySchema.parse(await req.json());
    const activationFee = calculateActivationFee(body.amount);

    const loan = await createLoan({
      userId: actualUserId,
      amount: body.amount,
      termMonths: body.termMonths,
      productType: body.productType,
      purpose: body.purpose || '',
      activationFee,
      fullName: body.fullName,
      nationalId: body.nationalId,
      dob: body.dob,
      gender: body.gender,
      maritalStatus: body.maritalStatus,
      address: body.address,
      city: body.city,
      occupation: body.occupation,
      employer: body.employer,
      jobTitle: body.jobTitle,
      incomeRange: body.incomeRange,
      dependants: body.dependants,
      bankName: body.bankName,
      bankAccount: body.bankAccount,
      mpesaPhone: body.mpesaPhone,
    });

    return NextResponse.json({
      loanId: loan.id,
      activationFee,
      message: 'Loan application created. Please pay the activation fee to proceed.',
      paymentRequired: true,
    }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      // Return the FIRST validation error with a clear message
      const firstError = e.issues[0];
      const fieldName = firstError?.path?.[0] || 'field';
      const errorMsg = firstError?.message || 'Invalid input';
      return NextResponse.json({
        error: `${fieldName}: ${errorMsg}`,
        field: fieldName,
        details: e.issues,
      }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
