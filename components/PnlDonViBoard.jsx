'use client';

/* ============================================================
   Khối LIVE cho PKT2 (KQKD — P&L): kéo số A10GG và Charging sang
   bảng P&L để không phải mở từng trang team mới thấy.

   Cả hai đơn vị đọc từ báo cáo TOA của chính họ, đã loại sẵn tháng
   dự trù / tháng chưa tới ở tầng API — xem /api/a10gg và /api/charging.

   CỐ Ý chỉ đẩy MỘT bảng riêng (pnl_don_vi) và KHÔNG đẩy kpis:
   - PKT2 là báo cáo nhập tay, bảng pnl_by_dim và dải KPI do PKT điền.
   - ReportView gộp theo kiểu { ...data.tables, ...live.tables } nên
     nếu đẩy trùng khoá là ghi đè sạch số nhập tay.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseVNDate } from '@/lib/timeFilter';
import { sheetQuery } from '@/lib/sheetQuery';

const REFRESH_MS = 300000;

/* Mỗi đơn vị: endpoint, cấu hình sheet, khoá mảng tháng trong kết quả */
const DON_VI = [
  { key: 'a10', ten: 'A10GG', api: '/api/a10gg', cfgKey: 'a10gg', rows: 'a10gg_thang' },
  { key: 'ch', ten: 'Charging', api: '/api/charging', cfgKey: 'charging', rows: 'charging_thang' },
];

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

export default function PnlDonViBoard({ report, onLive, range }) {
  const cfg = report.sheetDonVi;
  const [st, setSt] = useState({ data: {}, dangDoc: true, loi: {} });

  const load = useCallback(() => {
    if (!cfg) return;
    setSt((s) => ({ ...s, dangDoc: true }));
    Promise.all(
      DON_VI.map(async (dv) => {
        const c = cfg[dv.cfgKey];
        if (!c) return [dv.key, null, null];
        try {
          const res = await fetch(`${dv.api}?${sheetQuery(c)}`, { cache: 'no-store' });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
          return [dv.key, json, null];
        } catch (e) {
          return [dv.key, null, e.message];
        }
      })
    ).then((kq) => {
      const data = {};
      const loi = {};
      for (const [k, json, err] of kq) {
        if (json) data[k] = json;
        if (err) loi[k] = err;
      }
      setSt({ data, dangDoc: false, loi });
    });
  }, [cfg]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const agg = useMemo(() => {
    const rows = [];
    for (const dv of DON_VI) {
      const json = st.data[dv.key];
      if (!json) continue;
      const thang = trongKy(json[dv.rows] || [], range);
      if (!thang.length) continue;
      const re = cong(thang, 're');
      const co = cong(thang, 'co');
      const pl7 = cong(thang, 'pl7');
      rows.push({
        chieu: 'Dự án',
        ten: dv.ten,
        so_thang: thang.length,
        gmv: re, /* hai đơn vị này không tách GMV riêng — GMV = RE */
        re,
        cogs: co,
        pl1: re - co,
        se: cong(thang, 'se'),
        me: cong(thang, 'me'),
        op: cong(thang, 'op'),
        ov: cong(thang, 'ov'),
        pl2: cong(thang, 'pl2'),
        pl7,
        ty_le_co: re ? (co / re) * 100 : null,
        bien_pl7: re ? (pl7 / re) * 100 : null,
      });
    }
    return rows;
  }, [st.data, range]);

  useEffect(() => {
    /* Chỉ đẩy bảng riêng, KHÔNG đẩy kpis — xem ghi chú đầu file */
    if (agg.length) onLive?.({ tables: { pnl_don_vi: agg } });
  }, [agg, onLive]);

  if (!cfg) return null;

  const loi = Object.entries(st.loi);
  const duTru = [];
  const a10 = st.data.a10?.meta?.thang_du_tru;
  const ch = st.data.ch?.meta?.thang_chua_toi;
  if (a10?.length) duTru.push(`A10GG bỏ ${a10.length} tháng dự trù`);
  if (ch?.length) duTru.push(`Charging bỏ ${ch.length} tháng chưa tới`);

  if (st.dangDoc && !agg.length && !loi.length) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        <b>Đang đọc số A10GG và Charging…</b>
      </div>
    );
  }

  return (
    <div className="notice-amber" style={{ marginBottom: 18 }}>
      <b>A10GG và Charging đọc trực tiếp từ báo cáo TOA của từng đơn vị</b> — chỉ có số theo THÁNG,
      không tách GMV riêng nên lấy GMV = RE, và không ghi số đơn.
      {duTru.length ? <> Đã loại số kế hoạch: {duTru.join(' · ')}.</> : null}
      {loi.length ? (
        <> {' '}<b>Chưa đọc được:</b> {loi.map(([k, m]) => `${k === 'a10' ? 'A10GG' : 'Charging'} — ${m}`).join(' · ')}</>
      ) : null}
    </div>
  );
}
