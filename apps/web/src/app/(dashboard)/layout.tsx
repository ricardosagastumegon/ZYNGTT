'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Package, FileText, MapPin, CreditCard,
  FileStack, BarChart2, LogOut, Wheat
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/shipments', label: 'Envíos', icon: Package },
  { href: '/quotes/new', label: 'Cotizar', icon: FileText },
  { href: '/tracking', label: 'Tracking', icon: MapPin },
  { href: '/food-import', label: 'Alimentos MX→GT', icon: Wheat },
  { href: '/payments/history', label: 'Pagos', icon: CreditCard },
  { href: '/customs/guide', label: 'Aduanas', icon: FileStack },
  { href: '/reports', label: 'Reportes', icon: BarChart2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-navy-700 text-white flex flex-col">
        <div className="p-6 border-b border-navy-500">
          <h1 className="text-xl font-bold">ZYN</h1>
          <p className="text-navy-100 text-xs mt-0.5">{user?.company?.name || user?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                pathname === href ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'
              }`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-navy-500">
          <div className="text-xs text-navy-200 mb-3">{user?.firstName} {user?.lastName}</div>
          <button onClick={logout}
            className="flex items-center gap-2 text-sm text-navy-200 hover:text-white transition">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
