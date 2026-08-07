'use client';

/* Khối LIVE của báo cáo CPV Ritokey (C300) — đọc /api/ritokey rồi đẩy
   KPI + bảng lên trang qua onLive, giống CpvBoard. */

import { useCallback, useEffect, useMemo, useState } from 'react';

const REFRESH_MS = 300000;

export default function RitokeyBoard({ report, onLive, range }) {
  const cfg = report.sheet;
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading' }));
    try {
      const qs = new URLSearchParams({ url: cfg.url });
      for (const [k, v] of Object.entries(cfg.qs || {})) qs.set(k, v);
      const res = await fetch(`/api/ritokey?${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
      setState({ status: 'ok', data: json, at: new Date() });
    } catch (e) {
      setState((s) => ({ ...s, status: 'err', error: e.message }));
    }
  }, [cfg]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const agg = useMemo(() => {
    const d = state.data;
    if (!d) return null;
    /* Bộ lọc thời gian chỉ áp cho bảng ngày; bảng tháng luôn hiện đủ 12 tháng */
    let ngay = d.cpv_ngay;
    if (range && (range.from || range.to)) {
      const trong = (r) => {
        const [dd, mm, yy] = r.ngay.split('/').map(Number);
        const t = new Date(yy, mm - 1, dd);
        if (range.from && t < range.from) return false;
        if (range.to && t > range.to) return false;
        return true;
      };
      ngay = ngay.filter(trong);
    }
    return { tables: { cpv_thang: d.cpv_thang, cpv_ngay: ngay }, kpis: d.kpis };
  }, [state.data, range]);

  useEffect(() => {
    if (agg) onLive?.(agg);
  }, [agg, onLive]);

  if (state.status === 'err') {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <b>Không đọc được báo cáo Ritokey.</b>
            <div style={{ marginTop: 6 }}>{state.error}</div>
            <div style={{ marginTop: 10 }}><button className="btn" onClick={load}>Thử lại</button></div>
          </div>
        </div>
      </section>
    );
  }
  const m = state.data?.meta;
  if (m?.loi_doc_live) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        Các tháng đã chốt vẫn hiển thị đủ, nhưng <b>chưa đọc được tháng đang chạy</b> từ file — {m.loi_doc_live}
      </div>
    );
  }
  return null;
}
