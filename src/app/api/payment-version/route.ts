import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: 'pesapal-checkout-v2',
    timestamp: Date.now(),
    features: ['checkout_url', 'iframe_overlay', 'github_direct_reads'],
  });
}
