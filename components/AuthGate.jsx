'use client';

/* ============================================================
   Cổng đăng nhập & phân quyền (cơ chế giống Trung tâm PVH):
   - Chưa nối KV → chạy MỞ như cũ (chế độ thiết lập).
   - Đã nối KV → bắt đăng nhập Google; lần đầu vào danh sách chờ,
     admin cấp quyền xong mới thấy nội dung.
   - useAuth() cho Sidebar / trang báo cáo / trang cấu hình:
     { enabled, user: {email, role, pages}, idToken, canView, signOut }
   ============================================================ */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, canViewPage } from '@/lib/authConfig';

const AuthCtx = createContext({ enabled: false, user: null, idToken: '', canView: () => true, signOut: () => {}, meta: null });
export const useAuth = () => useContext(AuthCtx);

const TOKEN_KEY = 'pkt_id_token';

export default function AuthGate({ children }) {
  const [phase, setPhase] = useState('checking'); // checking | open | login | pending | ok
  const [meta, setMeta] = useState(null);
  const [me, setMe] = useState(null);
  const [idToken, setIdToken] = useState('');
  const [gisFail, setGisFail] = useState(false);
  const btnRef = useRef(null);

  const askMe = useCallback(async (token) => {
    const r = await fetch('/api/perm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'me', id_token: token }),
    });
    const j = await r.json();
    if (j.status === 'ok') {
      setMe(j);
      setIdToken(token);
      setPhase('ok');
    } else if (j.status === 'pending') {
      setMe(j);
      setIdToken(token);
      setPhase('pending');
    } else {
      /* token hỏng / hết hạn (~1 giờ) → đăng nhập lại */
      localStorage.removeItem(TOKEN_KEY);
      setPhase('login');
    }
  }, []);

  /* Khởi động: hỏi trạng thái cấu hình → quyết định mở / bắt đăng nhập */
  useEffect(() => {
    (async () => {
      try {
        const st = await fetch('/api/perm?action=status').then((r) => r.json());
        setMeta(st);
        if (!st.configured) { setPhase('open'); return; }
        const saved = localStorage.getItem(TOKEN_KEY);
        if (saved) await askMe(saved);
        else setPhase('login');
      } catch {
        setPhase('open'); /* API lỗi → không khoá người dùng */
      }
    })();
  }, [askMe]);

  /* Nạp nút Google Sign-In khi ở màn đăng nhập */
  useEffect(() => {
    if (phase !== 'login') return;
    const render = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res) => {
            localStorage.setItem(TOKEN_KEY, res.credential);
            askMe(res.credential);
          },
        });
        if (btnRef.current) {
          window.google.accounts.id.renderButton(btnRef.current, { theme: 'filled_blue', size: 'large', width: 320, text: 'signin_with' });
        }
      } catch { setGisFail(true); }
    };
    if (window.google?.accounts?.id) { render(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = render;
    s.onerror = () => setGisFail(true);
    document.head.appendChild(s);
  }, [phase, askMe]);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    try { window.google?.accounts?.id?.disableAutoSelect(); } catch {}
    window.location.reload();
  }, []);

  const ctx = {
    enabled: phase === 'ok',
    user: phase === 'ok' ? { email: me.email, role: me.role, pages: me.pages } : null,
    idToken,
    meta,
    canView: (code) => (phase === 'ok' ? canViewPage(me, code) : true),
    signOut,
  };

  if (phase === 'checking') {
    return <div className="login-screen"><div className="login-card"><div className="sub">Đang kiểm tra phiên đăng nhập…</div></div></div>;
  }

  if (phase === 'login') {
    return (
      <div className="login-screen">
        <div className="login-card">
          <span className="logo"><img src="/logo-hq-group.png" alt="HQ Group" /></span>
          <h1>TRUNG TÂM BÁO CÁO PKT</h1>
          <div className="sub">Realtime Google Sheet · truy cập nội bộ</div>
          <div className="g-slot" ref={btnRef} />
          {gisFail ? <div className="login-err">Không tải được nút đăng nhập Google — kiểm tra mạng, hoặc domain chưa được thêm vào Authorized JavaScript origins.</div> : null}
          <div className="login-note">
            Đăng nhập bằng email công ty. Tài khoản mới cần Admin ({meta?.superAdmin}) cấp quyền trước khi xem báo cáo.
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'pending') {
    return (
      <div className="login-screen">
        <div className="login-card">
          <span className="logo"><img src="/logo-hq-group.png" alt="HQ Group" /></span>
          <h1>ĐANG CHỜ CẤP QUYỀN</h1>
          <div className="pending-mail mono">{me?.email}</div>
          <div className="login-note">
            Tài khoản đã ghi nhận và đang chờ Admin <b>{me?.admin || meta?.superAdmin}</b> duyệt.
            Báo Admin vào <b>Nguồn &amp; Cấu hình → Quản lý đăng nhập</b> để cấp quyền, sau đó bấm kiểm tra lại.
          </div>
          <button className="btn g-btn" onClick={() => askMe(localStorage.getItem(TOKEN_KEY) || '')}>↻ Kiểm tra lại</button>
          <button className="btn ghost" style={{ marginTop: 10, width: '100%' }} onClick={signOut}>Đăng nhập tài khoản khác</button>
        </div>
      </div>
    );
  }

  return <AuthCtx.Provider value={ctx}>{children}</AuthCtx.Provider>;
}
