'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthGate';
import { ROLE_LABEL } from '@/lib/authConfig';
import { TIERS, reportsByTier } from '@/lib/reports';

export default function Sidebar() {
  const path = usePathname();
  const { enabled, user, canView, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  /* Đổi trang trên mobile → tự đóng menu */
  useEffect(() => { setOpen(false); }, [path]);

  return (
    <>
    {/* Thanh bar mobile: logo + tên + nút menu */}
    <div className="mobile-bar">
      <Link href="/" className="mb-brand">
        <img src="/logo-hq-group.png" alt="HQ Group" />
        <b>BÁO CÁO PKT</b>
      </Link>
      <button className="mb-burger" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>
    </div>
    {open ? <div className="rail-backdrop" onClick={() => setOpen(false)} /> : null}

    <aside className={`rail${open ? ' open' : ''}`}>
      <div className="rail-scroll">
        <Link href="/" className="rail-brand">
          <span className="logo"><img src="/logo-hq-group.png" alt="HQ Group" /></span>
          <span className="brand-text">
            <span className="title">Trung tâm Báo cáo PKT</span>
            <span className="sub">Realtime Google Sheet · v3</span>
          </span>
        </Link>

        {canView('TQ') ? (
          <Link href="/" className={`nav-item pinned${path === '/' ? ' active' : ''}`}>
            <span className="code">◆</span>
            <span className="dot" />
            <span className="nm">Tổng quan (PKT1 → PKT7)</span>
          </Link>
        ) : null}

        {TIERS.map((tier) => {
          const items = reportsByTier(tier.id).filter((r) => canView(r.code));
          if (!items.length) return null;
          return (
            <div key={tier.id}>
              <div className="rail-label">
                {tier.label} <em>({tier.who})</em>
              </div>
              {items.map((r) => {
                const href = `/bao-cao/${r.slug}`;
                const active = path === href;
                return (
                  <Link key={r.slug} href={href} className={`nav-item${active ? ' active' : ''}`}>
                    <span className="code">{r.code}</span>
                    <span className="dot" />
                    <span className="nm">{r.nav || r.short}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}

        {!enabled || user?.role === 'admin' ? (
          <>
            <div className="rail-label">Hệ thống</div>
            <Link href="/nguon-du-lieu" className={`nav-item${path === '/nguon-du-lieu' ? ' active' : ''}`}>
              <span className="code">·</span>
              <span className="dot sys" />
              <span className="nm">Nguồn &amp; Cấu hình</span>
            </Link>
          </>
        ) : null}
      </div>

      <div className="rail-foot">
        <div className="rail-user">
          <span className="avatar">{(user?.email || 'K')[0].toUpperCase()}</span>
          <span className="who">
            <span className="mail">{user?.email || 'Khách — chưa bật phân quyền'}</span>
            <span className="role">{user ? ROLE_LABEL[user.role] || user.role : 'nối KV để bật đăng nhập'}</span>
          </span>
        </div>
        {user ? (
          <button className="btn-logout" type="button" onClick={signOut}>⏻ Đăng xuất</button>
        ) : null}
      </div>
    </aside>
    </>
  );
}
