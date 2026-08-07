'use client';

/* ============================================================
   Khối LIVE của báo cáo CPV HQ HOLDINGS (PKT20).

   Gộp số của cả tập đoàn về CÙNG một bộ chỉ tiêu GMV / RE / CO để so
   sánh được giữa các đơn vị dù nguồn số mỗi nơi một kiểu:
   - HQS      : đơn hàng BE (/api/cpv) hoặc lịch sử ví (/api/vi)
   - Ritokey  : sheet Daily.Report (/api/ritokey) — chỉ có bản BE
   - QLTT (C100+C200) và HQ Thailand: chưa nối nguồn, vẫn liệt kê để
     không tưởng nhầm tổng đã đủ.

   Quy ước dùng chung:
     GMV = doanh số ghi trên đơn
     RE  = doanh thu ghi nhận  (HQS BE: GMV − phí sàn · ví: tiền thực
           nhận · Ritokey: dòng Doanh thu của file)
     CO  = giá vốn
     PL1 = RE − CO
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseVNDate } from '@/lib/timeFilter';
import { teamOf } from '@/lib/cpvDims';

const REFRESH_MS = 300000;

/* Đơn vị đã có trong cơ cấu nhưng chưa nối được nguồn số liệu */
const CHUA_NOI = [
  { don_vi: 'QLTT (C100 + C200)', nguon: 'Chưa nối nguồn' },
  { don_vi: 'HQ Thailand', nguon: 'Chưa nối nguồn' },
];

const cong = (rows, k) => rows.reduce((t, r) => t + (r[k] || 0), 0);

function trongKy(rows, range, key = 'ngay') {
  if (!range || (!range.from && !range.to)) return rows;
  return rows.filter((r) => {
    const d = parseVNDate(r[key]);
    if (!d) return true;
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
  });
}

function qsCua(cfg) {
  const qs = new URLSearchParams();
  qs.append('url', cfg.url);
  qs.append('gid', cfg.gid || '0');
  for (const m of cfg.mains || []) {
    qs.append('url', m.url);
    qs.append('gid', m.gid || '0');
  }
  if (cfg.hist) qs.set('hist', '1');
  for (const [k, v] of Object.entries(cfg.qs || {})) qs.set(k, v);
  for (const a of Array.isArray(cfg.api) ? cfg.api : cfg.api?.url ? [cfg.api] : []) {
    qs.append('url2', a.url);
    qs.append('gid2', a.gid || '0');
  }
  return qs;
}

/* Một dòng chỉ tiêu chuẩn hoá; gmv để null khi nguồn không có khái niệm GMV */
const chuanHoa = (o) => {
  const re = o.re || 0;
  const co = o.co || 0;
  const pl1 = re - co;
  return {
    ...o,
    re,
    co,
    pl1,
    ty_le_co: re ? (co / re) * 100 : null,
    bien_pl1: re ? (pl1 / re) * 100 : null,
    ty_trong: null /* điền sau khi biết tổng */,
  };
};

