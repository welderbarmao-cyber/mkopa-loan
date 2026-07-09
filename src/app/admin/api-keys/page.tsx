import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./api-keys-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
