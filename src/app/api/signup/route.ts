// Build version: 20260702-final

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const GITHUB_API = 'https://api.github.com/repos/welderbarmao-cyber/mkopa-loan';
const BRANCH = 'kyc-docs';

async function ghReadFile(path: string): Promise<{ content: string; sha: string } | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const resp = await fetch(`${GITHUB_API}/contents/${path}?ref=${BRANCH}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
      cache: 'no-store',
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
      sha: data.sha,
    };
  } catch {
    return null;
  }
}

async function ghWriteFile(path: string, content: string, sha?: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  try {
    const body: Record<string, string> = {
      message: `Update ${path}`,
      content: Buffer.from(content).toString('base64'),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;
    
    // Retry up to 3 times for SHA conflicts
    for (let i = 0; i < 3; i++) {
      const resp = await fetch(`${GITHUB_API}/contents/${path}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (resp.ok) return true;
      if (resp.status === 409 || resp.status === 422) {
        // SHA conflict - get fresh SHA and retry
        const fresh = await ghReadFile(path);
        if (fresh) body.sha = fresh.sha;
        await new Promise(r => setTimeout(r, 300 * (i + 1)));
        continue;
      }
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = signupSchema.parse(await req.json());
    const passwordHash = await hash(body.password, 12);

    // Read current users directly from GitHub
    const usersFile = await ghReadFile('data/users.json');
    if (!usersFile) {
      return NextResponse.json({ error: 'Failed to read user data' }, { status: 500 });
    }

    const users = JSON.parse(usersFile.content);
    
    // Check if email already exists
    if (users.some((u: { email: string }) => u.email === body.email)) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Generate new user ID
    const countersFile = await ghReadFile('data/counters.json');
    if (!countersFile) {
      return NextResponse.json({ error: 'Failed to read counters' }, { status: 500 });
    }
    const counters = JSON.parse(countersFile.content);
    const newId = (counters.user || 1) + 1;
    counters.user = newId;

    // Create new user WITH REAL HASH
    const newUser = {
      id: newId,
      email: body.email,
      name: body.name,
      passwordHash: passwordHash, // REAL HASH - not __separate__
      role: 'customer',
      phone: body.phone,
      kycStatus: 'none',
      loanLimit: 0,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    // Write users array with REAL HASH
    const usersWritten = await ghWriteFile('data/users.json', JSON.stringify(users), usersFile.sha);
    if (!usersWritten) {
      return NextResponse.json({ error: 'Failed to save account. Please try again.' }, { status: 500 });
    }

    // Also write pwd file as backup
    await ghWriteFile(`data/pwd_${newId}.json`, JSON.stringify({ passwordHash }));

    // Update counters
    await ghWriteFile('data/counters.json', JSON.stringify(counters), countersFile.sha);

    return NextResponse.json({
      user: { id: newId, email: body.email, name: body.name, role: 'customer' },
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
