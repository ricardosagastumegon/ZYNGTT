'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getMeRequest } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { Logo } from '@/components/Logo';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, FileText,
  MapPin, CreditCard, Settings, LogOut, Menu, X,
  Users, UserCheck, Truck, ClipboardList,
  Send, History, UserCircle, PackagePlus,
  GitMerge, Plug, Activity, Building2,
} from 'lucide-react';

const ROL_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Administrador', ADMIN: 'Administrador',
  EMPRESA: 'Empresa', AGENTE: 'Agente Aduanal', TRANSPORTISTA: 'Transportista',
};

// NavItem can be a section separator or a regular link
type NavItem =
  | { section: string }
  | { href: string; label: string; icon: React.ElementType };

const isSection = (item: NavItem): item is { section: string } => 'section' in item;

const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard/admin',        label: 'Dashboard',       icon: LayoutDashboard },
  { section: 'Operaciones' },
  { href: '/import',                 label: 'Importaciones',   icon: ArrowDownToLine },
  { href: '/export',                 label: 'Exportaciones',   icon: ArrowUpFromLine },
  { href: '/documents',              label: 'Documentos',      icon: FileText },
  { section: 'Administración' },
  { href: '/admin/usuarios',         label: 'Usuarios',        icon: Users },
  { href: '/admin/empresas',         label: 'Empresas',        icon: Building2 },
  { href: '/admin/assignments',      label: 'Asignaciones',    icon: GitMerge },
  { section: 'Sistema' },
  { href: '/admin/integraciones',    label: 'Integraciones',   icon: Plug },
  { href: '/admin/logs',             label: 'Logs de actividad', icon: Activity },
  { href: '/settings',               label: 'Configuración',   icon: Settings },
];

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  SUPERADMIN: ADMIN_NAV,
  ADMIN:      ADMIN_NAV,
  EMPRESA: [
    { href: '/dashboard/empresa', label: 'Dashboard',          icon: LayoutDashboard },
    { href: '/import/new',        label: 'Nueva Importación',  icon: PackagePlus },
    { href: '/import',            label: 'Mis Expedientes',    icon: ClipboardList },
    { href: '/documents',         label: 'Documentos',         icon: FileText },
    { href: '/payments/history',  label: 'Pagos',              icon: CreditCard },
    { href: '/settings',          label: 'Mi Cuenta',          icon: UserCircle },
  ],
  AGENTE: [
    { href: '/dashboard/agente',      label: 'Dashboard',              icon: LayoutDashboard },
    { href: '/import',                label: 'Expedientes Pendientes', icon: ClipboardList },
    { href: '/import?tab=transmitir', label: 'Transmitir DUCA',        icon: Send },
    { href: '/import?tab=historial',  label: 'Historial',              icon: History },
    { href: '/settings',              label: 'Mi Perfil',              icon: UserCircle },
  ],
  TRANSPORTISTA: [
    { href: '/dashboard/transporte', label: 'Dashboard',  icon: LayoutDashboard },
    { href: '/shipments',            label: 'Mis Envíos', icon: Truck },
    { href: '/tracking',             label: 'Tracking',   icon: MapPin },
    { href: '/settings',             label: 'Mi Perfil',  icon: UserCircle },
  ],
};

function SidebarContent({ pathname, user, logout, onClose }: {
  pathname: string;
  user: ReturnType<typeof useAuth>['user'];
  logout: () => void;
  onClose?: () => void;
}) {
  const role     = user?.role ?? 'EMPRESA';
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
        {navItems.map((item, i) => {
          if (isSection(item)) {
            return (
              <p key={`section-${i}`} style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase',
                padding: '12px 12px 4px', fontFamily: 'var(--font-body)',
              }}>
                {item.section}
              </p>
            );
          }

          const basePath = item.href.split('?')[0];
          const isDashboard = ['/dashboard/admin', '/dashboard/agente', '/dashboard/empresa', '/dashboard/transporte', '/dashboard'].includes(basePath);
          const active = pathname === basePath || (!isDashboard && pathname.startsWith(basePath + '/'));

          return (
            <Link key={item.href} href={item.href} onClick={onClose} style={{
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
              <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
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
  const router = useRouter();
  const { user, logout } = useAuth();
  const setUser = useAuthStore(s => s.setUser);
  const token = useAuthStore(s => s.token);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (user) { setHydrated(true); return; }
    getMeRequest()
      .then(u => { setUser(u); setHydrated(true); })
      .catch(() => { router.replace('/login'); });
  }, [token, user, setUser, router]);

  if (!hydrated) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--neutral-50)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--brand-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

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
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 240, background: 'var(--sidebar-bg)', color: '#fff' }}
      >
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
