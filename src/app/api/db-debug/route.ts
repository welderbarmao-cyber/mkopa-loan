import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.DATABASE_URL || 'NOT SET';
  try {
    const u = new URL(url);
    return NextResponse.json({
      full: url, // Include full URL for debugging purposes
      host: u.host,
      database: u.pathname.replace('/', ''),
      username: u.username,
      password: u.password,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid URL', raw: url });
  }
}
