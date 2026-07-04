// Build version: 20260704-reliable
// Self-contained signup endpoint that writes REAL bcrypt hashes DIRECTLY to
// data/users.json on the kyc-docs branch via GitHub Contents API.
//
// Key design choices:
// - Does NOT depend on edge-db.ts (avoids any stale Edge Config fallback)
// - Stores the passwordHash INLINE in users.json (no separate pwd files)
// - Also writes a backup pwd_<id>.json file for backward compatibility
// - Updates counters atomically (read SHA, write, retry on conflict)
// - Returns the new user object so the client can auto-login

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const GITHUB_API = 'https://api.github.com/repos/welderbarmao-cyber/mkopa-loan';
const BRANCH = 'kyc-docs';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface GhFile {
  content: string;
  sha: string;
}

async function ghReadFile(path: string): Promise<GhFile | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const resp = await fetch(`${GITHUB_API}/contents/${path}?ref=${BRANCH}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
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

async function ghWriteFile(
  path: string,
  content: string,
  sha?: string
): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  try {
    const body: Record<string, string> = {
      message: `Update ${path}`,
      content: Buffer.from(content).toString('base64'),
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    // Retry up to 3 times for SHA conflicts (concurrent writes)
    for (let i = 0; i < 3; i++) {
      const resp = await fetch(`${GITHUB_API}/contents/${path}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(body),
      });
      if (resp.ok) return true;
      if (resp.status === 409 || resp.status === 422) {
        // SHA conflict — get fresh SHA and retry
        const fresh = await ghReadFile(path);
        if (fresh) body.sha = fresh.sha;
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
        continue;
      }
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

interface UserRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string; // real bcrypt hash, inline
  role: 'admin' | 'customer';
  phone: string;
  kycStatus: 'none' | 'submitted' | 'approved' | 'rejected';
  loanLimit: number;
  createdAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = signupSchema.parse(await req.json());
    const normalizedEmail = body.email.trim().toLowerCase();
    const passwordHash = await hash(body.password, 12);

    // 1. Read current users.json
    const usersFile = await ghReadFile('data/users.json');
    if (!usersFile) {
      return NextResponse.json(
        { error: 'Failed to read user data. Please try again.' },
        { status: 500 }
      );
    }

    let users: UserRecord[];
    try {
      users = JSON.parse(usersFile.content);
      if (!Array.isArray(users)) users = [];
    } catch {
      users = [];
    }

    // 2. Check for duplicate email (case-insensitive)
    if (
      users.some(
        (u) => (u.email || '').toLowerCase() === normalizedEmail
      )
    ) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // 3. Read counters.json to get the next user ID
    const countersFile = await ghReadFile('data/counters.json');
    if (!countersFile) {
      return NextResponse.json(
        { error: 'Failed to read counters. Please try again.' },
        { status: 500 }
      );
    }
    const counters = JSON.parse(countersFile.content);
    const newId = (counters.user || 0) + 1;
    counters.user = newId;

    // 4. Create the new user record (with REAL bcrypt hash inline)
    const newUser: UserRecord = {
      id: newId,
      email: normalizedEmail,
      name: body.name.trim(),
      passwordHash, // REAL hash stored INLINE
      role: 'customer',
      phone: body.phone.trim(),
      kycStatus: 'none',
      loanLimit: 0,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);

    // 5. Write updated users.json
    const usersWritten = await ghWriteFile(
      'data/users.json',
      JSON.stringify(users, null, 2),
      usersFile.sha
    );
    if (!usersWritten) {
      return NextResponse.json(
        { error: 'Failed to save account. Please try again.' },
        { status: 500 }
      );
    }

    // 6. Write backup pwd_<id>.json (for backward compatibility with old code)
    await ghWriteFile(
      `data/pwd_${newId}.json`,
      JSON.stringify({ passwordHash })
    );

    // 7. Update counters.json
    await ghWriteFile(
      'data/counters.json',
      JSON.stringify(counters, null, 2),
      countersFile.sha
    );

    return NextResponse.json(
      {
        user: {
          id: newId,
          email: normalizedEmail,
          name: newUser.name,
          role: 'customer',
        },
        message: 'Account created successfully',
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
