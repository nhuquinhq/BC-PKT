'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

const ERROR_MSG = {
  AccessDenied: 'Tài khoản không thuộc domain được phép. Hãy dùng email công ty (@hqplay.vn) hoặc liên hệ admin.',
  Configuration: 'Cấu hình OAuth chưa đúng — kiểm tra GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET trên Vercel.',
  OAuthCallback: 'Google từ chối phiên đăng nhập. Kiểm tra Authorized redirect URI trong Google Cloud Console.',
};

function LoginInner() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/';
  const error = params.get('error');
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    fetch('/api/auth-status').then((r) => r.json()).then(setCfg).catch(() => setCfg({ configured: false }));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') router.replace(callbackUrl);
  }, [status, callbackUrl, router]);

  return (
    <div className="login-screen">
      <div className="login-card">
        <span className="logo">HQ<i>group</i></span>
        <h1>TRUNG TÂM BÁO CÁO PKT</h1>
        <div className="sub">Realtime Google Sheet · truy cập nội bộ</div>

        {error ? <div className="login-err">{ERROR_MSG[error] || `Đăng nhập thất bại (${error}). Thử lại.`}</div> : null}

        <button
          className="btn g-btn"
          disabled={!cfg?.configured || status === 'loading'}
          onClick={() => signIn('google', { callbackUrl })}
        >
          Đăng nhập bằng Google
        </button>

        {cfg && !cfg.configured ? (
          <div className="login-note warn">
            Chưa cấu hình OAuth — đặt <span className="mono">GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET · NEXTAUTH_SECRET · NEXTAUTH_URL</span>{' '}
            trong Vercel rồi Redeploy. Trong lúc chờ, web đang mở tự do.
          </div>
        ) : (
          <div className="login-note">
            Chỉ email {cfg?.domains?.map((d) => `@${d}`).join(', ') || '@hqplay.vn'} · Admin: {cfg?.admins?.join(', ') || 'quynhhtn@hqplay.vn'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
