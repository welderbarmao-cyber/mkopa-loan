import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./support-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
