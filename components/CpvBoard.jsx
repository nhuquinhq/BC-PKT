'use client';

/* Bảng LIVE Doanh thu – Giá vốn theo đơn hàng BE HQS (PKT8).
   /api/cpv đã gộp file ~vài chục nghìn đơn thành bản compact
   (Ngày × Sàn); component này tính tiếp 3 chiều Ngày / Sàn / BU
   theo bộ lọc thời gian rồi đẩy lên ReportView qua onLive. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseVNDate } from '@/lib/timeFilter';

const REFRESH_MS = 60 * 1000;

const sum = (rows, k) => rows.reduce((t, r) => t + (r[k] || 0), 0);

const NUM_KEYS = ['so_don', 'doanh_thu_usd', 'phi_san', 'dthu_thuc', 'thanh_tien', 'gia_von', 'loi_nhuan'];

function groupBy(rows, keyFn, labelKeys) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, { ...Object.fromEntries(labelKeys.map((lk) => [lk, r[lk]])), ...Object.fromEntries(NUM_KEYS.map((nk) => [nk, 0])) });
    const a = m.get(k);
    for (const nk of NUM_KEYS) a[nk] += r[nk] || 0;
  }
  return [...m.values()].map((r) => ({
    ...r,
    ty_le_co: r.thanh_tien ? (r.gia_von / r.thanh_tien) * 100 : null,
    bien_ln: r.thanh_tien ? (r.loi_nhuan / r.thanh_tien) * 100 : null,
  }));
}

export default function CpvBoard({ report, onLive, range }) {
  const cfg = report.sheet;
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: s.detail ? 'refreshing' : 'loading' }));
    try {
      const qs = new URLSearchParams({ url: cfg.url, gid: cfg.gid || '0' });
      const res = await fetch(`/api/cpv?${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
      setState({ status: 'ok', detail: json.detail, meta: json.meta, at: new Date() });
    } catch (e) {
      setState((s) => ({ ...s, status: 'err', error: e.message }));
    }
  }, [cfg]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  /* Tính 3 chiều theo phạm vi lọc */
  const agg = useMemo(() => {
    if (state.status !== 'ok' && !state.detail) return null;
    let rows = state.detail || [];
    if (range && (range.from || range.to)) {
      rows = rows.filter((r) => {
        const d = parseVNDate(r.ngay);
        if (!d) return true;
        if (range.from && d < range.from) return false;
        if (range.to && d > range.to) return false;
        return true;
      });
    }
    const cpv_ngay = groupBy(rows, (r) => r.ngay, ['ngay']);
    const cpv_san = groupBy(rows, (r) => r.san, ['san', 'bu']).sort((a, b) => b.thanh_tien - a.thanh_tien);
    const cpv_bu = groupBy(rows, (r) => r.bu, ['bu']).sort((a, b) => b.thanh_tien - a.thanh_tien);
    const thanh_tien = sum(rows, 'thanh_tien');
    const gia_von = sum(rows, 'gia_von');
    const loi_nhuan = sum(rows, 'loi_nhuan');
    const kpis = {
      gmv: thanh_tien,
      cogs: gia_von,
      loi_nhuan,
      ty_le_co: thanh_tien ? (gia_von / thanh_tien) * 100 : null,
      bien_ln: thanh_tien ? (loi_nhuan / thanh_tien) * 100 : null,
      so_don: sum(rows, 'so_don'),
      doanh_thu_usd: sum(rows, 'doanh_thu_usd'),
    };
    return { tables: { cpv_ngay, cpv_san, cpv_bu }, kpis };
  }, [state.detail, state.status, range]);

  useEffect(() => {
    if (agg) onLive?.(agg);
  }, [agg, onLive]);

  const busy = state.status === 'loading' || state.status === 'refreshing';
  const m = state.meta;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>
            Doanh thu – Giá vốn theo đơn (BE HQS)
            <span className="tag live-tag">● LIVE</span>
          </h2>
          <div className="hint">
            Đọc từ Google Sheet {cfg.label ? `“${cfg.label}”` : ''}
            {state.at ? ` · Cập nhật ${state.at.toLocaleTimeString('vi-VN')}` : ''} · Tự làm mới 60s
            {m ? ` · ${m.rows_used.toLocaleString('vi-VN')} đơn Hoàn Tất · Ngày hoàn tất ${m.from} → ${m.to}` : ''}
          </div>
        </div>
        <div className="stack">
          <a className="btn ghost" href={cfg.url} target="_blank" rel="noreferrer">Mở sheet gốc ↗</a>
          <button className="btn" onClick={load} disabled={busy}>{busy ? 'Đang đọc…' : 'Làm mới'}</button>
        </div>
      </div>
      {state.status === 'err' ? (
        <div className="panel-body">
          <div className="empty-state">
            <b>Không đọc được dữ liệu đơn hàng.</b>
            <div style={{ marginTop: 6 }}>{state.error}</div>
            <div style={{ marginTop: 10 }}>
              Kiểm tra: file đã <b>Publish to web</b> đúng tab Data chưa, và GID trong <span className="mono">lib/reports.js</span>.
            </div>
          </div>
        </div>
      ) : m && !m.gia_von_found ? (
        <div className="panel-body">
          <div className="notice-amber" style={{ margin: 0 }}>
            Không tìm thấy cột <b>Giá vốn</b> trong tab Data — các cột giá vốn/lãi gộp đang bằng 0.
            Báo tôi tên cột chính xác để map lại.
          </div>
        </div>
      ) : null}
    </section>
  );
}
