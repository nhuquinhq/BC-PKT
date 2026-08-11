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
    /* Lọc trên dữ liệu NGÀY rồi cộng ngược lên tháng và KPI, để chọn tháng /
       tuần / khoảng ngày nào thì mọi con số trên trang đều đổi theo — kể cả
       khoảng cắt ngang tháng. */
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

    const CONG = ['gmv', 'gmv_tien_ich', 'gmv_giftcard', 'gmv_steam', 're', 're_tien_ich',
      're_giftcard', 're_steam', 'pt', 'co', 'pl1', 'so_don', 'don_tien_ich', 'don_giftcard', 'don_steam'];
    const mT = new Map();
    for (const r of ngay) {
      const a = mT.get(r.thang) || { thang: r.thang, sortKey: r.thang.slice(3) + r.thang.slice(0, 2), nguon: r.nguon };
      for (const k of CONG) a[k] = (a[k] || 0) + (r[k] || 0);
      if (r.nguon === 'Đọc trực tiếp') a.nguon = 'Đọc trực tiếp';
      mT.set(r.thang, a);
    }
    const thang = [...mT.values()]
      .sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1))
      .map((r) => ({
        ...r,
        ty_le_co: r.re ? (r.co / r.re) * 100 : null,
        bien_pl1: r.re ? (r.pl1 / r.re) * 100 : null,
      }));

    /* Độ mịn của BIỂU ĐỒ chạy theo bộ lọc: xem một tháng (hay một tuần) thì
       vẽ từng ngày, xem cả năm thì vẽ từng tháng. Bảng số vẫn giữ nguyên
       cả bảng tháng lẫn bảng ngày. */
    const soThang = new Set(ngay.map((r) => r.thang)).size;
    const cpv_auto = (ngay.length <= 45 || soThang <= 1 ? ngay : thang)
      .map((r) => ({ ...r, nhan: r.ngay ? r.ngay.slice(0, 5) : r.thang }));

    const t = (k) => ngay.reduce((s, r) => s + (r[k] || 0), 0);
    const gmv = t('gmv');
    const re = t('re');
    const co = t('co');
    const pl1 = t('pl1');
    return {
      tables: { cpv_thang: thang, cpv_nhom: thang, cpv_ngay: ngay, cpv_auto },
      kpis: {
        gmv, re, co, pl1,
        so_don: t('so_don'),
        ar: t('pt'),
        ty_le_co: re ? (co / re) * 100 : null,
        bien_pl1: re ? (pl1 / re) * 100 : null,
      },
    };
  }, [state.data, range]);

  useEffect(() => {
    if (agg) onLive?.(agg);
  }, [agg, onLive]);

  /* Đang đọc thì báo rõ thay vì để trang trắng */
  if (state.status === 'loading') {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        <b>Đang đọc sheet Daily.Report…</b> Bảng và biểu đồ sẽ tự hiện khi đọc xong.
      </div>
    );
  }
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
