'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { REPORTS } from '@/lib/reports';

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="rail">
      <Link href="/" className="rail-brand" style={{ display: 'block' }}>
        <div className="mark">HQ GROUP</div>
        <div className="title">Báo cáo Phòng Kế Toán</div>
        <div className="sub">Digital Asset Arbitrage &amp; Distribution</div>
      </Link>

      <div className="rail-label">Bộ báo cáo</div>
      {REPORTS.map((r) => {
        const href = `/bao-cao/${r.slug}`;
        const active = path === href;
        return (
          <Link key={r.slug} href={href} className={`nav-item${active ? ' active' : ''}`}>
            <span className="code">{r.code}</span>
            <span>
              <span className="nm">{r.short}</span>
              <br />
              <span className="sla">SLA {r.sla}</span>
            </span>
          </Link>
        );
      })}

      <div className="rail-label">Thiết lập</div>
      <Link href="/nguon-du-lieu" className={`nav-item${path === '/nguon-du-lieu' ? ' active' : ''}`}>
        <span className="code">SRC</span>
        <span className="nm">Nguồn dữ liệu &amp; kiến trúc</span>
      </Link>
    </aside>
  );
}
