import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./dashboard-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
