/* ============================================================
   Cấu hình đăng nhập & phân quyền (cơ chế giống Trung tâm PVH):
   - Đăng nhập Google (Google Identity Services) ngay trên trình duyệt.
   - Đăng nhập lần đầu → vào danh sách CHỜ, admin cấp quyền mới xem được.
   - ACL lưu Upstash KV (biến KV_REST_API_URL / KV_REST_API_TOKEN,
     tự có khi Connect store Upstash vào project trên Vercel).
   - Admin cứng: SUPER_ADMIN — luôn toàn quyền, không thể thu hồi.
   ============================================================ */

import { REPORTS } from '@/lib/reports';

/* Dùng chung OAuth Client với Trung tâm PVH — chỉ cần thêm
   https://bc-pkt.vercel.app vào Authorized JavaScript origins. */
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '195227450871-agk96k2h1897lnvgjk7uorfoe2q9dqqi.apps.googleusercontent.com';

export const SUPER_ADMIN = 'quynhhtn@hqplay.vn';

export const ROLE_LABEL = {
  admin: 'Admin (toàn quyền)',
  leader: 'Leader (BU/Team)',
  nhanvien: 'Nhân viên',
};

/* Danh mục trang có thể cấp quyền xem */
export const PAGES = [
  { code: 'TQ', label: 'Tổng quan' },
  ...REPORTS.map((r) => ({ code: r.code, label: r.nav || r.name })),
];

/* Mặc định theo vai trò khi admin không tick trang cụ thể.
   Admin: tất cả + trang Cấu hình · Leader: tất cả báo cáo · Nhân viên: PKT1. */
export const ROLE_DEFAULT_PAGES = {
  admin: 'all',
  leader: 'all',
  nhanvien: ['PKT1'],
};

export const resolvePages = (role, pages) =>
  pages === 'all' || Array.isArray(pages) ? pages : ROLE_DEFAULT_PAGES[role] || [];

export const canViewPage = (me, code) => {
  if (!me) return false;
  if (me.role === 'admin' || me.pages === 'all') return true;
  return Array.isArray(me.pages) && me.pages.includes(code);
};

/* ------------------------------------------------------------------
   Phân quyền 2 cấp: admin cấp cho LEADER xem theo BU (trang team +
   các trang SÀN của BU đó); leader cấp lại đúng các trang SÀN mình
   được xem cho NHÂN VIÊN. Trang sàn nhận diện qua tiền tố mã. */
export const SAN_PAGE_PREFIX = 'SÀN ';

/* Danh sách mã trang mà một tài khoản được phép cấp cho người khác
   (pages đã resolve qua resolvePages). Admin: mọi trang · Leader:
   chỉ các trang SÀN trong quyền xem của mình · còn lại: không. */
export const grantablePages = (role, pages) => {
  if (role === 'admin') return PAGES.map((p) => p.code);
  if (role !== 'leader') return [];
  const own = pages === 'all' ? PAGES.map((p) => p.code) : Array.isArray(pages) ? pages : [];
  return own.filter((c) => c.startsWith(SAN_PAGE_PREFIX));
};
