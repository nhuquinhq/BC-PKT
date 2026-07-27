import './globals.css';
import Sidebar from '@/components/Sidebar';
import AuthGate from '@/components/AuthGate';

export const metadata = {
  title: 'Trung tâm Báo cáo PKT — HQ Group',
  description: 'Trung tâm 7 báo cáo quản trị tài chính PKT1–PKT7 của HQ Group, đọc realtime từ Google Sheet',
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
