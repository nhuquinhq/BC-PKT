'use client';

/* ============================================================
   Khối LIVE của báo cáo CPV A10GG (PKT13).

   Khác mọi báo cáo team còn lại ở hai điểm, và cả hai đều phải nói
   thẳng trên mặt trang, nếu không người đọc sẽ hiểu sai số:
   1. A10GG chỉ có số THEO THÁNG — không có số theo từng ngày.
   2. Tiền về chậm ~45 ngày, nên tháng vừa qua thường còn RE = 0 dù
      chi phí đã ghi. Đó là độ trễ thu tiền, KHÔNG phải team ngừng bán.

   Tháng dự trù đi vào bảng riêng, không cộng vào tổng — xem /api/a10gg.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseVNDate } from '@/lib/timeFilter';
import { sheetQuery } from '@/lib/sheetQuery';

const REFRESH_MS = 300000;

function trongKy(rows, range) {
  if (!range || (!range.from && !range.to)) return rows;
  return rows.filter((r) => {
    const d = parseVNDate(r.ngay);
    if (!d) return true;
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
  });
}

const cong = (rows, k) => rows.reduce((t, r) => t + (r[k] || 0), 0);

export default function A10ggBoard({ report, onLive, range }) {
  const cfg = report.sheet;
  const [st, setSt] = useState({ data: null, dangDoc: true, loi: null });

  const load = useCallback(() => {
    setSt((s) => ({ ...s, dangDoc: true }));
    fetch(`/api/a10gg?${sheetQuery(cfg)}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
        return json;
      })
      .then(
        (data) => setSt({ data, dangDoc: false, loi: null }),
        (e) => setSt({ data: null, dangDoc: false, loi: e.message })
      );
  }, [cfg]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const agg = useMemo(() => {
    if (!st.data) return null;
    const that = trongKy(st.data.a10gg_thang || [], range);
    const duTru = st.data.a10gg_du_tru || [];
    const re = cong(that, 're');
    const co = cong(that, 'co');
    const pl7 = cong(that, 'pl7');
    return {
      /* a10_chi_phi dùng chung dữ liệu tháng, chỉ khác bộ cột */
      tables: { a10_thang: that, a10_chi_phi: that, a10_du_tru: duTru },
      kpis: {
        re,
        co,
        pl1: re - co,
        tong_chi: cong(that, 'tong_chi'),
        pl7,
        ty_le_co: re ? (co / re) * 100 : null,
        bien_pl1: re ? ((re - co) / re) * 100 : null,
        bien_pl7: re ? (pl7 / re) * 100 : null,
      },
    };
  }, [st.data, range]);

  useEffect(() => {
    if (agg) onLive?.(agg);
  }, [agg, onLive]);

  if (st.dangDoc && !st.data) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        <b>Đang đọc số A10GG…</b>
      </div>
    );
  }

  if (st.loi) {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <b>Không đọc được số A10GG.</b>
            <div style={{ marginTop: 6 }}>{st.loi}</div>
            <div style={{ marginTop: 10 }}><button className="btn" onClick={load}>Thử lại</button></div>
          </div>
        </div>
      </section>
    );
  }

  const meta = st.data?.meta || {};
  const tre = meta.tre_ngay ?? 45;
  /* Tháng đã ghi chi phí mà doanh thu vẫn 0 — gần như chắc là do trễ tiền.
     Nói trước để không ai đi hỏi team vì sao mất doanh thu. */
  const chuaVeTien = (agg?.tables.a10_thang || []).filter((r) => !r.re && (r.co || r.tong_chi));

  return (
    <div className="notice-amber" style={{ marginBottom: 18 }}>
      <b>Đọc số A10GG thế nào cho đúng:</b> team này chỉ có số theo THÁNG (không có số theo từng ngày),
      và tiền về chậm khoảng <b>{tre} ngày</b> — doanh thu một tháng phải tới khoảng {tre} ngày sau khi
      hết tháng mới chốt xong.
      {chuaVeTien.length ? (
        <> Hiện <b>{chuaVeTien.map((r) => r.thang).join(', ')}</b> đã ghi chi phí nhưng doanh thu còn 0:
          đó là tiền chưa về, không phải ngừng bán.</>
      ) : null}
      {meta.thang_du_tru?.length ? (
        <> Các tháng <b>{meta.thang_du_tru.join(', ')}</b> đang là số <b>dự trù</b>, để riêng bảng dưới
          và không cộng vào tổng.</>
      ) : null}
    </div>
  );
}
