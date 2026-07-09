import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./kyc-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
