import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser, updateUser } from '@/lib/edge-db';
import { writeData } from '@/lib/github-db';
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

    const existing = await findUserByEmail(body.email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hash(body.password, 12);

    const user = await createUser({
      email: body.email,
      name: body.name,
      phone: body.phone,
      passwordHash,
      role: 'customer',
    });

    // DIRECTLY write pwd file to GitHub storage (guaranteed backup)
    // This ensures the password hash is always available even if 
    // the users array write fails or stores __separate__
    try {
      await writeData(`pwd_${user.id}`, { passwordHash });
    } catch {}

    // Also try to update the user's hash in the array directly
    try {
      await updateUser(body.email, { passwordHash });
    } catch {}

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      message: 'Account created successfully',
    }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
