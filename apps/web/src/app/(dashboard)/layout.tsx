'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine,
  FileText, MapPin, CreditCard, Settings, LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/import',        label: 'Importaciones',  icon: ArrowDownToLine },
  { href: '/export',        label: 'Exportaciones',  icon: ArrowUpFromLine },
  { href: '/documents',     label: 'Documentos',     icon: FileText },
  { href: '/tracking',      label: 'Tracking',       icon: MapPin },
  { href: '/payments',      label: 'Pagos',          icon: CreditCard },
  { href: '/settings',      label: 'Configuración',  icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--neutral-50)' }}>
      <aside style={{
        width: 240,
        background: 'var(--sidebar-bg)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Logo dark size={28} />
          <p style={{
            marginTop: 6,
            fontSize: 11,
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'var(--font-body)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {user?.company?.name || user?.email}
          </p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'rgba(255,255,255,0.60)',
                background: active ? 'var(--brand-primary)' : 'transparent',
                textDecoration: 'none',
                transition: 'var(--transition-fast)',
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

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)', marginBottom: 10 }}>
            {user?.firstName} {user?.lastName}
          </p>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: 'rgba(255,255,255,0.45)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-body)',
              transition: 'var(--transition-fast)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: 32 }}>{children}</div>
      </main>
    </div>
  );
}
