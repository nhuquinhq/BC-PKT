/* ============================================================
   Đăng nhập Google + phân quyền theo domain.
   - Admin cứng: ADMIN_EMAILS (mặc định quynhhtn@hqplay.vn) — luôn
     được vào, role = admin, không phụ thuộc domain.
   - Nhân sự: email thuộc ALLOWED_EMAIL_DOMAINS (mặc định hqplay.vn).
   - Chưa đặt đủ biến môi trường → auth TẮT, web mở như cũ (an toàn
     khi chưa kịp cấu hình OAuth trên Vercel).
   Biến môi trường trên Vercel:
     GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET · NEXTAUTH_SECRET ·
     NEXTAUTH_URL (https://bc-pkt.vercel.app)
     Tuỳ chọn: ADMIN_EMAILS · ALLOWED_EMAIL_DOMAINS (phân cách dấu phẩy)
   ============================================================ */

import GoogleProvider from 'next-auth/providers/google';

const list = (v, fallback) =>
  String(v || fallback)
    .toLowerCase()
    .split(',')
    .map((s) => s.trim().replace(/^@/, ''))
    .filter(Boolean);

export const ADMIN_EMAILS = list(process.env.ADMIN_EMAILS, 'quynhhtn@hqplay.vn');
export const ALLOWED_DOMAINS = list(process.env.ALLOWED_EMAIL_DOMAINS, 'hqplay.vn');

export const authConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.NEXTAUTH_SECRET);

export const isAdmin = (email) => ADMIN_EMAILS.includes(String(email || '').toLowerCase());

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'chua-cau-hinh',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'chua-cau-hinh',
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    signIn({ profile }) {
      const email = String(profile?.email || '').toLowerCase();
      if (!email) return false;
      if (ADMIN_EMAILS.includes(email)) return true;
      return ALLOWED_DOMAINS.some((d) => email.endsWith(`@${d}`));
    },
    jwt({ token }) {
      token.role = isAdmin(token.email) ? 'admin' : 'member';
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role;
      return session;
    },
  },
  pages: { signIn: '/dang-nhap', error: '/dang-nhap' },
};
