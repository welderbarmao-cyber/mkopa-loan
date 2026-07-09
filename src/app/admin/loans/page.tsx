import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./loans-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
