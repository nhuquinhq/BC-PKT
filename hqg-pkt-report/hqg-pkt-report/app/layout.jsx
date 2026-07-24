import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Báo cáo Phòng Kế Toán — HQ Group',
  description: 'Hệ thống 7 báo cáo quản trị tài chính PKT1–PKT7 của HQ Group',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="shell">
          <Sidebar />
          <div className="main">{children}</div>
        </div>
      </body>
    </html>
  );
}
