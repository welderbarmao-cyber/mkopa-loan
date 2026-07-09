import dynamic from 'next/dynamic';

const AdminLayoutContent = dynamic(() => import('./admin-layout-content'), { ssr: false });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
