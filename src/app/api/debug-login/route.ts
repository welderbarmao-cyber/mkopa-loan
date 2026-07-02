import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, findUserById } from '@/lib/edge-db';
import { compare } from 'bcryptjs';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || 'cdnfix@test.com';
  const password = req.nextUrl.searchParams.get('password') || 'Test1234';
  
  const results: Record<string, unknown> = {};
  
  // Step 1: Find user
  try {
    const user = await findUserByEmail(email);
    results.userFound = !!user;
    if (user) {
      results.userId = user.id;
      results.userEmail = user.email;
      results.hashPrefix = user.passwordHash.substring(0, 20);
      results.hashIsSeparate = user.passwordHash === '__separate__';
      
      // Step 2: Compare password
      if (user.passwordHash !== '__separate__') {
        results.passwordValid = await compare(password, user.passwordHash);
      } else {
        results.passwordValid = false;
        results.error = 'Hash is __separate__ - pwd file not read';
      }
    }
  } catch (e) {
    results.error = e instanceof Error ? e.message : 'unknown';
  }
  
  return NextResponse.json(results);
}
