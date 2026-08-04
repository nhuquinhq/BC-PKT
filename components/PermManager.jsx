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
    if (!preview && enabled && (user?.role === 'admin' || user?.role === 'leader')) load();
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
  if (!enabled || (user?.role !== 'admin' && user?.role !== 'leader')) return null;

  return <PermPanel data={data} err={err} call={call} load={load} meta={meta} />;
}

function PermPanel({ data, err, call, load, meta }) {
  const superAdmin = data?.superAdmin || meta?.superAdmin;
  const pending = data?.pending || [];
  const users = Object.entries(data?.users || {});
  /* Chế độ LEADER: chỉ cấp lại các trang SÀN mình được xem cho nhân viên */
  const leaderMode = Boolean(data?.leaderMode);
  const options = leaderMode ? PAGES.filter((p) => (data?.grantable || []).includes(p.code)) : PAGES;

  return (
    <section className="pm-light">
      <div className="pm-title">
        <span className="bullet blue" /> {leaderMode ? 'Cấp quyền xem SÀN cho nhân viên' : 'Quản lý đăng nhập & phân quyền'}
        <span className="right">{leaderMode ? <>Sàn được cấp lại: <b>{options.length ? options.map((p) => p.code.replace('SÀN ', '')).join(', ') : '— admin chưa cấp sàn nào cho bạn —'}</b></> : <>Admin cứng: <b>{superAdmin}</b></>}</span>
      </div>

      {err ? <div className="pm-err">Lỗi: {err}</div> : null}

      {pending.length ? (
        <>
          <div className="pm-title sub">
            <span className="bullet orange" /> Chờ cấp quyền
            <span className="right">{pending.length} email đăng nhập lần đầu</span>
          </div>
          {pending.map((email) => <PendingRow key={email} email={email} call={call} onDone={load} leaderMode={leaderMode} options={options} />)}
        </>
      ) : null}

      <div className="pm-title sub">
        <span className="bullet blue" /> Cấp quyền cho email mới
        <span className="right">nhập email → tick {leaderMode ? 'sàn' : 'báo cáo'} → bấm Cấp quyền (không cần chờ họ đăng nhập trước)</span>
      </div>
      <AddRow call={call} onDone={load} leaderMode={leaderMode} options={options} />

      <div className="pm-title sub">
        <span className="bullet green" /> Tài khoản đã cấp quyền
        <span className="right">{leaderMode ? users.length : users.length + 1} tài khoản</span>
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
          {!leaderMode ? (
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
          ) : null}
          {users.map(([email, u]) => (
            <UserRow key={email} email={email} initial={u} call={call} onDone={load} leaderMode={leaderMode} options={options} />
          ))}
        </tbody>
      </table>

      {leaderMode ? (
        <div className="pm-usage">
          <b>Cách dùng:</b> nhân viên đăng nhập Google lần đầu sẽ hiện ở mục <b>Chờ cấp quyền</b> — mở ô danh sách sàn,
          <b> tick</b> đúng các sàn bạn giao cho người đó rồi bấm <b>Cấp quyền</b>. Bạn chỉ cấp được các trang SÀN
          mà admin đã cấp cho bạn; muốn thêm sàn khác, liên hệ Admin ({superAdmin}).
        </div>
      ) : (
        <div className="pm-usage">
          <b>Cách dùng:</b> chọn vai trò, mở ô “Báo cáo được xem” để <b>tick</b> đúng báo cáo cho người đó
          (hoặc <b>ALL</b> = xem hết · để nguyên “Mặc định theo vai trò”), rồi bấm <b>Lưu / Cấp quyền</b>.
          Mặc định vai trò: <b>Admin</b> tất cả + Cấu hình · <b>Leader</b> TQ, PKT1 → PKT8 · <b>Nhân viên</b> {(ROLE_DEFAULT_PAGES.nhanvien || []).join(', ')}.
          <br />
          <b>Phân quyền 2 cấp theo BU/SÀN:</b> cấp cho leader vai trò <b>Leader</b> và tick trang team của BU + các trang
          <b> SÀN</b> thuộc BU đó — leader sẽ tự cấp lại từng sàn cho nhân viên của mình trong trang này.
        </div>
      )}
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

/* Dropdown tick báo cáo — giống ô multiselect của PVH.
   simple=true (chế độ leader): chỉ tick từng trang trong `options`,
   không có ALL / mặc định vai trò. */
function PagesDropdown({ value, onChange, options = PAGES, simple = false }) {
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
    const base = Array.isArray(value) ? [...value] : value === 'all' ? options.map((p) => p.code) : [];
    onChange(base.includes(code) ? base.filter((c) => c !== code) : [...base, code]);
  };

  const label = simple && (value == null || (Array.isArray(value) && !value.length))
    ? '— chọn sàn cho nhân viên —'
    : pagesText(value);

  return (
    <div className="pm-pages" ref={wrapRef}>
      <button type="button" className="pm-pages-btn" onClick={() => setOpen(!open)}>
        <span>{label}</span><i>▾</i>
      </button>
      {open ? (
        <div className="pm-pop">
          <div className="pm-pop-actions">
            {!simple ? <button type="button" onClick={() => onChange('all')}>Chọn tất cả</button> : null}
            <button type="button" onClick={() => onChange([])}>Bỏ chọn</button>
            {!simple ? <button type="button" onClick={() => onChange(null)}>Mặc định vai trò</button> : null}
          </div>
          {!simple ? (
            <label className="pm-check">
              <input type="checkbox" checked={value === 'all'} onChange={() => onChange(value === 'all' ? [] : 'all')} />
              <b>ALL</b><span>Tất cả báo cáo</span>
            </label>
          ) : null}
          {options.map((p) => (
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

/* Chủ động cấp quyền theo email — không cần chờ người đó đăng nhập lần đầu */
function AddRow({ call, onDone, leaderMode = false, options = PAGES }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('nhanvien');
  const [pages, setPages] = useState(leaderMode ? [] : null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const t = email.trim().toLowerCase();
    if (!t.includes('@')) { alert('Nhập email hợp lệ trước đã.'); return; }
    setBusy(true);
    const j = await call({ action: 'assign', email: t, role, pages });
    setBusy(false);
    if (j?.error === 'pages_required') { alert('Chọn ít nhất 1 sàn cho nhân viên trước khi cấp quyền.'); return; }
    if (j?.error) { alert(`Lỗi: ${j.error}`); return; }
    setEmail('');
    setPages(leaderMode ? [] : null);
    onDone();
  };
  return (
    <div className="pm-pending pm-add">
      <span className="pm-dot" />
      <input
        className="pm-mail"
        placeholder="email@hqplay.vn"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
      />
      {leaderMode ? <span className="pm-badge">Nhân viên</span> : <RoleSelect value={role} onChange={setRole} />}
      <PagesDropdown value={pages} onChange={setPages} options={options} simple={leaderMode} />
      <button className="pm-save" disabled={busy} onClick={save}>+ Cấp quyền</button>
    </div>
  );
}

function PendingRow({ email, call, onDone, leaderMode = false, options = PAGES }) {
  const [role, setRole] = useState('nhanvien');
  const [pages, setPages] = useState(leaderMode ? [] : null);
  const [busy, setBusy] = useState(false);
  const act = async (action, extra = {}) => {
    setBusy(true);
    const j = await call({ action, email, ...extra });
    setBusy(false);
    if (j?.error === 'pages_required') alert('Chọn ít nhất 1 sàn cho nhân viên trước khi cấp quyền.');
    onDone();
  };
  return (
    <div className="pm-pending">
      <span className="pm-dot" />
      <div className="pm-acc">
        <span className="pm-avatar" style={{ background: avatarColor(email) }}>{initials(email)}</span>
        <span><b>{email}</b><small>đang chờ duyệt</small></span>
      </div>
      {leaderMode ? <span className="pm-badge">Nhân viên</span> : <RoleSelect value={role} onChange={setRole} />}
      <PagesDropdown value={pages} onChange={setPages} options={options} simple={leaderMode} />
      <button className="pm-save" disabled={busy} onClick={() => act('assign', { role, pages })}>✓ Cấp quyền</button>
      <button className="pm-ghost" disabled={busy} onClick={() => act('dismiss')}>Bỏ qua</button>
    </div>
  );
}

function UserRow({ email, initial, call, onDone, leaderMode = false, options = PAGES }) {
  const [role, setRole] = useState(initial.role || 'nhanvien');
  const [pages, setPages] = useState(initial.pages ?? (leaderMode ? [] : null));
  const [busy, setBusy] = useState(false);
  const act = async (action, extra = {}) => {
    setBusy(true);
    const j = await call({ action, email, ...extra });
    setBusy(false);
    if (j?.error === 'pages_required') alert('Chọn ít nhất 1 sàn cho nhân viên trước khi lưu.');
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
      <td>{leaderMode ? <span className="pm-badge">Nhân viên</span> : <RoleSelect value={role} onChange={setRole} />}</td>
      <td><PagesDropdown value={pages} onChange={setPages} options={options} simple={leaderMode} /></td>
      <td className="pm-actions">
        <button className="pm-save" disabled={busy} onClick={() => act('assign', { role, pages })}>Lưu</button>
        <button className="pm-ghost" disabled={busy} onClick={() => act('remove')}>Thu hồi</button>
      </td>
    </tr>
  );
}
