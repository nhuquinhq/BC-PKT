import './globals.css';
import Sidebar from '@/components/Sidebar';
import AuthGate from '@/components/AuthGate';
import PwaRegister from '@/components/PwaRegister';

export const metadata = {
  title: 'Trung tâm Báo cáo PKT — HQ Group',
  description: 'Trung tâm 8 báo cáo quản trị tài chính PKT1–PKT8 của HQ Group',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'BC PKT',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#071834',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&family=Chakra+Petch:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PwaRegister />
        <AuthGate>
          <div className="shell">
            <Sidebar />
            <div className="main">{children}</div>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
