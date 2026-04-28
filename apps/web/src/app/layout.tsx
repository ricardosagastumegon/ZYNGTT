import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'AXON LOGISTIC — Logística Digital Centroamérica',
  description: 'Plataforma SaaS para gestión de importaciones y exportaciones MX→GT. Tracking en tiempo real, documentación automática y gestión aduanera digital.',
  keywords: 'logística, importación, exportación, aduanas, Guatemala, México, SIGIE, MAGA, DUCA',
  authors: [{ name: 'AXON LOGISTIC' }],
  themeColor: '#4F46E5',
  manifest: '/manifest.json',
  openGraph: {
    title: 'AXON LOGISTIC',
    description: 'Logística inteligente para Centroamérica',
    type: 'website',
    locale: 'es_GT',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
