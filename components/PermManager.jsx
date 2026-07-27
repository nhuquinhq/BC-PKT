'use client';

/* Khối "Quản lý đăng nhập & phân quyền" — giao diện giống hệt Trung tâm PVH:
   panel sáng, bảng header xanh, avatar tròn màu, select navy, dropdown tick
   từng báo cáo (Chọn tất cả / Bỏ chọn / Mặc định vai trò), nút Lưu / Thu hồi. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthGate';
import { PAGES, ROLE_LABEL, ROLE_DEFAULT_PAGES } from '@/lib/authConfig';

const initials = (email) => (email || '?').slice(0, 2).toUpperCase();
const AVATAR_COLORS = ['#7c3aed', '#dc2626', '#b45309', '#2563eb', '#0d9488', '#db2777', '#4f46e5'];
const avatarColor = (email) => {
  let h = 0;
  for (const c of String(email)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const pagesText = (pages) => {
  if (pages === 'all') return 'ALL — tất cả báo cáo';
  if (pages == null) return 'Mặc định theo vai trò';
  if (!pages.length) return '— chưa chọn báo cáo —';
  return pages.join(', ');
};

export default function PermManager({ preview = null }) {
  const { enabled, user, idToken, meta } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const call = useCallback(async (payload) => {
    if (preview) return {};
    const r = await fetch('/api/perm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, id_token: idToken }),
    });
    return r.json();
  }, [idToken, preview]);

  const load = useCallback(async () => {
    if (preview) return;
    const j = await call({ action: 'list' });
    if (j.error) setErr(j.error);
    else { setErr(''); setData(j); }
  }, [call, preview]);

  useEffect(() => {
    if (!preview && enabled && user?.role === 'admin') load();
  }, [enabled, user, load, preview]);

  if (preview) return <PermPanel data={preview} err="" call={call} load={() => {}} meta={{ superAdmin: preview.superAdmin }} />;

  if (meta && !meta.configured) {
    return (
      <section className="panel">
        <div className="panel-head"><h2>Quản lý đăng nhập &amp; phân quyền</h2><span className="hint">Admin cứng: {meta.superAdmin}</span></div>
        <div className="panel-body">
          <div className="notice-amber" style={{ margin: 0 }}>
            <b>Chưa nối kho phân quyền (Upstash KV).</b> Vercel → project bc-pkt → Storage → Connect database Upstash
            (biến <span className="mono">KV_REST_API_URL · KV_REST_API_TOKEN</span>) rồi Redeploy — đăng nhập &amp; phân quyền sẽ tự bật.
          </div>
        </div>
      </section>
    );
  }
  if (!enabled || user?.role !== 'admin') return null;

  return <PermPanel data={data} err={err} call={call} load={load} meta={meta} />;
}

function PermPanel({ data, err, call, load, meta }) {
  const superAdmin = data?.superAdmin || meta?.superAdmin;
  const pending = data?.pending || [];
  const users = Object.entries(data?.users || {});

  return (
    <section className="pm-light">
      <div className="pm-title">
        <span className="bullet blue" /> Quản lý đăng nhập &amp; phân quyền
        <span className="right">Admin cứng: <b>{superAdmin}</b></span>
      </div>

      {err ? <div className="pm-err">Lỗi: {err}</div> : null}

      {pending.length ? (
        <>
          <div className="pm-title sub">
            <span className="bullet orange" /> Chờ cấp quyền
            <span className="right">{pending.length} email đăng nhập lần đầu</span>
          </div>
          {pending.map((email) => <PendingRow key={email} email={email} call={call} onDone={load} />)}
        </>
      ) : null}

      <div className="pm-title sub">
        <span className="bullet green" /> Tài khoản đã cấp quyền
        <span className="right">{users.length + 1} tài khoản</span>
      </div>

      <table className="pm-table">
        <thead>
          <tr>
            <th>Tài khoản</th>
            <th>Vai trò</th>
            <th>Báo cáo được xem</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div className="pm-acc">
                <span className="pm-avatar" style={{ background: avatarColor(superAdmin) }}>{initials(superAdmin)}</span>
                <span><b>{superAdmin}</b><small>admin cứng — không thể thu hồi</small></span>
              </div>
            </td>
            <td><span className="pm-badge">Admin</span></td>
            <td><span className="pm-muted">Tất cả báo cáo + Cấu hình</span></td>
            <td />
          </tr>
          {users.map(([email, u]) => (
            <UserRow key={email} email={email} initial={u} call={call} onDone={load} />
          ))}
        </tbody>
      </table>

      <div className="pm-usage">
        <b>Cách dùng:</b> chọn vai trò, mở ô “Báo cáo được xem” để <b>tick</b> đúng báo cáo cho người đó
        (hoặc <b>ALL</b> = xem hết · để nguyên “Mặc định theo vai trò”), rồi bấm <b>Lưu / Cấp quyền</b>.
        Mặc định vai trò: <b>Admin</b> tất cả + Cấu hình · <b>Leader</b> TQ, PKT1 → PKT7 · <b>Nhân viên</b> {(ROLE_DEFAULT_PAGES.nhanvien || []).join(', ')}.
      </div>
    </section>
  );
}

function RoleSelect({ value, onChange }) {
  return (
    <select className="pm-role" value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

/* Dropdown tick báo cáo — giống ô multiselect của PVH */
function PagesDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const arr = Array.isArray(value) ? value : [];
  const toggle = (code) => {
    const base = Array.isArray(value) ? [...value] : value === 'all' ? PAGES.map((p) => p.code) : [];
    onChange(base.includes(code) ? base.filter((c) => c !== code) : [...base, code]);
  };

  return (
    <div className="pm-pages" ref={wrapRef}>
      <button type="button" className="pm-pages-btn" onClick={() => setOpen(!open)}>
        <span>{pagesText(value)}</span><i>▾</i>
      </button>
      {open ? (
        <div className="pm-pop">
          <div className="pm-pop-actions">
            <button type="button" onClick={() => onChange('all')}>Chọn tất cả</button>
            <button type="button" onClick={() => onChange([])}>Bỏ chọn</button>
            <button type="button" onClick={() => onChange(null)}>Mặc định vai trò</button>
          </div>
          <label className="pm-check">
            <input type="checkbox" checked={value === 'all'} onChange={() => onChange(value === 'all' ? [] : 'all')} />
            <b>ALL</b><span>Tất cả báo cáo</span>
          </label>
          {PAGES.map((p) => (
            <label key={p.code} className="pm-check">
              <input
                type="checkbox"
                checked={value === 'all' || arr.includes(p.code)}
                onChange={() => toggle(p.code)}
              />
              <b>{p.code}</b><span>{p.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PendingRow({ email, call, onDone }) {
  const [role, setRole] = useState('nhanvien');
  const [pages, setPages] = useState(null);
  const [busy, setBusy] = useState(false);
  const act = async (action, extra = {}) => {
    setBusy(true);
    await call({ action, email, ...extra });
    setBusy(false);
    onDone();
  };
  return (
    <div className="pm-pending">
      <span className="pm-dot" />
      <div className="pm-acc">
        <span className="pm-avatar" style={{ background: avatarColor(email) }}>{initials(email)}</span>
        <span><b>{email}</b><small>đang chờ duyệt</small></span>
      </div>
      <RoleSelect value={role} onChange={setRole} />
      <PagesDropdown value={pages} onChange={setPages} />
      <button className="pm-save" disabled={busy} onClick={() => act('assign', { role, pages })}>✓ Cấp quyền</button>
      <button className="pm-ghost" disabled={busy} onClick={() => act('dismiss')}>Bỏ qua</button>
    </div>
  );
}

function UserRow({ email, initial, call, onDone }) {
  const [role, setRole] = useState(initial.role || 'nhanvien');
  const [pages, setPages] = useState(initial.pages ?? null);
  const [busy, setBusy] = useState(false);
  const act = async (action, extra = {}) => {
    setBusy(true);
    await call({ action, email, ...extra });
    setBusy(false);
    onDone();
  };
  return (
    <tr>
      <td>
        <div className="pm-acc">
          <span className="pm-avatar" style={{ background: avatarColor(email) }}>{initials(email)}</span>
          <span><b>{email}</b><small>{ROLE_LABEL[role]}</small></span>
        </div>
      </td>
      <td><RoleSelect value={role} onChange={setRole} /></td>
      <td><PagesDropdown value={pages} onChange={setPages} /></td>
      <td className="pm-actions">
        <button className="pm-save" disabled={busy} onClick={() => act('assign', { role, pages })}>Lưu</button>
        <button className="pm-ghost" disabled={busy} onClick={() => act('remove')}>Thu hồi</button>
      </td>
    </tr>
  );
}
