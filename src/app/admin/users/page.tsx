import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./users-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
