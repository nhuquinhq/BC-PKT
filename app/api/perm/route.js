/* ============================================================
   API quản lý tài khoản & phân quyền — cơ chế giống PVH (api/perm.js):
   - ACL lưu Upstash KV (key 'pkt:acl'), verify id_token Google phía
     server qua endpoint tokeninfo (không cần thư viện).
   - Actions:
       status  : trạng thái cấu hình (public, không cần token)
       me      : sau đăng nhập — ok / pending (tự ghi vào danh sách chờ)
       list / assign / remove / dismiss : chỉ admin
   ============================================================ */

import { GOOGLE_CLIENT_ID, SUPER_ADMIN, ROLE_DEFAULT_PAGES, resolvePages, grantablePages } from '@/lib/authConfig';

export const dynamic = 'force-dynamic';

const KV_URL = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const ACL_KEY = 'pkt:acl';

async function kv(cmd) {
  const r = await fetch(KV_URL(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  const j = await r.json();
  return j.result;
}

async function getAcl() {
  try {
    const raw = await kv(['GET', ACL_KEY]);
    if (!raw) return { users: {}, pending: [] };
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { users: o.users || {}, pending: o.pending || [] };
  } catch {
    return { users: {}, pending: [] };
  }
}
const setAcl = (acl) => kv(['SET', ACL_KEY, JSON.stringify(acl)]);

/* Verify id_token Google — check đúng client + email đã xác minh */
async function verify(idToken) {
  if (!idToken) return null;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const p = await r.json();
    if (p.aud !== GOOGLE_CLIENT_ID) return null;
    if (p.email_verified !== 'true' && p.email_verified !== true) return null;
    return String(p.email || '').toLowerCase();
  } catch {
    return null;
  }
}

const meOf = (acl, email) => {
  if (email === SUPER_ADMIN) return { role: 'admin', pages: 'all' };
  return acl.users[email] || null;
};

const json = (obj) => Response.json(obj, { headers: { 'Cache-Control': 'no-store' } });

async function handle(req) {
  const url = new URL(req.url);
  let body = {};
  if (req.method === 'POST') {
    try { body = await req.json(); } catch { body = {}; }
  }
  const action = url.searchParams.get('action') || body.action || 'me';
  const configured = Boolean(KV_URL() && KV_TOKEN());

  if (action === 'status') {
    return json({ configured, superAdmin: SUPER_ADMIN, clientId: GOOGLE_CLIENT_ID });
  }
  if (!configured) return json({ error: 'kv_not_configured' });

  const idToken = body.id_token || url.searchParams.get('id_token') || '';
  const email = await verify(idToken);
  if (!email) return json({ error: 'unauthorized' });

  const acl = await getAcl();
  const me = meOf(acl, email);

  if (action === 'me') {
    if (me) return json({ email, status: 'ok', role: me.role, pages: resolvePages(me.role, me.pages) });
    if (!acl.pending.includes(email)) {
      acl.pending.push(email);
      await setAcl(acl);
    }
    return json({ email, status: 'pending', admin: SUPER_ADMIN });
  }

  /* Các action quản trị — admin toàn quyền; LEADER chỉ cấp lại các trang
     SÀN trong quyền xem của mình cho nhân viên (phân quyền 2 cấp). */
  if (!me || (me.role !== 'admin' && me.role !== 'leader')) return json({ error: 'forbidden' });
  const isAdmin = me.role === 'admin';
  const grantable = grantablePages(me.role, resolvePages(me.role, me.pages));
  /* Leader chỉ đụng được nhân viên do mình cấp, hoặc nhân viên mà toàn bộ
     trang được cấp đều nằm trong phạm vi sàn của leader. */
  const canManage = (u) =>
    isAdmin ||
    (u &&
      u.role === 'nhanvien' &&
      (u.by === email || (Array.isArray(u.pages) && u.pages.length > 0 && u.pages.every((p) => grantable.includes(p)))));

  if (action === 'list') {
    if (isAdmin) {
      return json({ users: acl.users, pending: acl.pending, superAdmin: SUPER_ADMIN, roleDefaults: ROLE_DEFAULT_PAGES });
    }
    const users = Object.fromEntries(Object.entries(acl.users).filter(([, u]) => canManage(u)));
    return json({ users, pending: acl.pending, superAdmin: SUPER_ADMIN, roleDefaults: ROLE_DEFAULT_PAGES, grantable, leaderMode: true });
  }
  if (action === 'assign') {
    const t = String(body.email || '').toLowerCase();
    if (!t || !t.includes('@')) return json({ error: 'bad_email' });
    if (t === SUPER_ADMIN) return json({ error: 'is_super_admin' });
    if (isAdmin) {
      const role = ['admin', 'leader', 'nhanvien'].includes(body.role) ? body.role : 'nhanvien';
      let pages = body.pages; // 'all' | mảng mã trang | null = mặc định theo vai trò
      if (pages !== 'all' && !Array.isArray(pages)) pages = null;
      acl.users[t] = { role, pages, by: acl.users[t]?.by };
    } else {
      const existing = acl.users[t];
      if (existing && !canManage(existing)) return json({ error: 'forbidden_target' });
      const pages = Array.isArray(body.pages) ? body.pages.filter((p) => grantable.includes(p)) : [];
      if (!pages.length) return json({ error: 'pages_required' });
      acl.users[t] = { role: 'nhanvien', pages, by: email };
    }
    acl.pending = acl.pending.filter((x) => x !== t);
    await setAcl(acl);
    return json({ ok: true });
  }
  if (action === 'remove') {
    const t = String(body.email || '').toLowerCase();
    if (!isAdmin && !canManage(acl.users[t])) return json({ error: 'forbidden_target' });
    delete acl.users[t];
    acl.pending = acl.pending.filter((x) => x !== t);
    await setAcl(acl);
    return json({ ok: true });
  }
  if (action === 'dismiss') {
    const t = String(body.email || '').toLowerCase();
    acl.pending = acl.pending.filter((x) => x !== t);
    await setAcl(acl);
    return json({ ok: true });
  }
  return json({ error: 'unknown_action' });
}

export async function GET(req) { return handle(req); }
export async function POST(req) { return handle(req); }
