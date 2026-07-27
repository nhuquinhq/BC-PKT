import { authConfigured, ADMIN_EMAILS, ALLOWED_DOMAINS } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/* Trạng thái cấu hình đăng nhập (không lộ secret) — cho Sidebar, trang
   đăng nhập và trang Nguồn & Cấu hình. */
export async function GET() {
  return Response.json({
    configured: authConfigured(),
    admins: ADMIN_EMAILS,
    domains: ALLOWED_DOMAINS,
  });
}
