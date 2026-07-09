import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./notifications-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
