import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/edge-db';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = signupSchema.parse(await req.json());

    // Check if user already exists
    const existing = await findUserByEmail(body.email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Hash the password
    const passwordHash = await hash(body.password, 12);

    // Create the user with customer role
    const user = await createUser({
      email: body.email,
      name: body.name,
      phone: body.phone,
      passwordHash,
      role: 'customer',
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: 'Account created successfully',
    }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      const issues = e.issues;
      return NextResponse.json({ error: issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
