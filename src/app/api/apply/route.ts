import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, findUserByEmail, createLoan, Guarantor } from '@/lib/edge-db-v2';
import { calculateActivationFee } from '@/lib/utils';
import { z } from 'zod';

const guarantorSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().optional(),
  relation: z.string().min(1),
  occupation: z.string().min(1),
  incomeRange: z.string().min(1),
  idNumber: z.string().min(4),
});

const applySchema = z.object({
  amount: z.number().min(5000).max(500000),
  termMonths: z.number().min(1).max(60),
  productType: z.string(),
  purpose: z.string().optional(),
  // Personal
  fullName: z.string().min(2),
  nationalId: z.string().min(4),
  dob: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  address: z.string().optional(),
  city: z.string().min(1),
  // Financial
  occupation: z.string().min(1),
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
  incomeRange: z.string().min(1),
  dependants: z.string().min(1),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  mpesaPhone: z.string().min(10),
  // Guarantor
  guarantor: guarantorSchema,
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
      // Personal
      fullName: body.fullName,
      nationalId: body.nationalId,
      dob: body.dob,
      gender: body.gender,
      maritalStatus: body.maritalStatus,
      address: body.address,
      city: body.city,
      // Financial
      occupation: body.occupation,
      employer: body.employer,
      jobTitle: body.jobTitle,
      incomeRange: body.incomeRange,
      dependants: body.dependants,
      bankName: body.bankName,
      bankAccount: body.bankAccount,
      mpesaPhone: body.mpesaPhone,
      // Guarantor
      guarantor: body.guarantor as Guarantor,
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
