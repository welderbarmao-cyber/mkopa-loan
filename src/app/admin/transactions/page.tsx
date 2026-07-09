import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./transactions-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
