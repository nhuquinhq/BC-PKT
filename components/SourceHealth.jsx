'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { REPORTS } from '@/lib/reports';
import { fetchSheetGrid } from '@/lib/data';

const REFRESH_MS = 60 * 1000;

/* Trang Nguồn & Cấu hình kiểu Trung tâm PVH:
   thẻ thống kê + bảng chẩn đoán đọc thử từng tab Google Sheet, tự làm mới 60s. */
export default function SourceHealth() {
  const live = REPORTS.filter((r) => r.sheet);
  const pending = REPORTS.filter((r) => !r.sheet);
  const files = [...new Set(live.map((r) => r.sheet.url))];

  const [diag, setDiag] = useState({});
  const [at, setAt] = useState(null);
  const [auth, setAuth] = useState(null);
  const { data: session } = useSession();

  useEffect(() => {
    fetch('/api/auth-status').then((r) => r.json()).then(setAuth).catch(() => setAuth({ configured: false }));
  }, []);

  const runAll = useCallback(async () => {
    await Promise.all(
      live.map(async (r) => {
        const key = r.slug;
        setDiag((d) => ({ ...d, [key]: { ...d[key], status: 'loading' } }));
        const t0 = performance.now();
        try {
          const grid = await fetchSheetGrid(r.sheet.url, r.sheet.gid);
          const ms = Math.round(performance.now() - t0);
          const first = (grid[0] || []).map((c) => String(c || '').trim()).filter(Boolean).join(' · ').slice(0, 80);
          setDiag((d) => ({ ...d, [key]: { status: 'ok', ms, rows: grid.length, first } }));
        } catch (e) {
          setDiag((d) => ({ ...d, [key]: { status: 'err', error: e.message } }));
        }
      })
    );
    setAt(new Date());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    runAll();
    const t = setInterval(runAll, REFRESH_MS);
    return () => clearInterval(t);
  }, [runAll]);

  const okCount = live.filter((r) => diag[r.slug]?.status === 'ok').length;
  const timeTxt = at ? at.toLocaleTimeString('vi-VN') : '…';

  return (
    <>
      <div className="topbar">
        <div className="topbar-row">
          <div>
            <div className="eyebrow">SRC · Thiết lập hệ thống</div>
            <h1>Nguồn &amp; Cấu hình</h1>
            <div className="range-line">
              <span className="hint">Đọc trực tiếp Google Sheet (publish CSV) · qua <span className="mono">/api/sheet</span> trên Vercel</span>
            </div>
          </div>
          <div className="src-updated">
            <span className="dot-ok">●</span> Cập nhật {timeTxt} · Tự làm mới 60s
          </div>
        </div>
      </div>

      <div className="content">
        <div className="stat-cards">
          <div className="stat-card">
            <div className="sc-label">Nguồn dữ liệu</div>
            <div className="sc-val">{okCount}/{live.length} {okCount === live.length ? '✓' : ''}</div>
            <div className="sc-sub">{live.length} tab · {files.length} file Google Sheet</div>
          </div>
          <div className="stat-card">
            <div className="sc-label">Cách đọc</div>
            <div className="sc-val" style={{ color: 'var(--cy)' }}>Trực tiếp Google</div>
            <div className="sc-sub">publish CSV · /api/sheet là proxy</div>
          </div>
          <div className="stat-card">
            <div className="sc-label">Báo cáo LIVE</div>
            <div className="sc-val">{live.length}/{REPORTS.length}</div>
            <div className="sc-sub">{live.map((r) => r.code).join(' · ')} · {pending.length} chờ khai báo</div>
          </div>
          <div className="stat-card">
            <div className="sc-label">Tự làm mới</div>
            <div className="sc-val">60 giây</div>
            <div className="sc-sub">lần cuối {timeTxt}</div>
          </div>
        </div>

        {pending.length ? (
          <div className="notice-amber">
            <b>{pending.length}/{REPORTS.length} báo cáo chưa có nguồn LIVE.</b> Publish file Google Sheet tương ứng
            (File → Share → Publish to web) rồi khai báo <span className="mono">url + gid</span> vào khối{' '}
            <span className="mono">sheet</span> của báo cáo trong <span className="mono">lib/reports.js</span> — web sẽ tự đọc như PKT1.
          </div>
        ) : null}

        <section className="panel">
          <div className="panel-head">
            <h2>Quản lý đăng nhập &amp; phân quyền</h2>
            <span className="hint">Admin cứng: {auth?.admins?.join(', ') || 'quynhhtn@hqplay.vn'}</span>
          </div>
          <div className="panel-body">
            {auth && !auth.configured ? (
              <div className="notice-amber" style={{ marginBottom: 12 }}>
                <b>Đăng nhập Google chưa bật</b> — web đang mở tự do. Đặt 4 biến môi trường trong Vercel
                (<span className="mono">GOOGLE_CLIENT_ID · GOOGLE_CLIENT_SECRET · NEXTAUTH_SECRET · NEXTAUTH_URL</span>)
                rồi Redeploy là toàn trang yêu cầu đăng nhập bằng email domain.
              </div>
            ) : null}
            <div className="auth-rows">
              <div><span className="dim">Trạng thái</span>{auth ? (auth.configured ? <span className="src-badge ok">ĐÃ BẬT — khoá toàn trang</span> : <span className="src-badge idle">chưa cấu hình OAuth</span>) : '…'}</div>
              <div><span className="dim">Domain được phép</span><span className="mono">{auth?.domains?.map((d) => `@${d}`).join(' · ') || '…'}</span></div>
              <div><span className="dim">Đang đăng nhập</span>{session?.user ? <span className="mono">{session.user.email} · {session.user.role === 'admin' ? 'Admin cứng' : 'Thành viên'}</span> : <span className="dim">— chưa đăng nhập —</span>}</div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Chẩn đoán nguồn dữ liệu</h2>
            <span className={`tag ${okCount === live.length ? 'ok-tag' : 'breach-tag'}`}>
              {okCount === live.length ? `✓ toàn bộ ${live.length} tab đọc được` : `${live.length - okCount} tab lỗi`}
            </span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl diag">
                <thead>
                  <tr>
                    <th style={{ width: 30 }} />
                    <th>Tab</th>
                    <th>GID</th>
                    <th>Nguồn đọc được</th>
                    <th className="num">Số dòng</th>
                    <th>Dòng đầu / lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((url, fi) => (
                    <FileGroup key={url} url={url} idx={fi} reports={live.filter((r) => r.sheet.url === url)} diag={diag} />
                  ))}
                  {pending.length ? (
                    <>
                      <tr className="sect"><td colSpan={6}>Chờ kết nối — báo cáo chưa khai báo nguồn</td></tr>
                      {pending.map((r) => (
                        <tr key={r.slug}>
                          <td><span className="dot-idle">●</span></td>
                          <td><b>{r.code}</b> · {r.nav}</td>
                          <td className="mono dim">—</td>
                          <td><span className="src-badge idle">chưa khai báo</span></td>
                          <td className="num dim">—</td>
                          <td className="first-line dim">Nguồn dự kiến: {r.source}</td>
                        </tr>
                      ))}
                    </>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="flow-legend">
          <span className="lg-label">Luồng dữ liệu:</span>
          <span className="chip">Google Sheet</span> →
          <span className="chip">Publish CSV</span> →
          <span className="chip">/api/sheet trên Vercel</span> →
          <span className="chip">Dashboard (60s/lần)</span>
          <span className="dim"> · “lỗi” thường do tab chưa Publish to web hoặc sai GID</span>
        </div>

        <section className="panel">
          <div className="panel-head"><h2>Bảng khai báo cột — chuẩn bị dữ liệu theo đúng tên này</h2></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Báo cáo</th><th>Mã bảng</th><th>Tên bảng</th><th>Cột cần có (tên key)</th></tr>
                </thead>
                <tbody>
                  {REPORTS.flatMap((r) =>
                    r.tables.map((t) => (
                      <tr key={r.slug + t.id}>
                        <td className="mono">{r.code}</td>
                        <td className="mono">{t.id}</td>
                        <td>{t.title}</td>
                        <td className="mono" style={{ whiteSpace: 'normal', fontSize: 11.5 }}>
                          {t.columns.map((c) => c.key).join(' · ')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function FileGroup({ url, idx, reports, diag }) {
  const label = reports[0]?.sheet?.label?.split('·')[0]?.trim() || `File ${idx + 1}`;
  return (
    <>
      <tr className="sect"><td colSpan={6}>File chính — {label}</td></tr>
      {reports.map((r) => {
        const d = diag[r.slug] || { status: 'loading' };
        return (
          <tr key={r.slug}>
            <td>
              {d.status === 'ok' ? <span className="dot-ok">●</span> : d.status === 'err' ? <span className="dot-err">●</span> : <span className="dot-idle">●</span>}
            </td>
            <td><b>{r.sheet.label?.split('·')[1]?.trim() || r.code}</b> · {r.code}</td>
            <td className="mono dim">{r.sheet.gid}</td>
            <td>
              {d.status === 'ok' ? (
                <span className="src-badge ok">Google trực tiếp · {d.ms}ms</span>
              ) : d.status === 'err' ? (
                <span className="src-badge err">lỗi đọc</span>
              ) : (
                <span className="src-badge idle">đang đọc…</span>
              )}
            </td>
            <td className="num">{d.status === 'ok' ? d.rows : '—'}</td>
            <td className={`first-line ${d.status === 'err' ? 'err' : ''}`}>
              {d.status === 'ok' ? d.first : d.status === 'err' ? d.error : '…'}
            </td>
          </tr>
        );
      })}
    </>
  );
}
