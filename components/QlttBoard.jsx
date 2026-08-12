'use client';

/* Khối LIVE của PKT21 (HQC100 · VX101) và PKT22 (HQSC200 · WGG).
   Đọc /api/qltt một lần rồi lọc theo khoảng thời gian đang chọn và theo
   sheet.teamFilter của trang, cộng ngược lên bảng tháng / bảng ngày để
   chọn tháng nào thì mọi con số đổi theo. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sheetQuery } from '@/lib/sheetQuery';

const REFRESH_MS = 300000;

const CONG = ['gmv', 'co', 'ar', 'cogs', 'pl1', 'so_don', 'gmv_ban_nick', 'gmv_dv_tu_dong',
  'gmv_dv_thu_cong', 'gmv_minigame', 'co_ban_nick', 'co_dv_tu_dong', 'co_dv_thu_cong', 'co_minigame'];

/* Tên team trên file nguồn → mã đơn vị dùng trong báo cáo */
const DON_VI = { VX101: 'HQC100 · VX101', WGG: 'HQSC200 · WGG' };

function gop(rows, khoa) {
  const m = new Map();
  for (const r of rows) {
    const k = r[khoa];
    const a = m.get(k) || { [khoa]: k, sortKey: r.sortKey, nguon: r.nguon,
      ...Object.fromEntries(CONG.map((c) => [c, 0])) };
    for (const c of CONG) a[c] += r[c] || 0;
    if (r.nguon === 'Đọc trực tiếp') a.nguon = 'Đọc trực tiếp';
    if (r.sortKey < a.sortKey) a.sortKey = r.sortKey;
    m.set(k, a);
  }
  return [...m.values()].map((r) => ({
    ...r,
    ty_le_co: r.gmv ? (r.cogs / r.gmv) * 100 : null,
    bien_pl1: r.gmv ? (r.pl1 / r.gmv) * 100 : null,
  }));
}

export default function QlttBoard({ report, onLive, range }) {
  const cfg = report.sheet;
  const [st, setSt] = useState({ status: 'loading' });

  const load = useCallback(async () => {
    setSt((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading' }));
    try {
      const res = await fetch(`/api/qltt?${sheetQuery(cfg)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
      setSt({ status: 'ok', data: json });
    } catch (e) {
      setSt((s) => ({ ...s, status: 'err', error: e.message }));
    }
  }, [cfg]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const agg = useMemo(() => {
    const d = st.data;
    if (!d) return null;
    let ngay = d.qltt_ngay || [];
    if (range && (range.from || range.to)) {
      ngay = ngay.filter((r) => {
        const [dd, mm, yy] = r.ngay.split('/').map(Number);
        const t = new Date(yy, mm - 1, dd);
        if (range.from && t < range.from) return false;
        if (range.to && t > range.to) return false;
        return true;
      });
    }
    /* Bảng đối chiếu luôn giữ đủ hai đơn vị; mọi bảng còn lại và KPI thì
       chỉ tính team của trang đang xem (PKT21 = VX101, PKT22 = WGG). */
    const team = gop(ngay, 'team')
      .sort((a, b) => b.gmv - a.gmv)
      .map((r) => ({ ...r, team: DON_VI[r.team] || r.team }));
    if (cfg?.teamFilter) ngay = ngay.filter((r) => r.team === cfg.teamFilter);
    const thang = gop(ngay, 'thang')
      .sort((a, b) => (a.sortKey < b.sortKey ? -1 : 1));
    const t = (k) => ngay.reduce((s, r) => s + (r[k] || 0), 0);
    const gmv = t('gmv');
    const cogs = t('cogs');
    return {
      tables: {
        qltt_ngay: ngay,
        qltt_team: team,
        qltt_nhom_thang: thang,
        qltt_thang: thang,
      },
      kpis: {
        gmv, co: t('co'), ar: t('ar'), cogs, pl1: gmv - cogs, so_don: t('so_don'),
        ty_le_co: gmv ? (cogs / gmv) * 100 : null,
        bien_pl1: gmv ? ((gmv - cogs) / gmv) * 100 : null,
      },
    };
  }, [st.data, range, cfg]);

  useEffect(() => {
    if (agg) onLive?.(agg);
  }, [agg, onLive]);

  if (st.status === 'loading') {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        <b>Đang đọc số liệu QLTT…</b> Tháng đang chạy phải đọc mấy chục tab từ file Google nên có thể mất một lúc.
      </div>
    );
  }
  if (st.status === 'err') {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <b>Không đọc được báo cáo QLTT.</b>
            <div style={{ marginTop: 6 }}>{st.error}</div>
            <div style={{ marginTop: 10 }}><button className="btn" onClick={load}>Thử lại</button></div>
          </div>
        </div>
      </section>
    );
  }
  const m = st.data?.meta;
  return (
    <div className="notice-amber" style={{ marginBottom: 18 }}>
      <b>Cách tính:</b> {m?.ghi_chu}
      {m?.loi_doc_live
        ? <> <br /><b>Chưa đọc được tháng đang chạy —</b> {m.loi_doc_live}</>
        : <> {' · '} Đã đọc trực tiếp <b>{m?.so_tab_doc_truc_tiep || 0}</b> tab của tháng đang chạy.</>}
    </div>
  );
}
