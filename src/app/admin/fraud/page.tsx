import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./fraud-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
