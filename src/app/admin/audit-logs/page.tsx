import dynamic from 'next/dynamic';

const Content = dynamic(() => import('./audit-logs-content'), { ssr: false });

export default function Page() {
  return <Content />;
}
