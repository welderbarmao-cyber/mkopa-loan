import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loans, users } from '@/lib/schema';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

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
    const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing.length) {
      userId = existing[0].id;
    } else {
      const inserted = await db.insert(users).values({
        email: body.email, name: body.name, phone: body.phone,
        passwordHash: 'customer-no-login', role: 'customer',
      }).returning({ id: users.id });
      userId = inserted[0].id;
    }

    const loan = await db.insert(loans).values({
      userId, amount: body.amount, termMonths: body.termMonths,
      productType: body.productType, purpose: body.purpose || '', status: 'pending',
    }).returning({ id: loans.id });

    return NextResponse.json({ loanId: loan[0].id, message: 'Application submitted' }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
