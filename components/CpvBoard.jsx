'use client';

/* Bảng LIVE Doanh thu – Giá vốn theo đơn hàng BE HQS (PKT8).
   /api/cpv đã gộp file ~vài chục nghìn đơn thành bản compact
   (Ngày × Sàn); component này tính tiếp 3 chiều Ngày / Sàn / BU
   theo bộ lọc thời gian rồi đẩy lên ReportView qua onLive. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseVNDate } from '@/lib/timeFilter';
import { teamOf } from '@/lib/cpvDims';

const REFRESH_MS = 60 * 1000;

const sum = (rows, k) => rows.reduce((t, r) => t + (r[k] || 0), 0);

const NUM_KEYS = ['so_don', 'don_fail', 'don_huy', 'nc_don', 'nc_gmv', 'doanh_thu_usd', 'phi_san', 'phi_san_vnd', 'dthu_thuc', 'thanh_tien', 'gia_von', 'loi_nhuan'];

/* Tiêu chí KQKD: GMV = Thành tiền · PL1 = Lợi nhuận (GMV − Giá vốn) ·
   PL2A = PL1 − phí sàn quy VND · ARPO = GMV / số đơn A3 */
const kqkd = (r) => {
  const gmv = r.thanh_tien;
  const pl1 = r.loi_nhuan;
  const pl2a = pl1 - r.phi_san_vnd;
  return {
    ...r,
    gmv,
    pl1,
    pct_pl1: gmv ? (pl1 / gmv) * 100 : null,
    pl2a,
    pct_pl2a: gmv ? (pl2a / gmv) * 100 : null,
    arpo: r.so_don ? gmv / r.so_don : null,
  };
};

const donStats = (r) => {
  const tong = r.so_don + r.don_fail + r.don_huy;
  return {
    ...r,
    ti_le_fail: tong ? (r.don_fail / tong) * 100 : null,
    ti_le_huy: tong ? (r.don_huy / tong) * 100 : null,
  };
};

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
    ti_le_nc: r.so_don ? (r.nc_don / r.so_don) * 100 : null,
  }));
}

