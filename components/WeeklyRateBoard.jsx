'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSheetGrid } from '@/lib/data';
import { parseWeeklyRate, fmtMatrixCell } from '@/lib/weeklyRate';
import { parseVNDate, overlapsRange } from '@/lib/timeFilter';

const SECTION_TITLE = {
  'RATE THIS WEEK': 'RATE THIS WEEK — Tỉ giá áp dụng ghi sổ tuần',
  ER1: 'ER1 — Chi tiết theo dõi đầu tuần',
  ER2: 'ER2 — USDT/VND chi tiết',
};

const REFRESH_MS = 60 * 1000;

/* 'USDT/ VND' trên sheet → 'USDT/VND' */
const cleanLabel = (s) => String(s || '').replace(/\s*\/\s*/g, '/');

/* Bảng ma trận tỉ giá tuần, đọc trực tiếp từ Google Sheet đã publish.
   Đồng thời đẩy bản tidy (mỗi tuần 1 dòng) + KPI tuần mới nhất lên ReportView qua onLive. */
export default function WeeklyRateBoard({ report, onLive, range }) {
  const cfg = report.sheet;
  const [state, setState] = useState({ status: 'loading' });
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: s.weeks ? 'refreshing' : 'loading' }));
    try {
      const grid = await fetchSheetGrid(cfg.url, cfg.gid);
      const parsed = parseWeeklyRate(grid);
      setState({ status: 'ok', ...parsed, at: new Date() });
      onLive?.({ tables: { [cfg.table]: parsed.tidy }, kpis: parsed.kpis });
    } catch (e) {
      setState((s) => ({ ...s, status: 'err', error: e.message }));
    }
  }, [cfg, onLive]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  /* Cuộn sẵn tới tuần mới nhất (cột cuối) */
  useEffect(() => {
    if (state.status === 'ok' && wrapRef.current) {
      wrapRef.current.scrollLeft = wrapRef.current.scrollWidth;
    }
  }, [state.status, state.at]);

  const busy = state.status === 'loading' || state.status === 'refreshing';
  const { weeks = [], rows = [] } = state;
  const lastIdx = weeks.length - 1;

  /* Cột tuần nhìn qua bộ lọc thời gian */
  const visible = useMemo(() => {
    const idx = weeks.map((_, i) => i);
    if (!range || (!range.from && !range.to)) return idx;
    return idx.filter((i) => {
      const w = weeks[i];
      const a = parseVNDate(w.from, w.year);
      let b = parseVNDate(w.to, w.year);
      if (a && b && b < a) b = new Date(b.getFullYear() + 1, b.getMonth(), b.getDate());
      return overlapsRange(a, b, range.from, range.to);
    });
  }, [weeks, range]);

  /* Chèn dòng tiêu đề khu vực khi section đổi */
  const bodyRows = [];
  let prevSection = null;
  rows.forEach((r, i) => {
    if (r.section !== prevSection) {
      prevSection = r.section;
      bodyRows.push({ sep: SECTION_TITLE[r.section] || r.section, key: `s${i}` });
    }
    bodyRows.push({ row: r, key: `r${i}` });
  });

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>
            Tỉ giá tuần — WEEKLY RATE
            <span className="tag live-tag">● LIVE</span>
          </h2>
          <div className="hint">
            Đọc trực tiếp từ Google Sheet {cfg.label ? `“${cfg.label}”` : ''}
            {state.at ? ` · Cập nhật ${state.at.toLocaleTimeString('vi-VN')}` : ''} · Tự làm mới 60s
          </div>
        </div>
        <div className="stack">
          <a className="btn ghost" href={cfg.url} target="_blank" rel="noreferrer">Mở sheet gốc ↗</a>
          <button className="btn" onClick={load} disabled={busy}>{busy ? 'Đang đọc…' : 'Làm mới'}</button>
        </div>
      </div>

      <div className="panel-body" style={{ padding: state.status === 'ok' ? 0 : 18 }}>
        {state.status === 'loading' ? (
          <div className="empty-state">Đang đọc dữ liệu tỉ giá từ Google Sheet…</div>
        ) : state.status === 'err' ? (
          <div className="empty-state">
            <b>Không đọc được Google Sheet.</b>
            <div style={{ marginTop: 6 }}>{state.error}</div>
            <div style={{ marginTop: 10 }}>
              Kiểm tra: sheet đã <b>File → Share → Publish to web</b> chưa, và link/GID trong <code className="mono">lib/reports.js</code> có đúng tab WEEKLY RATE không.
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">Không có tuần nào trong phạm vi lọc — nới rộng Từ ngày / Đến ngày hoặc bấm “Cả kỳ”.</div>
        ) : (
          <div className="tbl-wrap matrix-wrap" ref={wrapRef}>
            <table className="tbl matrix">
              <thead>
                <tr>
                  <th className="rowhead">Chỉ số</th>
                  {visible.map((i) => (
                    <th key={i} className={`num${i === lastIdx ? ' now' : ''}`}>
                      <div className="wk">Tuần {weeks[i].week}{i === lastIdx ? ' · nay' : ''}</div>
                      <div className="rng">{weeks[i].from} – {weeks[i].to}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((b) =>
                  b.sep ? (
                    <tr key={b.key} className="sect">
                      <td className="rowhead">{b.sep}</td>
                      <td colSpan={visible.length} />
                    </tr>
                  ) : (
                    <tr key={b.key}>
                      <td className="rowhead">
                        {b.row.main ? <b>{cleanLabel(b.row.label)}</b> : <span className="subrow">{cleanLabel(b.row.label)}</span>}
                        {b.row.main && b.row.kind ? <span className="kind"> · {b.row.kind}</span> : null}
                      </td>
                      {visible.map((i) => {
                        const c = b.row.cells[i];
                        const cls = ['num'];
                        if (i === lastIdx) cls.push('now');
                        if (b.row.isGap && c?.n != null) {
                          cls.push(c.n < 0 ? 'down' : c.n > 0 ? 'up' : 'flat');
                          if (Math.abs(c.n) > 2) cls.push('breach');
                        }
                        return <td key={i} className={cls.join(' ')}>{fmtMatrixCell(c, b.row.isGap) || '—'}</td>;
                      })}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
