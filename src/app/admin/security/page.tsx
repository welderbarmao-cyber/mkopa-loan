import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./security-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
