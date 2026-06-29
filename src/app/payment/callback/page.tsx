'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loanId = searchParams.get('loanId');
  const reference = searchParams.get('reference');

  useEffect(() => {
    // Redirect to status page after a moment
    if (loanId) {
      const target = reference
        ? `/payment/status?reference=${reference}&loanId=${loanId}`
        : `/payment/status?loanId=${loanId}`;
      setTimeout(() => router.push(target), 1500);
    } else {
      setTimeout(() => router.push('/dashboard'), 1500);
    }
  }, [loanId, reference, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Loader2 className="w-12 h-12 text-mkopa-green animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Processing Payment...</h1>
        <p className="text-gray-500 text-sm mb-4">Please wait while we confirm your payment.</p>
        <Link href="/dashboard" className="text-mkopa-green text-sm font-semibold hover:underline">
          Go to Dashboard →
        </Link>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
