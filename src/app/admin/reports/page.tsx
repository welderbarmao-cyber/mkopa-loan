import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./reports-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