export default function HoldingsBoard({ report, sheet, onLive, range }) {
  const cfgHqs = sheet || report.sheet;
  const cheDo = cfgHqs.kind === 'vi' ? 'vi' : 'be';
  const cfgRito = report.sheetRitokey;
  const [st, setSt] = useState({ status: 'loading' });

  const load = useCallback(async () => {
    setSt((s) => ({ ...s, status: s.hqs ? 'refreshing' : 'loading' }));
    const doc = async (url) => {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
      return json;
    };
    const [hqs, rito] = await Promise.allSettled([
      doc(`${cfgHqs.endpoint || '/api/cpv'}?${qsCua(cfgHqs)}`),
      doc(`/api/ritokey?${qsCua(cfgRito)}`),
    ]);
    setSt({
      status: 'ok',
      hqs: hqs.status === 'fulfilled' ? hqs.value : null,
      loiHqs: hqs.status === 'rejected' ? hqs.reason.message : null,
      rito: rito.status === 'fulfilled' ? rito.value : null,
      loiRito: rito.status === 'rejected' ? rito.reason.message : null,
    });
  }, [cfgHqs, cfgRito]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const agg = useMemo(() => {
    if (st.status === 'loading') return null;

    /* ---- HQS: quy các dòng chi tiết về GMV / RE / CO ---- */
    const hqsRows = trongKy(st.hqs?.detail || [], range).map((r) => ({
      ngay: r.ngay,
      team: teamOf(r.bu) || 'HQS khác',
      so_don: r.so_don || 0,
      /* Lịch sử ví ghi thẳng tiền thực nhận nên không có khái niệm GMV */
      gmv: cheDo === 'vi' ? null : r.thanh_tien || 0,
      re: cheDo === 'vi' ? r.thanh_tien || 0 : (r.thanh_tien || 0) - (r.phi_san_vnd || 0),
      co: r.gia_von || 0,
    }));

    /* ---- Ritokey: đã sẵn GMV / RE / CO theo ngày ---- */
    const ritoRows = trongKy(st.rito?.cpv_ngay || [], range).map((r) => ({
      ngay: r.ngay,
      team: 'C300 · Ritokey',
      so_don: r.so_don || 0,
      gmv: cheDo === 'vi' ? null : r.gmv || 0,
      re: r.re || 0,
      co: r.co || 0,
    }));

    const nguonHqs = cheDo === 'vi' ? 'Lịch sử ví (đã sau phí sàn)' : 'BE · đơn hàng';
    const nguonRito = cheDo === 'vi' ? 'BE · Daily.Report (chưa có ví)' : 'BE · Daily.Report';

    const gop = (rows, ten, nguon) => ({
      don_vi: ten,
      nguon,
      so_don: cong(rows, 'so_don'),
      gmv: cheDo === 'vi' ? null : cong(rows, 'gmv'),
      re: cong(rows, 're'),
      co: cong(rows, 'co'),
    });

    /* ---- So sánh theo ĐƠN VỊ ---- */
    const hq_don_vi = [
      chuanHoa(gop(hqsRows, 'HQS10000', nguonHqs)),
      chuanHoa(gop(ritoRows, 'Ritokey (C300)', nguonRito)),
      ...CHUA_NOI.map((x) => chuanHoa({ ...x, so_don: 0, gmv: cheDo === 'vi' ? null : 0, re: 0, co: 0 })),
    ];

    /* ---- So sánh theo TEAM ---- */
    const mTeam = new Map();
    for (const r of [...hqsRows, ...ritoRows]) {
      const dv = r.team === 'C300 · Ritokey' ? 'Ritokey (C300)' : 'HQS10000';
      const a = mTeam.get(r.team) || { team: r.team, don_vi: dv, so_don: 0, gmv: 0, re: 0, co: 0 };
      a.so_don += r.so_don;
      a.gmv += r.gmv || 0;
      a.re += r.re;
      a.co += r.co;
      mTeam.set(r.team, a);
    }
    const hq_team = [...mTeam.values()]
      .map((r) => chuanHoa({ ...r, gmv: cheDo === 'vi' ? null : r.gmv }))
      .sort((a, b) => b.re - a.re);

    /* ---- Toàn tập đoàn theo THÁNG ---- */
    const mThang = new Map();
    for (const r of [...hqsRows, ...ritoRows]) {
      const t = String(r.ngay || '').slice(3);
      if (!t) continue;
      const a = mThang.get(t) || { thang: t, so_don: 0, gmv: 0, re: 0, co: 0 };
      a.so_don += r.so_don;
      a.gmv += r.gmv || 0;
      a.re += r.re;
      a.co += r.co;
      mThang.set(t, a);
    }
    const hq_thang = [...mThang.values()]
      .map((r) => chuanHoa({ ...r, gmv: cheDo === 'vi' ? null : r.gmv }))
      .sort((a, b) => (a.thang.slice(3) + a.thang.slice(0, 2)).localeCompare(b.thang.slice(3) + b.thang.slice(0, 2)));

    /* Tỉ trọng doanh thu của từng đơn vị / team trên tổng tập đoàn */
    const tongRe = cong(hq_don_vi, 're');
    for (const bang of [hq_don_vi, hq_team]) {
      for (const r of bang) r.ty_trong = tongRe ? (r.re / tongRe) * 100 : null;
    }

    const re = tongRe;
    const co = cong(hq_don_vi, 'co');
    const gmv = cheDo === 'vi' ? null : cong(hq_don_vi, 'gmv');
    return {
      tables: { hq_don_vi, hq_team, hq_thang },
      kpis: {
        gmv,
        re,
        co,
        pl1: re - co,
        ty_le_co: re ? (co / re) * 100 : null,
        bien_pl1: re ? ((re - co) / re) * 100 : null,
        so_don: cong(hq_don_vi, 'so_don'),
      },
    };
  }, [st, range, cheDo]);

  useEffect(() => {
    if (agg) onLive?.(agg);
  }, [agg, onLive]);

  const canhBao = [];
  if (st.loiHqs) canhBao.push(`chưa đọc được số HQS — ${st.loiHqs}`);
  if (st.loiRito) canhBao.push(`chưa đọc được số Ritokey — ${st.loiRito}`);

  if (st.status === 'ok' && !st.hqs && !st.rito) {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <b>Không đọc được nguồn nào của HQ Holdings.</b>
            <div style={{ marginTop: 6 }}>{canhBao.join(' · ')}</div>
            <div style={{ marginTop: 10 }}><button className="btn" onClick={load}>Thử lại</button></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="notice-amber" style={{ marginBottom: 18 }}>
      <b>Tổng hợp chưa đủ tập đoàn:</b> QLTT (C100 + C200) và HQ Thailand chưa nối nguồn số liệu nên đang tính bằng 0.
      {cheDo === 'vi'
        ? ' Bản theo VÍ không có khái niệm GMV (tiền về ví đã sau phí sàn) nên cột GMV để trống; Ritokey chưa có sổ ví nên vẫn lấy số BE.'
        : ' Với HQS, RE = GMV − phí sàn; với Ritokey, RE là dòng Doanh thu của file (GMV của Ritokey gồm cả đơn hoàn hủy).'}
      {canhBao.length ? <> {' · '} {canhBao.join(' · ')}</> : null}
    </div>
  );
}
