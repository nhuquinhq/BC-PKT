'use client';

/* ============================================================
   Khối LIVE của báo cáo CPV dự án CHARGING (PKT14).

   Charging chỉ có số theo THÁNG. Các tháng chưa tới vẫn ghi sẵn một
   khoản phân bổ OP đều nhau nên PL7 âm — đó là chi phí ghi trước, KHÔNG
   phải lỗ đã phát sinh, nên /api/charging tách hẳn ra và trang nói rõ.
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

export default function ChargingBoard({ report, onLive, range }) {
  const cfg = report.sheet;
  const [st, setSt] = useState({ data: null, dangDoc: true, loi: null });

  const load = useCallback(() => {
    setSt((s) => ({ ...s, dangDoc: true }));
    fetch(`/api/charging?${sheetQuery(cfg)}`, { cache: 'no-store' })
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
    const that = trongKy(st.data.charging_thang || [], range);
    const chuaToi = st.data.charging_chua_toi || [];
    const re = cong(that, 're');
    const co = cong(that, 'co');
    const pl7 = cong(that, 'pl7');
    return {
      tables: { ch_thang: that, ch_chi_phi: that, ch_chua_toi: chuaToi },
      kpis: {
        re,
        gmv: re,
        co,
        pl1: re - co,
        pl2: cong(that, 'pl2'),
        pl7,
        tong_chi: cong(that, 'tong_chi'),
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
        <b>Đang đọc số Charging…</b>
      </div>
    );
  }

  if (st.loi) {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <b>Không đọc được số Charging.</b>
            <div style={{ marginTop: 6 }}>{st.loi}</div>
            <div style={{ marginTop: 10 }}><button className="btn" onClick={load}>Thử lại</button></div>
          </div>
        </div>
      </section>
    );
  }

  const meta = st.data?.meta || {};
  const k = agg?.kpis;

  return (
    <div className="notice-amber" style={{ marginBottom: 18 }}>
      <b>Đọc số Charging thế nào cho đúng:</b> dự án này chỉ có số theo THÁNG (không có số theo từng ngày).
      {k && k.re ? (
        <> Giá vốn chiếm <b>{k.ty_le_co.toFixed(1)}%</b> doanh thu — biên rất mỏng, nên mọi biến động giá vốn
          đều ăn thẳng vào lãi.</>
      ) : null}
      {meta.thang_chua_toi?.length ? (
        <> Các tháng <b>{meta.thang_chua_toi.join(', ')}</b> chưa tới nhưng file đã ghi sẵn khoản phân bổ chi phí,
          làm lãi/lỗ các tháng đó âm. Đó là chi phí <b>ghi trước</b>, không phải lỗ đã phát sinh, nên
          <b> không được cộng</b> vào số thật và cũng không vào báo cáo tập đoàn.</>
      ) : null}
    </div>
  );
}
