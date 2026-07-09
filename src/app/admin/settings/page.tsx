import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./settings-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
