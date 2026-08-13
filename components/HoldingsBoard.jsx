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
import { sheetQuery } from '@/lib/sheetQuery';

const REFRESH_MS = 300000;

/* Đơn vị đã có trong cơ cấu nhưng chưa nối được nguồn số liệu */
const CHUA_NOI = [
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
  const cfgQltt = report.sheetQltt;
  const cfgA10 = report.sheetA10gg;
  const cfgCh = report.sheetCharging;
  const [st, setSt] = useState({
    hqs: null, rito: null, qltt: null, a10: null, ch: null,
    dangDoc: { hqs: true, rito: true, qltt: true, a10: true, ch: true }, loi: {},
  });

  /* Hai nguồn tải ĐỘC LẬP nhau: file đơn hàng HQS to nên đọc lâu, nguồn nào
     về trước hiện trước, không bắt cả trang chờ nguồn chậm nhất. */
  const load = useCallback(() => {
    setSt((s) => ({ ...s, dangDoc: { hqs: true, rito: true, qltt: true, a10: true, ch: true } }));
    const doc = async (url) => {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
      return json;
    };
    const nhan = (ten, url) => {
      let p;
      try {
        p = doc(url);
      } catch (e) {
        p = Promise.reject(e);
      }
      p.then(
        (v) => {
          setSt((s) => ({ ...s, [ten]: v, loi: { ...s.loi, [ten]: null }, dangDoc: { ...s.dangDoc, [ten]: false } }));
          /* Server vừa trả bản đang nhớ và đang đọc lại Google ở nền — hiện
             số cũ ngay cho khỏi phải chờ, rồi hỏi lại một lượt để lấy số mới. */
          if (v?.meta?.bo_nho?.dang_lam_moi) {
            setTimeout(() => {
              doc(`${url}${url.includes('?') ? '&' : '?'}moi=1`).then(
                (v2) => setSt((s) => ({ ...s, [ten]: v2 })),
                () => {}
              );
            }, 8000);
          }
        },
        (e) => setSt((s) => ({ ...s, loi: { ...s.loi, [ten]: e.message }, dangDoc: { ...s.dangDoc, [ten]: false } }))
      );
    };
    nhan('hqs', `${cfgHqs.endpoint || '/api/cpv'}?${sheetQuery(cfgHqs)}`);
    nhan('rito', `/api/ritokey?${sheetQuery(cfgRito)}`);
    nhan('qltt', `/api/qltt?${sheetQuery(cfgQltt)}`);
    if (cfgA10) nhan('a10', `/api/a10gg?${sheetQuery(cfgA10)}`);
    if (cfgCh) nhan('ch', `/api/charging?${sheetQuery(cfgCh)}`);
  }, [cfgHqs, cfgRito, cfgQltt, cfgA10, cfgCh]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const agg = useMemo(() => {
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

    /* ---- QLTT: file đã cho sẵn GMV và COGS theo ngày × team.
       Team trên file là VX101 / WGG, đổi sang mã đơn vị của PKT21 · PKT22. */
    const DON_VI_QLTT = { VX101: 'HQC100', WGG: 'HQSC200' };
    const qlttRows = trongKy(st.qltt?.qltt_ngay || [], range).map((r) => ({
      ngay: r.ngay,
      team: `${DON_VI_QLTT[r.team] || r.team} · QLTT`,
      so_don: r.so_don || 0,
      gmv: cheDo === 'vi' ? null : r.gmv || 0,
      /* File QLTT ghi RE = GMV (chưa tách khoản giảm trừ) */
      re: r.gmv || 0,
      co: r.cogs || 0,
    }));

    /* ---- A10GG: báo cáo kết quả kinh doanh THEO THÁNG.
       Chỉ nhận các tháng THẬT (/api/a10gg đã loại tháng dự trù). Số được
       ghi vào ngày cuối tháng nên lọc theo kỳ vẫn ăn đúng tháng.
       File A10GG không tách GMV riêng — lấy luôn RE làm GMV để cột GMV
       của bảng tập đoàn đồng nhất, không bị hụt một đơn vị. Với A10GG thì
       GMV = RE nên tỉ lệ nào tính trên GMV cũng bằng tính trên RE.
       Số đơn vẫn để 0 vì file không ghi số đơn. */
    const a10Rows = trongKy(st.a10?.a10gg_thang || [], range).map((r) => ({
      ngay: r.ngay,
      team: 'A10GG',
      so_don: 0,
      gmv: cheDo === 'vi' ? null : r.gmv ?? r.re ?? 0,
      re: r.re || 0,
      co: r.co || 0,
    }));

    /* ---- Charging: cũng là KQKD theo THÁNG. /api/charging đã loại các
       tháng chưa tới (chỉ có chi phí ghi trước, chưa có doanh thu). */
    const chRows = trongKy(st.ch?.charging_thang || [], range).map((r) => ({
      ngay: r.ngay,
      team: 'Charging',
      so_don: 0,
      gmv: cheDo === 'vi' ? null : r.gmv ?? r.re ?? 0,
      re: r.re || 0,
      co: r.co || 0,
    }));

    /* Cột Nguồn nói luôn tình trạng đọc để không nhầm "đang tải" với "bằng 0" */
    const trangThai = (dang, loi) => (dang ? ' — đang đọc…' : loi ? ' — lỗi đọc' : '');
    const nguonHqs =
      (cheDo === 'vi' ? 'Lịch sử ví (đã sau phí sàn)' : 'BE · đơn hàng') +
      trangThai(st.dangDoc?.hqs, st.loi?.hqs);
    const nguonRito =
      (cheDo === 'vi' ? 'BE · Daily.Report (chưa có ví)' : 'BE · Daily.Report') +
      trangThai(st.dangDoc?.rito, st.loi?.rito);
    const nguonQltt =
      (cheDo === 'vi' ? 'Báo cáo QLTT (chưa có ví)' : 'Báo cáo kinh doanh QLTT') +
      trangThai(st.dangDoc?.qltt, st.loi?.qltt);
    /* Nói rõ A10GG theo tháng + trễ 45 ngày ngay trên cột Nguồn, vì đây là
       lý do khiến tháng vừa qua nhìn như mất doanh thu. */
    const nguonA10 =
      `KQKD theo tháng · GMV = RE · tiền về chậm ~${st.a10?.meta?.tre_ngay ?? 45} ngày` +
      trangThai(st.dangDoc?.a10, st.loi?.a10);
    const nguonCh =
      'KQKD theo tháng · GMV = RE' + trangThai(st.dangDoc?.ch, st.loi?.ch);

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
      chuanHoa(gop(qlttRows, 'QLTT (C100 + C200)', nguonQltt)),
      chuanHoa(gop(a10Rows, 'A10GG', nguonA10)),
      chuanHoa(gop(chRows, 'Charging', nguonCh)),
      ...CHUA_NOI.map((x) => chuanHoa({ ...x, so_don: 0, gmv: cheDo === 'vi' ? null : 0, re: 0, co: 0 })),
    ];

    /* ---- So sánh theo TEAM ---- */
    const mTeam = new Map();
    for (const r of [...hqsRows, ...ritoRows, ...qlttRows, ...a10Rows, ...chRows]) {
      const dv = r.team === 'C300 · Ritokey' ? 'Ritokey (C300)'
        : r.team === 'A10GG' ? 'A10GG'
        : r.team === 'Charging' ? 'Charging'
        : r.team.endsWith('· QLTT') ? 'QLTT (C100 + C200)' : 'HQS10000';
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
    for (const r of [...hqsRows, ...ritoRows, ...qlttRows, ...a10Rows, ...chRows]) {
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

  const dangDoc = [st.dangDoc?.hqs ? 'HQS' : null, st.dangDoc?.rito ? 'Ritokey' : null,
    st.dangDoc?.qltt ? 'QLTT' : null, cfgA10 && st.dangDoc?.a10 ? 'A10GG' : null,
    cfgCh && st.dangDoc?.ch ? 'Charging' : null].filter(Boolean);
  const canhBao = [];
  if (st.loi?.hqs) canhBao.push(`chưa đọc được số HQS — ${st.loi.hqs}`);
  if (st.loi?.rito) canhBao.push(`chưa đọc được số Ritokey — ${st.loi.rito}`);
  if (st.loi?.qltt) canhBao.push(`chưa đọc được số QLTT — ${st.loi.qltt}`);
  if (st.loi?.a10) canhBao.push(`chưa đọc được số A10GG — ${st.loi.a10}`);
  if (st.loi?.ch) canhBao.push(`chưa đọc được số Charging — ${st.loi.ch}`);
  /* Tháng chưa tới của Charging chỉ có chi phí ghi trước — nói ra để không
     ai thắc mắc vì sao số trên trang thấp hơn số cộng tay trên file. */
  const chChuaToi = st.ch?.meta?.thang_chua_toi;
  if (chChuaToi?.length) {
    canhBao.push(`Charging: đã loại ${chChuaToi.length} tháng chưa tới (${chChuaToi.join(', ')}) khỏi tổng tập đoàn`);
  }
  /* Tháng dự trù bị loại khỏi tổng — nói ra để không ai thắc mắc vì sao
     số A10GG trên trang thấp hơn số trên file. */
  const thangDuTru = st.a10?.meta?.thang_du_tru;
  if (thangDuTru?.length) {
    canhBao.push(`A10GG: đã loại ${thangDuTru.length} tháng dự trù (${thangDuTru.join(', ')}) khỏi tổng tập đoàn`);
  }
  /* /api/cpv vẫn trả 200 khi đọc HỤT MỘT FILE (các file còn lại vẫn có số),
     nên phải soi meta chứ không chỉ bắt lỗi mạng — nếu không, thiếu hẳn một
     tháng mà trang vẫn im như không có chuyện gì. */
  const mHqs = st.hqs?.meta;
  if (mHqs?.main_error) {
    canhBao.push(`THIẾU MỘT FILE ĐƠN HÀNG HQS (${mHqs.main_error}) — số HQS hiện chỉ có từ ${mHqs.from || '?'} đến ${mHqs.to || '?'}`);
  }
  if (mHqs?.api_error) canhBao.push(`chưa gồm file API sàn (${mHqs.api_error})`);
  /* Bản lấy từ bộ nhớ đệm: nói rõ số cũ bao lâu để không nhầm là số vừa đọc */
  const bnHqs = mHqs?.bo_nho;
  if (bnHqs?.dang_lam_moi) {
    const p = Math.round(bnHqs.tuoi_giay / 60);
    canhBao.push(`số HQS đang là bản lưu ${p ? `${p} phút trước` : 'vừa nãy'}, đang đọc lại nền`);
  }
  if (bnHqs?.loi_doc_moi) canhBao.push(`lượt đọc mới nhất của HQS hỏng (${bnHqs.loi_doc_moi}) — đang hiện bản lưu gần nhất`);
  const mRito = st.rito?.meta;
  if (mRito?.loi_doc_live) canhBao.push(`Ritokey chưa đọc được tháng đang chạy (${mRito.loi_doc_live})`);
  const mQltt = st.qltt?.meta;
  if (mQltt?.loi_doc_live) canhBao.push(`QLTT chưa đọc được tháng đang chạy (${mQltt.loi_doc_live})`);

  /* File đơn hàng HQS khá lớn nên phải nói rõ đang đọc, tránh nhìn bảng 0
     lại tưởng là không có dữ liệu */
  if (dangDoc.length) {
    return (
      <div className="notice-amber" style={{ marginBottom: 18 }}>
        <b>Đang đọc số {dangDoc.join(' và ')}…</b> File đơn hàng HQS khá lớn, lần mở đầu tiên có thể mất vài chục giây.
        Các con số bên dưới sẽ tự điền khi đọc xong.
        {canhBao.length ? <> {' · '} {canhBao.join(' · ')}</> : null}
      </div>
    );
  }

  if (!st.hqs && !st.rito && !st.qltt && !st.a10 && !st.ch) {
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
      <b>Tổng hợp chưa đủ tập đoàn:</b> HQ Thailand chưa nối nguồn số liệu nên đang tính bằng 0.
      {cheDo === 'vi'
        ? ' Bản theo VÍ không có khái niệm GMV (tiền về ví đã sau phí sàn) nên cột GMV để trống; Ritokey chưa có sổ ví nên vẫn lấy số BE.'
        : ' Với HQS, RE = GMV − phí sàn; với Ritokey, RE là dòng Doanh thu của file (GMV của Ritokey gồm cả đơn hoàn hủy); với QLTT, file ghi RE = GMV và CO đã gồm cả khoản phải trả CTV ngoài.'}
      {canhBao.length ? (
        <>
          {' · '}
          {canhBao.join(' · ')}
          {' · '}
          <button className="btn" onClick={load} style={{ marginLeft: 4 }}>Đọc lại</button>
        </>
      ) : null}
    </div>
  );
}
