'use client';

/* Khối LIVE của PKT3 / PKT4 — đọc file Báo cáo TIỀN qua /api/tien,
   đẩy KPI + bảng lên trang qua onLive (giống CpvBoard).
   Luôn hiện trạng thái đối soát: khi file còn LỆCH thì số trên trang
   chưa dùng để ra quyết định được, phải nói rõ ngay đầu trang. */

import { useCallback, useEffect, useMemo, useState } from 'react';

const REFRESH_MS = 300000; /* file tiền cập nhật theo ngày — 5 phút/lần là đủ */

export default function TienBoard({ report, onLive, range }) {
  const cfg = report.sheet;
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading' }));
    try {
      const qs = new URLSearchParams({ url: cfg.url });
      for (const [k, v] of Object.entries(cfg.qs || {})) qs.set(k, v);
      const res = await fetch(`/api/tien?${qs}`, { cache: 'no-store' });
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
    /* Cột tháng đang xem: theo bộ lọc thời gian, không có thì lấy luỹ kế */
    const thang = range?.to ? range.to.getMonth() + 1 : null;
    const cot = thang ? `t${thang}` : 'luy_ke';
    const lay = (ma) => d.bclctt.find((r) => r.ma === ma) || {};
    const so = (ma) => lay(ma)[cot] || 0;

    const thu = ['01', '06', '22', '24', '26', '27', '31', '33'].reduce((t, m) => t + so(m), 0);
    const chi = ['02', '03', '04', '05', '07', '21', '23', '25', '32', '34', '35', '36'].reduce((t, m) => t + so(m), 0);
    const kpis = {
      tien_dau_ky: thang ? lay('60')[cot] || 0 : d.kpis.tien_dau_ky,
      tong_thu: thu,
      tong_chi: chi,
      tien_cuoi_ky: so('70'),
      ocf: so('20'),
      icf: so('30'),
      fcf: so('40'),
      luu_chuyen_thuan: so('50'),
      lech_doi_soat: d.kpis.lech_doi_soat,
      gd_chua_gan_ma: d.kpis.gd_chua_gan_ma,
    };

    /* Bảng dòng tiền: 1 dòng / chỉ tiêu B03a, 12 cột tháng + luỹ kế */
    const cf_thang = d.bclctt.map((r) => ({ ...r }));
    const cf_kiem_soat = d.kiem_soat.map((r) => ({ ...r }));
    const viec_ton = (d.dashboard?.viec_ton || []).map((r) => ({
      viec: r.a, so_luong: r.b, ai: r.c, chan: r.d,
    }));
    return { tables: { cf_thang, cf_kiem_soat, viec_ton }, kpis };
  }, [state.data, range]);

  useEffect(() => {
    if (agg) onLive?.(agg);
  }, [agg, onLive]);

  if (state.status === 'err') {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state">
            <b>Không đọc được file Báo cáo TIỀN.</b>
            <div style={{ marginTop: 6 }}>{state.error}</div>
            <div style={{ marginTop: 10 }}>
              <button className="btn" onClick={load}>Thử lại</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const tt = state.data?.meta?.trang_thai_doi_soat || '';
  if (tt && !/^ok$/i.test(tt)) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        <b>Số liệu chưa đối soát xong — khối kiểm soát của file đang báo “{tt}”.</b> Chênh lệch giữa biến động tiền
        theo sổ và BCLCTT là {Math.round((state.data?.kpis?.lech_doi_soat || 0) / 1e9).toLocaleString('vi-VN')} tỷ,
        còn {(state.data?.kpis?.gd_chua_gan_ma || 0).toLocaleString('vi-VN')} giao dịch chưa gán mã B03a.
        Các con số dưới đây dùng để <b>rà soát</b>, chưa dùng để ra quyết định.
      </div>
    );
  }
  return null;
}
