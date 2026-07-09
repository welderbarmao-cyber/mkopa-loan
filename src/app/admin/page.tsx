import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./admin-home-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
