import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/edge-db';

export async function GET() {
  try {
    const user = await findUserByEmail('deftest@test.com');
    if (!user) return NextResponse.json({ error: 'User not found' });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      hashPrefix: user.passwordHash.substring(0, 20),
      hashIsSeparate: user.passwordHash === '__separate__',
      hashStartsWith2b: user.passwordHash.startsWith('$2b$'),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' });
  }
}
