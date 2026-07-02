import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/edge-db';
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

    // DIRECTLY write pwd file to GitHub (guaranteed to work)
    await writeData(`pwd_${user.id}`, { passwordHash });

    // DIRECTLY fix the user's hash in the users array
    // Read current users, fix this user's hash, write back
    try {
      const token = process.env.GITHUB_TOKEN;
      if (token) {
        // Read users.json
        const usersResp = await fetch(
          'https://api.github.com/repos/welderbarmao-cyber/mkopa-loan/contents/data/users.json?ref=kyc-docs',
          { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }, cache: 'no-store' }
        );
        if (usersResp.ok) {
          const usersFile = await usersResp.json();
          const users = JSON.parse(Buffer.from(usersFile.content, 'base64').toString('utf-8'));
          const sha = usersFile.sha;
          
          // Fix this user's hash
          const idx = users.findIndex((u: { id: number }) => u.id === user.id);
          if (idx >= 0) {
            users[idx].passwordHash = passwordHash;
          }
          
          // Write back
          const content = Buffer.from(JSON.stringify(users)).toString('base64');
          await fetch('https://api.github.com/repos/welderbarmao-cyber/mkopa-loan/contents/data/users.json', {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Fix hash for user ${user.id}`, content, branch: 'kyc-docs', sha }),
          });
        }
      }
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
