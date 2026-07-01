import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllLoans, getAllUsers, updateLoan, createLoan, findUserById, User, Loan } from '@/lib/edge-db';
import { calculateActivationFee } from '@/lib/utils';
import { z } from 'zod';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const loans = await getAllLoans();
    const users = await getAllUsers();
    const userMap = new Map<number, User>(users.map((u: User) => [u.id, u]));

    const records = loans.map((loan: Loan) => {
      const user = userMap.get(loan.userId);
      return {
        id: loan.id,
        userId: loan.userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown',
        userPhone: user?.phone || 'Unknown',
        amount: loan.amount,
        termMonths: loan.termMonths,
        productType: loan.productType,
        purpose: loan.purpose,
        status: loan.status,
        activationFee: loan.activationFee,
        activationFeeStatus: loan.activationFeeStatus,
        activationFeeReference: loan.activationFeeReference,
        activationFeePaidAt: loan.activationFeePaidAt,
        createdAt: loan.createdAt,
        // Personal details
        fullName: loan.fullName,
        nationalId: loan.nationalId,
        dob: loan.dob,
        gender: loan.gender,
        address: loan.address,
        city: loan.city,
        // Financial details
        occupation: loan.occupation,
        employer: loan.employer,
        incomeRange: loan.incomeRange,
        dependants: loan.dependants,
        mpesaPhone: loan.mpesaPhone,
        // Guarantor
        guarantor: loan.guarantor,
      };
    });

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ records, total: records.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Admin allocates/creates a loan for a customer
const allocateSchema = z.object({
  userId: z.number(),
  amount: z.number().min(5000).max(500000),
  termMonths: z.number().min(1).max(60),
  productType: z.string(),
  purpose: z.string().optional(),
  // Admin sets status - pending means customer must pay activation fee
  status: z.enum(['pending', 'disbursed']).default('pending'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = allocateSchema.parse(await req.json());

    // Verify user exists
    const user = await findUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admin can allocate to ANY user (random allocation - no KYC requirement)

    // Calculate activation fee
    const activationFee = calculateActivationFee(body.amount);

    // Create loan
    const loan = await createLoan({
      userId: body.userId,
      amount: body.amount,
      termMonths: body.termMonths,
      productType: body.productType,
      purpose: body.purpose || 'Admin allocated loan',
      activationFee,
    });

    // If admin sets status to disbursed, mark fee as paid
    if (body.status === 'disbursed') {
      await updateLoan(loan.id, {
        status: 'disbursed',
        activationFeeStatus: 'paid',
        activationFeePaidAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      loanId: loan.id,
      message: `Loan of KES ${body.amount.toLocaleString()} allocated to ${user.name}`,
      loan: {
        id: loan.id,
        amount: loan.amount,
        termMonths: loan.termMonths,
        productType: loan.productType,
        status: body.status,
        activationFee,
      },
    }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id, status } = await req.json();
    await updateLoan(id, { status });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
