import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.DATABASE_URL || 'NOT SET';
  try {
    // Parse URL and show only safe parts (no full password)
    const u = new URL(url);
    return NextResponse.json({
      host: u.host,
      database: u.pathname.replace('/', ''),
      username: u.username,
      passwordLength: u.password.length,
      passwordPrefix: u.password.substring(0, 4),
      passwordSuffix: u.password.substring(u.password.length - 4),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid URL', raw: url.substring(0, 50) + '...' });
  }
}
