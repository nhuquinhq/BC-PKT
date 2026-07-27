'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { TIERS, reportsByTier } from '@/lib/reports';

export default function Sidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <aside className="rail">
      <div className="rail-scroll">
        <Link href="/" className="rail-brand">
          <span className="logo">HQ<i>group</i></span>
          <span className="brand-text">
            <span className="title">Trung tâm Báo cáo PKT</span>
            <span className="sub">Realtime Google Sheet · v3</span>
          </span>
        </Link>

        <Link href="/" className={`nav-item pinned${path === '/' ? ' active' : ''}`}>
          <span className="code">◆</span>
          <span className="dot" />
          <span className="nm">Tổng quan (PKT1 → PKT7)</span>
        </Link>

        {TIERS.map((tier) => (
          <div key={tier.id}>
            <div className="rail-label">
              {tier.label} <em>({tier.who})</em>
            </div>
            {reportsByTier(tier.id).map((r) => {
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
        ))}

        <div className="rail-label">Hệ thống</div>
        <Link href="/nguon-du-lieu" className={`nav-item${path === '/nguon-du-lieu' ? ' active' : ''}`}>
          <span className="code">·</span>
          <span className="dot sys" />
          <span className="nm">Nguồn &amp; Cấu hình</span>
        </Link>
      </div>

      <div className="rail-foot">
        <div className="rail-user">
          <span className="avatar">{(user?.email || 'K')[0].toUpperCase()}</span>
          <span className="who">
            <span className="mail">{user?.email || 'Khách — chưa bật đăng nhập'}</span>
            <span className="role">{user ? (user.role === 'admin' ? 'Admin cứng' : 'Thành viên') : 'cấu hình tại Nguồn & Cấu hình'}</span>
          </span>
        </div>
        {user ? (
          <button className="btn-logout" type="button" onClick={() => signOut({ callbackUrl: '/dang-nhap' })}>
            ⏻ Đăng xuất
          </button>
        ) : (
          <Link className="btn-logout" href="/dang-nhap">⏻ Đăng nhập Google</Link>
        )}
      </div>
    </aside>
  );
}
