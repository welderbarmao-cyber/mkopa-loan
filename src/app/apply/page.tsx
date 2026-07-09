import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./apply-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
