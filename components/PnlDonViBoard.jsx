'use client';

/* ============================================================
   Khối LIVE cho PKT2 (KQKD — P&L): dựng KQKD ĐỦ TẦNG cho A10GG và
   Charging, kèm dải nút chuyển ngang Tổng · A10GG · Charging.

   File CPV của hai đơn vị này CHÍNH LÀ báo cáo KQKD, nên bóc thẳng
   theo cây tầng, chốt cuối là PL7:
       PL1  = RE − COGS
       PL2  = PL1 − SE − ME − OP − FI
       PL7  = PL2 − OV − CA − OT

   Vì sao TỰ TÍNH tầng thay vì lấy dòng PL2 sẵn trên file: dòng PL2 của
   Charging KHÔNG khớp với chính PL7 của nó (file để PL2 = PL1, không trừ
   OP, nhưng PL7 lại trừ). Công thức trên khớp PL7 ở CẢ HAI đơn vị — đã
   đối chiếu bằng số thật tháng 1. Dòng PL7 vẫn lấy nguyên từ file và
   đem so lại với số tự tính; lệch thì báo ngay trên trang.

   CỐ Ý không đẩy kpis lên PKT2: dải KPI trên đó là P&L TOÀN TẬP ĐOÀN do
   PKT nhập từ file 2026 PnL_HQG. Nhét số của hai dự án vào là biến P&L
   tập đoàn thành P&L hai dự án — sai phạm vi.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseVNDate } from '@/lib/timeFilter';
import { sheetQuery } from '@/lib/sheetQuery';

const REFRESH_MS = 300000;

const DON_VI = [
  { key: 'a10', ten: 'A10GG', api: '/api/a10gg', cfgKey: 'a10gg', rows: 'a10gg_thang' },
  { key: 'ch', ten: 'Charging', api: '/api/charging', cfgKey: 'charging', rows: 'charging_thang' },
];

/* Cây tầng P&L — giữ đúng mã của từ điển khái niệm HQS bên bảng chính */
const CAY = [
  { ma: 'RE', khoan_muc: 'DOANH THU NET', cong_thuc: 'Doanh thu ghi nhận', key: 're', dam: true },
  { ma: 'COGS', khoan_muc: 'Giá vốn hàng bán', cong_thuc: 'COGS', key: 'co', chi: true },
  { ma: 'PL1', khoan_muc: 'LÃI SAU GIÁ VỐN', cong_thuc: 'RE − COGS', key: 'pl1', dam: true },
  { ma: 'SE', khoan_muc: 'Chi phí nhân sự bán hàng', cong_thuc: 'SE', key: 'se', chi: true },
  { ma: 'ME', khoan_muc: 'Chi phí marketing / ads', cong_thuc: 'ME', key: 'me', chi: true },
  { ma: 'OP', khoan_muc: 'Chi phí vận hành trực tiếp', cong_thuc: 'OP', key: 'op', chi: true },
  { ma: 'FI', khoan_muc: 'Chi phí tài chính & thuế', cong_thuc: 'FI', key: 'fi', chi: true },
  { ma: 'PL2', khoan_muc: 'LÃI SAU CHI PHÍ TRỰC TIẾP', cong_thuc: 'PL1 − SE − ME − OP − FI', key: 'pl2', dam: true },
  { ma: 'OV', khoan_muc: 'Chi phí nhân sự gián tiếp (BOD, BO)', cong_thuc: 'OV', key: 'ov', chi: true },
  { ma: 'CA', khoan_muc: 'Chi phí tài sản & khấu hao', cong_thuc: 'CA', key: 'ca', chi: true },
  { ma: 'OT', khoan_muc: 'Chi phí khác', cong_thuc: 'OT', key: 'ot', chi: true },
  { ma: 'PL7', khoan_muc: 'LỢI NHUẬN SAU CÙNG', cong_thuc: 'PL2 − OV − CA − OT', key: 'pl7', dam: true },
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

/* Cộng các tháng của một đơn vị rồi dựng đủ tầng */
function gopTang(thang) {
  const s = {};
  for (const k of ['re', 'co', 'se', 'me', 'op', 'fi', 'ov', 'ca', 'ot']) s[k] = cong(thang, k);
  s.pl1 = s.re - s.co;
  s.pl2 = s.pl1 - s.se - s.me - s.op - s.fi;
  s.pl7 = s.pl2 - s.ov - s.ca - s.ot;
  /* PL7 ghi trên file — để đối chiếu lại với số tự tính */
  s.pl7_file = cong(thang, 'pl7');
  s.lech = Math.round(s.pl7 - s.pl7_file);
  s.so_thang = thang.length;
  return s;
}

export default function PnlDonViBoard({ report, onLive, range }) {
  const cfg = report.sheetDonVi;
  const [st, setSt] = useState({ data: {}, dangDoc: true, loi: {} });
  const [tab, setTab] = useState('tong');

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

  /* Số đã gộp của từng đơn vị + bản Tổng (cộng ngang hai đơn vị) */
  const soLieu = useMemo(() => {
    const out = {};
    for (const dv of DON_VI) {
      const json = st.data[dv.key];
      if (!json) continue;
      out[dv.key] = gopTang(trongKy(json[dv.rows] || [], range));
    }
    const co = Object.values(out);
    if (co.length) {
      const t = {};
      for (const k of ['re', 'co', 'se', 'me', 'op', 'fi', 'ov', 'ca', 'ot', 'pl1', 'pl2', 'pl7', 'pl7_file', 'so_thang']) {
        t[k] = co.reduce((x, s) => x + (s[k] || 0), 0);
      }
      t.lech = Math.round(t.pl7 - t.pl7_file);
      out.tong = t;
    }
    return out;
  }, [st.data, range]);

  const dangXem = soLieu[tab] || null;

  /* Bảng đẩy sang PKT2 — dựng theo đúng đơn vị đang chọn ở dải nút */
  const bang = useMemo(() => {
    if (!dangXem) return [];
    const re = dangXem.re;
    return CAY.map((d) => {
      const v = dangXem[d.key] || 0;
      return {
        ma: d.ma,
        khoan_muc: d.khoan_muc,
        cong_thuc: d.cong_thuc,
        /* Dòng chi phí hiện số âm cho thấy rõ nó trừ đi khỏi doanh thu */
        gia_tri: d.chi ? -Math.abs(v) : v,
        tren_re: re ? (v / re) * 100 : null,
      };
    });
  }, [dangXem]);

  useEffect(() => {
    if (bang.length) onLive?.({ tables: { pnl_don_vi: bang } });
  }, [bang, onLive]);

  if (!cfg) return null;

  const loi = Object.entries(st.loi);
  if (st.dangDoc && !dangXem && !loi.length) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        <b>Đang đọc KQKD của A10GG và Charging…</b>
      </div>
    );
  }

  const NUT = [{ key: 'tong', ten: 'Tổng 2 dự án' }, ...DON_VI.filter((d) => soLieu[d.key])];
  const boQua = [];
  const a10 = st.data.a10?.meta?.thang_du_tru;
  const ch = st.data.ch?.meta?.thang_chua_toi;
  if (a10?.length) boQua.push(`A10GG bỏ ${a10.length} tháng dự trù`);
  if (ch?.length) boQua.push(`Charging bỏ ${ch.length} tháng chưa tới`);

  return (
    <div style={{ marginBottom: 18 }}>
      <div className="src-toggle" style={{ marginBottom: 10 }}>
        {NUT.map((x) => (
          <button
            key={x.key}
            className={`qbtn${tab === x.key ? ' on' : ''}`}
            onClick={() => setTab(x.key)}
          >
            {x.ten || x.key}
          </button>
        ))}
      </div>
      <div className="notice-amber">
        <b>KQKD của A10GG và Charging bóc đủ tầng, chốt cuối là PL7.</b>{' '}
        Hai file CPV của họ chính là báo cáo KQKD nên đọc thẳng, không qua sổ đơn hàng.
        Cả hai chỉ có số theo THÁNG và không tách GMV riêng.
        {dangXem?.so_thang ? <> Đang cộng <b>{dangXem.so_thang}</b> tháng trong kỳ lọc.</> : null}
        {boQua.length ? <> Đã loại số kế hoạch: {boQua.join(' · ')}.</> : null}
        {dangXem && Math.abs(dangXem.lech) > 1 ? (
          <> {' '}<b style={{ color: '#ffb454' }}>Lệch đối chiếu:</b> PL7 tự tính theo tầng chênh{' '}
            {dangXem.lech.toLocaleString('vi-VN')} đ so với dòng PL7 ghi trên file — cần soi lại khối chi phí.</>
        ) : dangXem ? (
          <> {' '}PL7 tự tính <b>khớp</b> với dòng PL7 trên file.</>
        ) : null}
        {loi.length ? (
          <> {' '}<b>Chưa đọc được:</b>{' '}
            {loi.map(([k, m]) => `${k === 'a10' ? 'A10GG' : 'Charging'} — ${m}`).join(' · ')}</>
        ) : null}
      </div>
    </div>
  );
}
