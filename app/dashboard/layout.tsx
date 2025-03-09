import { DashboardLayout } from '@/components/dashboard/dashboard-layout'

export const metadata = {
  title: 'Dashboard - E11EVEN Central',
  description: 'E11EVEN Central Dashboard',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
} 