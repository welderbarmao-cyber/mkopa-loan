import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./analytics-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
