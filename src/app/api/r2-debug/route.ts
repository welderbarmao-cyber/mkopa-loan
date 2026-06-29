import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || 'NOT SET',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || 'NOT SET',
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? 'SET (hidden)' : 'NOT SET',
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'NOT SET',
  });
}
