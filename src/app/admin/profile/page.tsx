import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./profile-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