export default function CpvBoard({ report, sheet, onLive, range }) {
  const cfg = sheet || report.sheet; /* trang team có thể truyền nguồn thay thế (LS Ví) */
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: s.detail ? 'refreshing' : 'loading' }));
    try {
      const qs = new URLSearchParams();
      qs.append('url', cfg.url);
      qs.append('gid', cfg.gid || '0');
      /* Các file tháng trước cùng form (module Quản lý đơn hàng) */
      for (const m of cfg.mains || []) {
        qs.append('url', m.url);
        qs.append('gid', m.gid || '0');
      }
      if (cfg.hist) qs.set('hist', '1'); /* tháng đã chốt lấy từ datalake tĩnh */
      for (const [k, v] of Object.entries(cfg.qs || {})) qs.set(k, v); /* tham số riêng (vd month/year tab ví) */
      /* File API sàn — có thể nhiều file theo tháng */
      for (const a of Array.isArray(cfg.api) ? cfg.api : cfg.api?.url ? [cfg.api] : []) {
        qs.append('url2', a.url);
        qs.append('gid2', a.gid || '0');
        if (a.san) qs.set('san2', a.san);
      }
      const res = await fetch(`${cfg.endpoint || '/api/cpv'}?${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
      setState({ status: 'ok', detail: json.detail, apiFile: json.api_file || [], dupList: json.dup_list || [], ncList: json.no_cost_list || [], meta: json.meta, at: new Date() });
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
    /* Gắn Team từ BU trước khi gộp; trang tầng 3 chỉ giữ dữ liệu team mình,
       trang lead sàn chỉ giữ dữ liệu sàn mình */
    rows = rows.map((r) => ({ ...r, team: teamOf(r.bu) }));
    if (cfg.teamFilter) rows = rows.filter((r) => r.team === cfg.teamFilter);
    if (cfg.sanFilter) rows = rows.filter((r) => r.san === cfg.sanFilter);

    /* Đối soát theo module nguồn — SỐ GỐC của từng file (đơn trùng giữa 2 file
       được tính ở cả hai dòng; KPI và các bảng trên vẫn khử trùng):
       - Quản lý đơn hàng: mọi đơn file BE (VND có sẵn trên file).
       - API sàn: mọi đơn Hoàn Tất của file API theo Ngày hoàn tất (cột Q),
         quy VND bằng tỷ giá tuần. */
    const withTyGia = (r) => ({ ...r, ty_gia: r.dthu_thuc > 0 ? r.thanh_tien / r.dthu_thuc : null });
    const inRange = (r) => {
      if (!range || (!range.from && !range.to)) return true;
      const d = parseVNDate(r.ngay);
      if (!d) return true;
      if (range.from && d < range.from) return false;
      if (range.to && d > range.to) return false;
      return true;
    };
    const dhRows = rows.filter((r) => (r.nguon || 'dh') === 'dh');
    const nguon_module = [];
    if (dhRows.length) nguon_module.push(withTyGia({ module: 'Quản lý đơn hàng', ...groupBy(dhRows, () => 'dh', [])[0] }));
    const apiAgg = groupBy((state.apiFile || []).filter(inRange), () => 'api', []);
    if (apiAgg.length) nguon_module.push(withTyGia({ module: 'API sàn (G1/G2)', ...apiAgg[0] }));

    /* Danh sách đơn trùng giữa 2 module (đã khử trong báo cáo) — để PKT đối chiếu */
    const dup_don = (state.dupList || []).filter(inRange);

    /* PKT10: danh sách từng đơn chưa tìm được giá vốn (gắn Team từ BU) */
    const nc_don = (state.ncList || []).filter(inRange).map((r) => ({ ...r, team: teamOf(r.bu) }));

    /* Đối soát NGUYÊN TỆ theo tháng × module: dọc tháng, ngang 2 module (USD gốc từng file) */
    const mt = new Map();
    const mtGet = (t) => {
      if (!mt.has(t)) mt.set(t, { thang: t, usd_dh: 0, usd_api: 0, usd_tong: 0 });
      return mt.get(t);
    };
    for (const r of dhRows) mtGet(r.ngay.slice(3)).usd_dh += r.doanh_thu_usd || 0;
    for (const r of (state.apiFile || []).filter(inRange)) mtGet(r.ngay.slice(3)).usd_api += r.doanh_thu_usd || 0;
    const module_thang = [...mt.values()]
      .map((a) => ({ ...a, usd_tong: a.usd_dh + a.usd_api }))
      .sort((x, y) => (x.thang.slice(3) + x.thang.slice(0, 2)).localeCompare(y.thang.slice(3) + y.thang.slice(0, 2)));

    const cpv_ngay = groupBy(rows, (r) => r.ngay, ['ngay']);
    /* Gộp theo tháng (MM/yyyy) — so sánh tháng với đủ chỉ số KQKD + đơn hàng */
    const cpv_thang = groupBy(rows.map((r) => ({ ...r, thang: r.ngay.slice(3) })), (r) => r.thang, ['thang'])
      .sort((a, b) => (a.thang.slice(3) + a.thang.slice(0, 2)).localeCompare(b.thang.slice(3) + b.thang.slice(0, 2)))
      .map(kqkd)
      .map(donStats);
    const cpv_san = groupBy(rows, (r) => r.san, ['san', 'bu']).sort((a, b) => b.thanh_tien - a.thanh_tien);
    const cpv_bu = groupBy(rows, (r) => r.bu, ['bu']).sort((a, b) => b.thanh_tien - a.thanh_tien);
    const byTeam = groupBy(rows, (r) => r.team, ['team']).sort((a, b) => b.thanh_tien - a.thanh_tien);
    const bySpdv = groupBy(rows, (r) => r.spdv, ['spdv']).sort((a, b) => b.thanh_tien - a.thanh_tien);
    const kqkd_team = byTeam.map(kqkd);
    const kqkd_spdv = bySpdv.map(kqkd);
    const don_team = byTeam.map(donStats);
    const don_spdv = bySpdv.map(donStats);
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
      don_fail: sum(rows, 'don_fail'),
      don_huy: sum(rows, 'don_huy'),
      /* KPI đơn chưa có giá vốn (PKT10) */
      nc_don: sum(rows, 'nc_don'),
      nc_gmv: sum(rows, 'nc_gmv'),
      ti_le_nc: sum(rows, 'so_don') ? (sum(rows, 'nc_don') / sum(rows, 'so_don')) * 100 : null,
      /* KPI đối soát (PKT9) */
      so_don_dh: sum(dhRows, 'so_don'),
      so_don_api_file: apiAgg[0]?.so_don || 0,
      don_trung: dup_don.length,
      lech_trung_usd: dup_don.reduce((t, r) => t + (r.lech || 0), 0),
    };
    return { tables: { cpv_ngay, cpv_thang, cpv_san, cpv_bu, kqkd_team, kqkd_spdv, don_team, don_spdv, nguon_module, module_thang, dup_don, nc_don }, kpis };
  }, [state.detail, state.status, range, cfg.teamFilter, cfg.sanFilter]);

  useEffect(() => {
    if (agg) onLive?.(agg);
  }, [agg, onLive]);

  const m = state.meta;

  /* Khối này chỉ lo tải + tổng hợp dữ liệu; bình thường không hiện gì
     (tiêu đề trang và tên từng biểu đồ đã đủ). Chỉ hiện panel khi có sự cố. */
  if (state.status === 'err') {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <b>Không đọc được dữ liệu đơn hàng.</b>
            <div style={{ marginTop: 6 }}>{state.error}</div>
            <div style={{ marginTop: 10 }}>
              Kiểm tra: file đã <b>Publish to web</b> đúng tab Data chưa, và GID trong <span className="mono">lib/reports.js</span>.
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn" onClick={load}>Thử lại</button>
            </div>
          </div>
        </div>
      </section>
    );
  }
  if (m?.main_error) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        Số liệu đang hiển thị <b>thiếu một phần file Quản lý đơn hàng</b> (file tháng mới có thể chưa có dữ liệu) — lỗi đọc: {m.main_error}
      </div>
    );
  }
  if (m?.api_error) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        Số liệu đang hiển thị <b>chưa gồm file API sàn G1/G2</b> — lỗi đọc: {m.api_error}
      </div>
    );
  }
  if (m && !m.gia_von_found) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        Không tìm thấy cột <b>Giá vốn</b> trong tab Data — các cột giá vốn/lãi gộp đang bằng 0.
        Báo tôi tên cột chính xác để map lại.
      </div>
    );
  }
  return null;
}
