import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./repayments-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
