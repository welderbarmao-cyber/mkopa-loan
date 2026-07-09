import dynamic from 'next/dynamic';

const PaymentContent = dynamic(() => import('./payment-content'), { ssr: false });

export default function PaymentPage() {
  return <PaymentContent />;
}
