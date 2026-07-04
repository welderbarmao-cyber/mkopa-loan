// Server component wrapper — forces dynamic rendering so Vercel's CDN edge
// never caches a stale HTML shell for the payment page. The actual UI is
// rendered client-side by PaymentClient (see payment-client.tsx).
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import PaymentClient from './payment-client';

export default function PaymentPage() {
  return <PaymentClient />;
}
