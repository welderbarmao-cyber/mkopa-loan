import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./savings-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
