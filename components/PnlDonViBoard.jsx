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

/* Bản đồ 22 dòng của bảng P&L chính (pnl_main) sang số của hai đơn vị.
   nguon:
     'so'   — lấy thẳng từ số đã gộp
     'khong'— hai đơn vị này KHÔNG có khái niệm đó, đúng bằng 0
     'trong'— file không tách được, để trống chứ không điền 0 cho khỏi
              hiểu nhầm là đã đối chiếu ra 0 */
const CAY = [
  { ma: 'GMV1', khoan_muc: 'GMV mô hình Tự nhập bán', cong_thuc: 'GMV100..104', nguon: 'trong' },
  { ma: 'GMV2', khoan_muc: 'GMV mô hình Flip', cong_thuc: 'GMV200..204', nguon: 'trong' },
  { ma: 'RR', khoan_muc: 'Giảm trừ doanh thu (hoàn hủy)', cong_thuc: 'RR1 + RR2', nguon: 'khong' },
  { ma: 'AR', khoan_muc: 'Phải trả NCC / Sàn Flip', cong_thuc: 'AR1 + AR2', nguon: 'trong' },
  { ma: 'RE', khoan_muc: 'DOANH THU NET', cong_thuc: 'RE1 + RE2', nguon: 'so', key: 're' },
  { ma: 'CO1', khoan_muc: 'Giá vốn hàng bán', cong_thuc: 'CO100..104', nguon: 'so', key: 'co' },
  { ma: 'CO2', khoan_muc: 'Giá vốn cung ứng (nhân sự xử lý đơn)', cong_thuc: 'CO200 + CO201', nguon: 'trong' },
  { ma: 'CO3', khoan_muc: 'Giá vốn die / thất thoát / dự phòng', cong_thuc: 'CO300 + CO301', nguon: 'trong' },
  { ma: 'PL1', khoan_muc: 'LÃI SAU GIÁ VỐN', cong_thuc: 'RE − COGS', nguon: 'so', key: 'pl1' },
  { ma: 'SF', khoan_muc: 'Phí sàn', cong_thuc: 'SF1 + SF2', nguon: 'khong' },
  { ma: 'CF', khoan_muc: 'Phí rút tiền (gồm quy đổi USDT)', cong_thuc: 'Phí thực rút + FV × biến phí', nguon: 'khong' },
  { ma: 'PL2A', khoan_muc: 'LÃI SAU PHÍ BÁN HÀNG', cong_thuc: 'PL1 − SF − CF', nguon: 'so', key: 'pl1' },
  { ma: 'SE', khoan_muc: 'Chi phí nhân sự bán hàng', cong_thuc: 'SE1 + SE2', nguon: 'so', key: 'se' },
  { ma: 'ME', khoan_muc: 'Chi phí marketing / ads', cong_thuc: 'ME1 + ME2', nguon: 'so', key: 'me' },
  { ma: 'OP', khoan_muc: 'Chi phí vận hành trực tiếp', cong_thuc: 'OP1 + OP2', nguon: 'so', key: 'op' },
  { ma: 'FI', khoan_muc: 'Chi phí tài chính & thuế', cong_thuc: 'FI1 + FI2', nguon: 'so', key: 'fi' },
  { ma: 'FG', khoan_muc: 'Flip Gain', cong_thuc: 'FG1 + FG2', nguon: 'khong' },
  { ma: 'PL2', khoan_muc: 'LÃI SAU CHI PHÍ TRỰC TIẾP', cong_thuc: 'PL201 + PL202 + FG', nguon: 'so', key: 'pl2' },
  { ma: 'OV', khoan_muc: 'Chi phí nhân sự gián tiếp (BOD, BO)', cong_thuc: 'OVS+OVC+OVE+OVP+OVD', nguon: 'so', key: 'ov' },
  { ma: 'CA', khoan_muc: 'Chi phí tài sản & khấu hao', cong_thuc: 'CA1 + CA2', nguon: 'so', key: 'ca' },
  { ma: 'OT', khoan_muc: 'Chi phí khác', cong_thuc: '', nguon: 'so', key: 'ot' },
  { ma: 'PL7', khoan_muc: 'LỢI NHUẬN SAU CÙNG', cong_thuc: 'PL2 − OV − CA − OT', nguon: 'so', key: 'pl7' },
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

  /* Gộp hai bản: theo KỲ ĐANG LỌC và LŨY KẾ cả năm (không lọc) */
  const soLieu = useMemo(() => {
    const lam = (locTheoKy) => {
      const out = {};
      for (const dv of DON_VI) {
        const json = st.data[dv.key];
        if (!json) continue;
        const rows = json[dv.rows] || [];
        out[dv.key] = gopTang(locTheoKy ? trongKy(rows, range) : rows);
      }
      const co = Object.values(out);
      if (co.length) {
        const t = {};
        for (const k of ['re', 'co', 'se', 'me', 'op', 'fi', 'ov', 'ca', 'ot', 'pl1', 'pl2', 'pl7', 'pl7_file', 'so_thang']) {
          t[k] = co.reduce((x, s2) => x + (s2[k] || 0), 0);
        }
        t.lech = Math.round(t.pl7 - t.pl7_file);
        out.tong = t;
      }
      return out;
    };
    return { ky: lam(true), nam: lam(false) };
  }, [st.data, range]);

  const dangXem = soLieu.ky[tab] || null;
  const caNam = soLieu.nam[tab] || null;

  /* Điền thẳng vào BẢNG P&L CHÍNH (pnl_main) — phải trả về ĐỦ 22 dòng
     vì đẩy live là thay nguyên bảng, thiếu dòng nào là mất dòng đó.
     Mã · khoản mục · công thức giữ nguyên theo khung sẵn có (ReportView
     đã gộp sẵn phần khung, ở đây chỉ điền phần số). */
  const bang = useMemo(() => {
    if (!dangXem) return [];
    const re = dangXem.re;
    return CAY.map((d) => {
      const co = d.nguon === 'so';
      const v = co ? dangXem[d.key] || 0 : d.nguon === 'khong' ? 0 : null;
      const vNam = co ? (caNam?.[d.key] ?? null) : d.nguon === 'khong' ? 0 : null;
      return {
        ma: d.ma,
        khoan_muc: d.khoan_muc,
        cong_thuc: d.cong_thuc,
        ky_nay: v,
        /* Kỳ trước & %MoM để trống: dải lọc là tuỳ ý (có thể nhiều tháng)
           nên không có "kỳ trước" xác định để so — điền bừa là số sai. */
        ky_truoc: null,
        mom: null,
        luy_ke: vNam,
        tren_re: v !== null && re ? (v / re) * 100 : null,
      };
    });
  }, [dangXem, caNam]);

  useEffect(() => {
    if (bang.length) onLive?.({ tables: { pnl_main: bang } });
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
