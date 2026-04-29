'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, FileText,
  MapPin, CreditCard, Settings, LogOut, Menu, X,
  Building2, Users, UserCheck, Truck, ClipboardList,
  Send, History, UserCircle, PackagePlus,
} from 'lucide-react';

const ROL_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  EMPRESA: 'Empresa',
  AGENTE: 'Agente Aduanal',
  TRANSPORTISTA: 'Transportista',
};

type NavItem = { href: string; label: string; icon: React.ElementType };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  SUPERADMIN: [
    { href: '/dashboard/admin',   label: 'Dashboard',       icon: LayoutDashboard },
    { href: '/empresas',          label: 'Empresas',        icon: Building2 },
    { href: '/agentes',           label: 'Agentes',         icon: UserCheck },
    { href: '/transportistas',    label: 'Transportistas',  icon: Truck },
    { href: '/import',            label: 'Importaciones',   icon: ArrowDownToLine },
    { href: '/export',            label: 'Exportaciones',   icon: ArrowUpFromLine },
    { href: '/documents',         label: 'Documentos',      icon: FileText },
    { href: '/usuarios',          label: 'Usuarios',        icon: Users },
    { href: '/settings',          label: 'Configuración',   icon: Settings },
  ],
  ADMIN: [
    { href: '/dashboard/admin',   label: 'Dashboard',       icon: LayoutDashboard },
    { href: '/empresas',          label: 'Empresas',        icon: Building2 },
    { href: '/agentes',           label: 'Agentes',         icon: UserCheck },
    { href: '/transportistas',    label: 'Transportistas',  icon: Truck },
    { href: '/import',            label: 'Importaciones',   icon: ArrowDownToLine },
    { href: '/export',            label: 'Exportaciones',   icon: ArrowUpFromLine },
    { href: '/documents',         label: 'Documentos',      icon: FileText },
    { href: '/usuarios',          label: 'Usuarios',        icon: Users },
    { href: '/settings',          label: 'Configuración',   icon: Settings },
  ],
  EMPRESA: [
    { href: '/dashboard/empresa', label: 'Dashboard',          icon: LayoutDashboard },
    { href: '/import/new',        label: 'Nueva Importación',  icon: PackagePlus },
    { href: '/import',            label: 'Mis Expedientes',    icon: ClipboardList },
    { href: '/documents',         label: 'Documentos',         icon: FileText },
    { href: '/payments/history',  label: 'Pagos',              icon: CreditCard },
    { href: '/settings',          label: 'Mi Cuenta',          icon: UserCircle },
  ],
  AGENTE: [
    { href: '/dashboard/agente',  label: 'Dashboard',              icon: LayoutDashboard },
    { href: '/import',            label: 'Expedientes Pendientes', icon: ClipboardList },
    { href: '/import?tab=transmitir', label: 'Transmitir DUCA',   icon: Send },
    { href: '/import?tab=historial',  label: 'Historial',         icon: History },
    { href: '/settings',          label: 'Mi Perfil',             icon: UserCircle },
  ],
  TRANSPORTISTA: [
    { href: '/dashboard/transporte', label: 'Dashboard',     icon: LayoutDashboard },
    { href: '/shipments',            label: 'Mis Envíos',    icon: Truck },
    { href: '/tracking',             label: 'Tracking',      icon: MapPin },
    { href: '/settings',             label: 'Mi Perfil',     icon: UserCircle },
  ],
};

function SidebarContent({ pathname, user, logout, onClose }: {
  pathname: string;
  user: ReturnType<typeof useAuth>['user'];
  logout: () => void;
  onClose?: () => void;
}) {
  const role = user?.role ?? 'EMPRESA';
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.EMPRESA;

  return (
    <>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <Logo dark size={28} />
          {onClose && (
            <button onClick={onClose} className="text-white/40 hover:text-white md:hidden">
              <X size={20} />
            </button>
          )}
        </div>
        <p style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.company?.name || user?.email}
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const basePath = href.split('?')[0];
          const active = pathname === basePath || (basePath !== '/dashboard/admin' && basePath !== '/dashboard/agente' && basePath !== '/dashboard/empresa' && basePath !== '/dashboard/transporte' && basePath !== '/dashboard' && pathname.startsWith(basePath + '/'));
          return (
            <Link key={href} href={href} onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-body)',
              fontWeight: active ? 600 : 400,
              color: active ? '#fff' : 'rgba(255,255,255,0.60)',
              background: active ? 'var(--brand-primary)' : 'transparent',
              textDecoration: 'none', transition: 'var(--transition-fast)',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — nombre + rol en español */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-body)', marginBottom: 2 }}>
          {user?.firstName} {user?.lastName}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)', marginBottom: 12 }}>
          {ROL_LABELS[role] ?? role}
        </p>
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
          color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', transition: 'var(--transition-fast)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--neutral-50)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex" style={{
        width: 240, background: 'var(--sidebar-bg)', color: '#fff',
        flexDirection: 'column', flexShrink: 0,
      }}>
        <SidebarContent pathname={pathname} user={user} logout={logout} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.5)' }} />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 240, background: 'var(--sidebar-bg)', color: '#fff' }}>
        <SidebarContent pathname={pathname} user={user} logout={logout} onClose={() => setMobileOpen(false)} />
      </aside>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white md:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-gray-600 hover:text-gray-900">
            <Menu size={20} />
          </button>
          <Logo size={22} />
        </div>

        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
