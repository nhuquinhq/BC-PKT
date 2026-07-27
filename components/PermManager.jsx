'use client';

/* Khối "Quản lý đăng nhập & phân quyền" — giao diện giống Trung tâm PVH:
   danh sách chờ duyệt + bảng tài khoản đã cấp quyền (vai trò, tick từng
   báo cáo, Lưu / Thu hồi). Chỉ admin thấy được (trang SRC đã chặn sẵn). */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthGate';
import { PAGES, ROLE_LABEL, ROLE_DEFAULT_PAGES } from '@/lib/authConfig';

const initials = (email) => (email || '?').slice(0, 2).toUpperCase();

export default function PermManager() {
  const { enabled, user, idToken, meta } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const call = useCallback(async (payload) => {
    const r = await fetch('/api/perm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, id_token: idToken }),
    });
    return r.json();
  }, [idToken]);

  const load = useCallback(async () => {
    const j = await call({ action: 'list' });
    if (j.error) setErr(j.error);
    else { setErr(''); setData(j); }
  }, [call]);

  useEffect(() => {
    if (enabled && user?.role === 'admin') load();
  }, [enabled, user, load]);

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

  const pending = data?.pending || [];
  const users = Object.entries(data?.users || {});

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Quản lý đăng nhập &amp; phân quyền</h2>
        <span className="hint">Admin cứng: {data?.superAdmin || meta?.superAdmin}</span>
      </div>
      <div className="panel-body">
        {err ? <div className="notice-amber">Lỗi: {err}</div> : null}

        <div className="pm-sect"><span className="dot-warn">●</span> Chờ cấp quyền <span className="dim">— {pending.length} email đăng nhập lần đầu</span></div>
        {pending.length === 0 ? (
          <div className="dim" style={{ fontSize: 12, margin: '6px 0 14px' }}>Không có tài khoản nào đang chờ.</div>
        ) : (
          pending.map((email) => <PendingRow key={email} email={email} call={call} onDone={load} />)
        )}

        <div className="pm-sect" style={{ marginTop: 16 }}><span className="dot-ok">●</span> Tài khoản đã cấp quyền <span className="dim">— {users.length + 1} tài khoản</span></div>

        <div className="pm-row locked">
          <div className="pm-head">
            <span className="avatar">{initials(data?.superAdmin)}</span>
            <div className="pm-who">
              <b>{data?.superAdmin || meta?.superAdmin}</b>
              <div className="dim">admin cứng — không thể thu hồi</div>
            </div>
            <span className="src-badge ok">Admin</span>
            <span className="dim" style={{ fontSize: 11.5 }}>Tất cả báo cáo + Cấu hình</span>
          </div>
        </div>

        {users.map(([email, u]) => (
          <UserRow key={email} email={email} initial={u} call={call} onDone={load} />
        ))}

        <div className="pm-help">
          <b>Cách dùng:</b> chọn vai trò, tick báo cáo được xem (<b>ALL</b> = xem hết · <b>Mặc định vai trò</b> = theo vai trò), bấm <b>Lưu</b>.
          Mặc định vai trò: <b>Admin</b> tất cả + Cấu hình · <b>Leader</b> tất cả báo cáo · <b>Nhân viên</b> {(ROLE_DEFAULT_PAGES.nhanvien || []).join(', ')}.
        </div>
      </div>
    </section>
  );
}

function RoleSelect({ value, onChange }) {
  return (
    <select className="input pm-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

function PageChips({ pages, onChange }) {
  const isAll = pages === 'all';
  const isDefault = pages == null;
  const arr = Array.isArray(pages) ? pages : [];
  const toggle = (code) => {
    const base = Array.isArray(pages) ? [...pages] : [];
    onChange(base.includes(code) ? base.filter((c) => c !== code) : [...base, code]);
  };
  return (
    <div className="pm-chips">
      <button className={`qbtn${isDefault ? ' on' : ''}`} onClick={() => onChange(null)}>Mặc định vai trò</button>
      <button className={`qbtn${isAll ? ' on' : ''}`} onClick={() => onChange('all')}>ALL — tất cả</button>
      {PAGES.map((p) => (
        <button
          key={p.code}
          className={`qbtn${!isAll && !isDefault && arr.includes(p.code) ? ' on' : ''}`}
          title={p.label}
          onClick={() => toggle(p.code)}
        >
          {p.code}
        </button>
      ))}
    </div>
  );
}

function PendingRow({ email, call, onDone }) {
  const [role, setRole] = useState('nhanvien');
  const [busy, setBusy] = useState(false);
  const act = async (action, extra = {}) => {
    setBusy(true);
    await call({ action, email, ...extra });
    setBusy(false);
    onDone();
  };
  return (
    <div className="pm-row pending">
      <div className="pm-head">
        <span className="avatar warn">{initials(email)}</span>
        <div className="pm-who"><b>{email}</b><div className="dim">đang chờ duyệt</div></div>
        <RoleSelect value={role} onChange={setRole} />
        <button className="btn" disabled={busy} onClick={() => act('assign', { role, pages: null })}>✓ Cấp quyền</button>
        <button className="btn ghost" disabled={busy} onClick={() => act('dismiss')}>Bỏ qua</button>
      </div>
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
    <div className="pm-row">
      <div className="pm-head">
        <span className="avatar">{initials(email)}</span>
        <div className="pm-who"><b>{email}</b><div className="dim">{ROLE_LABEL[role]}</div></div>
        <RoleSelect value={role} onChange={setRole} />
        <button className="btn" disabled={busy} onClick={() => act('assign', { role, pages })}>Lưu</button>
        <button className="btn ghost" disabled={busy} onClick={() => act('remove')}>Thu hồi</button>
      </div>
      <PageChips pages={pages} onChange={setPages} />
    </div>
  );
}
