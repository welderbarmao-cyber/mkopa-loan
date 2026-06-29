import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser, createLoan } from '@/lib/edge-db';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  amount: z.number().min(5000).max(500000),
  termMonths: z.number().min(1).max(60),
  productType: z.string(),
  purpose: z.string().optional(),
  phone: z.string().min(10),
  name: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    let userId: number;
    const existing = await findUserByEmail(body.email);
    if (existing) {
      userId = existing.id;
    } else {
      // Create a customer record (no login until they sign up)
      const newUser = await createUser({
        email: body.email,
        name: body.name,
        phone: body.phone,
        passwordHash: 'customer-no-login-' + Date.now(),
        role: 'customer',
      });
      userId = newUser.id;
    }

    const loan = await createLoan({
      userId,
      amount: body.amount,
      termMonths: body.termMonths,
      productType: body.productType,
      purpose: body.purpose || '',
    });

    return NextResponse.json({ loanId: loan.id, message: 'Application submitted' }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
