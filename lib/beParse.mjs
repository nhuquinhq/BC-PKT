/* ============================================================
   BÓC BẢNG ĐƠN HÀNG (file CPV BE · file Quản lý đơn hàng · file API sàn)
   → danh sách từng đơn đã chuẩn hoá, rồi gộp theo ngày × sàn × SPDV.

   Tách khỏi app/api/cpv/route.js để scripts/chup-be.mjs chụp ảnh tháng
   đang chạy dùng ĐÚNG bộ luật này. Mỗi nơi một bản là kiểu sai lệch âm
   thầm: cùng một file mà web ra số này, ảnh chụp ra số khác, không bên
   nào báo lỗi. lib/viParse.mjs tách ra vì đúng lý do đó.

   Vì sao phải chụp file BE: đo ngày 06/10 trên file BE T10, QUA VERCEL
   thì bản công bố 0/2 lượt và export 0/2 lượt, lượt nào cũng HTTP 400
   sau 240s; từ GitHub thì export ra 1/3 lượt trong 100s. Web không đọc
   nổi, còn job chạy nền thì có cả tiếng để thử lại.

   .mjs chứ không phải .js: package.json không đặt type:module nên node
   đọc .js là CommonJS, mà scripts/chup-be.mjs chạy bằng node trần.
   ============================================================ */

import { spdvOf } from './spdv.mjs';

export const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

export function viNum(raw) {
  let s = String(raw ?? '').trim().replace(/\s/g, '').replace(/%$/, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

const DATE_ISO = /(\d{4})-(\d{1,2})-(\d{1,2})/;
const DATE_VN = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
export function parseDate(cell) {
  const s = String(cell ?? '');
  let m = s.match(DATE_ISO);
  if (m) return { y: m[1], m: m[2].padStart(2, '0'), d: m[3].padStart(2, '0') };
  m = s.match(DATE_VN);
  if (m) return { y: m[3], m: m[2].padStart(2, '0'), d: m[1].padStart(2, '0') };
  return null;
}

export function findCol(headers, candidates) {
  for (const c of candidates) {
    const contains = c.startsWith('~');
    const key = contains ? c.slice(1) : c;
    const i = headers.findIndex((h) => (contains ? h.includes(key) : h === key));
    if (i >= 0) return i;
  }
  return -1;
}

export const statusClass = (raw) => {
  const st = norm(raw);
  if (!st || st.includes('hoan tat') || st.includes('hoan thanh') || st.includes('complete') || st.includes('success')) return 'ok';
  if (st.includes('hoan')) return 'huy';
  if (st.includes('huy') || st.includes('refund') || st.includes('cancel')) return 'huy';
  if (st.includes('that bai') || st.includes('fail') || st.includes('loi')) return 'fail';
  return 'other';
};

/* Đọc một lưới CSV đơn hàng → danh sách đơn đã chuẩn hoá.
   defaultSan: file API theo sàn có thể không có cột Sàn. */
export function parseOrders(grid, { defaultSan = '' } = {}) {
  let headIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(grid.length, 40); i++) {
    const h = (grid[i] || []).map(norm);
    if (h.includes('order id') || h.includes('order_id') || h.includes('ma don') || (h.some((x) => x === 'san') && h.some((x) => x.startsWith('doanh thu')))) {
      headIdx = i;
      headers = h;
      break;
    }
  }
  if (headIdx < 0) throw new Error('Không tìm thấy dòng tiêu đề bảng đơn hàng.');

  /* File có thể có nhiều cột trùng tên "Giá Vốn" (cột phụ đối soát NCC…).
     Cột giá vốn THẬT là cột đứng ngay trước cột Lợi Nhuận (AJ→AK);
     không tìm được mới rơi về cột cuối cùng. */
  const giaVonIdx = headers.reduce((acc, h, i) => (h === 'gia von' ? [...acc, i] : acc), []);
  const loiNhuanIdx = headers.indexOf('loi nhuan');
  const giaVonPick =
    giaVonIdx.length > 1
      ? giaVonIdx.find((i) => i === loiNhuanIdx - 1) ?? giaVonIdx[giaVonIdx.length - 1]
      : giaVonIdx[0] ?? -1;
  const col = {
    id: findCol(headers, ['order id', 'order_id', 'ma don', '~order id', '~ma don hang', 'id don', '~id don']),
    san: findCol(headers, ['san', '~san giao dich']),
    doanh_thu_usd: findCol(headers, ['doanh thu', '~doanh thu']),
    phi_san: findCol(headers, ['phi', '~phi san', '~phi']),
    dthu_thuc: findCol(headers, ['~thuc nhan', '~doanh thu thuan']),
    gia_von_usd: giaVonIdx[0] ?? -1,
    gia_von: giaVonPick,
    /* Cột DOANH THU BẰNG VND. File BE gọi là "Thành tiền", bản Quản lý đơn
       hàng gọi là "Doanh thu quy đổi" — cùng một thứ. Nhận diện thiếu tên thứ
       hai thì route tưởng nguồn chưa có VND rồi tự quy đổi lần nữa, mà giá vốn
       file đó đã là VND nên nhân tỷ giá thêm lượt nữa là sai bét. */
    thanh_tien: findCol(headers, ['thanh tien', '~thanh tien', '~doanh thu quy doi', '~quy doi']),
    loi_nhuan: findCol(headers, ['loi nhuan', '~loi nhuan']),
    trang_thai: findCol(headers, ['trang thai', '~trang thai', 'status']),
    ngay_hoan_tat: findCol(headers, ['ngay hoan tat', '~ngay hoan tat', '~hoan tat luc', '~ngay hoan thanh', '~completed']),
    ngay_tao: findCol(headers, ['ngay tao', '~ngay tao', '~created']),
    bu: findCol(headers, ['bu', '~khoi kd']),
    dich_vu: findCol(headers, ['loai dich vu', 'dich vu', '~loai dich vu', '~dich vu']),
    game: findCol(headers, ['game']),
    san_pham: findCol(headers, ['~san pham']),
    /* File CPV BE 08/2026 có 2 cột "Tỷ giá tuần" (CO Rate · REV Rate) —
       lấy cột CUỐI (REV Rate) vì dùng để quy đổi DOANH THU USD → VND.
       Tên trường là ty_gia_re chứ không phải ty_gia_co: CO Rate là tỷ giá
       GIÁ VỐN, nằm ở cột trước, và KHÔNG dùng ở đây. */
    ty_gia_re: headers.reduce((acc, h, i) => (h.includes('ty gia tuan') ? i : acc), -1),
  };
  /* Mọi cột mang tên "Tỷ giá tuần". Đẳng thức kiểm cột ở dưới thử TỪNG cột
     rồi lấy cột khớp nhiều nhất, chứ không chỉ thử cột ty_gia_re.
     Vì sao: đo 06/10 trên file BE T10 (khuôn live 49 cột) thì hai cột tỷ giá
     nằm ở [35] và [36]; lấy cột cuối như quy ước từ T8 chỉ khớp 1.212/2.088
     dòng (58%), thừa đủ để chốt báo đỏ dù tiền trong file không hề sai — số
     Thành tiền đọc THẲNG từ cột của file, không nhân tỷ giá, nên chọn sai cột
     tỷ giá không làm lệch một đồng nào. Để chốt bắt đúng cái nó cần bắt
     (lấy nhầm cột Thành tiền / DThu thực nhận) thì phải thử cả hai. */
  const cotTyGia = headers.reduce((acc, h, i) => (h.includes('ty gia tuan') ? [...acc, i] : acc), []);
  if (col.san < 0 && !defaultSan) throw new Error('Không tìm thấy cột Sàn.');
  if (col.ngay_hoan_tat < 0 && col.ngay_tao < 0) throw new Error('Không tìm thấy cột ngày.');

  const rows = [];
  let skipNoDate = 0;
  let skipStatus = 0;
  /* HAI ĐẲNG THỨC TỪNG DÒNG để tự chứng minh đã lấy ĐÚNG cột tiền:
       DThu thực nhận × Tỷ giá tuần = Thành tiền
       Thành tiền − Giá Vốn        = Lợi Nhuận
     Lấy nhầm một cột số khác thì đẳng thức vỡ ngay, trong khi tổng tiền vẫn
     trông đẹp và không có gì báo. Đo trên file BE T9: 18.556/18.556 và
     18.026/18.026 dòng, tức 100% cả hai. scripts/chup-be.mjs dùng hai tỉ lệ
     này làm chốt trước khi ghi vào datalake. */
  const khopTheoCot = cotTyGia.map(() => 0);
  let thuTyGia = 0;
  let khopLn = 0;
  let thuLn = 0;
  for (let i = headIdx + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    const san = col.san >= 0 ? String(r[col.san] ?? '').trim() : defaultSan;
    if (!san) continue;

    const sc = col.trang_thai >= 0 ? statusClass(r[col.trang_thai]) : 'ok';
    if (sc === 'other') { skipStatus++; continue; }

    let dt = parseDate(col.ngay_hoan_tat >= 0 ? r[col.ngay_hoan_tat] : '');
    if (!dt && col.ngay_tao >= 0 && sc !== 'ok') dt = parseDate(r[col.ngay_tao]);
    if (!dt) { skipNoDate++; continue; }

    const rec = {
      id: col.id >= 0 ? String(r[col.id] ?? '').trim() : '',
      san,
      bu: col.bu >= 0 ? String(r[col.bu] ?? '').trim().toUpperCase() : '',
      spdv: spdvOf(col.dich_vu >= 0 ? r[col.dich_vu] : '', col.game >= 0 ? r[col.game] : '', col.san_pham >= 0 ? r[col.san_pham] : ''),
      sc,
      ngay: `${dt.d}/${dt.m}/${dt.y}`,
      sortKey: `${dt.y}${dt.m}${dt.d}`,
      doanh_thu_usd: 0,
      phi_san: 0,
      phi_san_vnd: 0,
      dthu_thuc: 0,
      thanh_tien: 0,
      gia_von: 0,
      loi_nhuan: 0,
    };
    if (sc === 'ok') {
      rec.ty_gia_tuan = col.ty_gia_re >= 0 ? viNum(r[col.ty_gia_re]) : 0;
      const doanhThuUsd = col.doanh_thu_usd >= 0 ? viNum(r[col.doanh_thu_usd]) : 0;
      const phiSan = col.phi_san >= 0 ? viNum(r[col.phi_san]) : 0;
      const dthuThuc = col.dthu_thuc >= 0 ? viNum(r[col.dthu_thuc]) : doanhThuUsd - phiSan;
      const thanhTien = col.thanh_tien >= 0 ? viNum(r[col.thanh_tien]) : 0;
      const giaVon = col.gia_von >= 0 ? viNum(r[col.gia_von]) : 0;
      rec.doanh_thu_usd = doanhThuUsd;
      rec.phi_san = phiSan;
      rec.dthu_thuc = dthuThuc;
      rec.thanh_tien = thanhTien;
      rec.gia_von = giaVon;
      rec.loi_nhuan = col.loi_nhuan >= 0 ? viNum(r[col.loi_nhuan]) : thanhTien - giaVon;
      rec.phi_san_vnd = dthuThuc > 0 ? phiSan * (thanhTien / dthuThuc) : 0;
      if (thanhTien > 0 && dthuThuc > 0 && cotTyGia.length) {
        thuTyGia += 1;
        for (let k = 0; k < cotTyGia.length; k++) {
          const tg = viNum(r[cotTyGia[k]]);
          if (tg > 0 && Math.abs(dthuThuc * tg - thanhTien) / thanhTien <= 0.001) khopTheoCot[k] += 1;
        }
      }
      const lnRaw = col.loi_nhuan >= 0 ? String(r[col.loi_nhuan] ?? '').trim() : '';
      if (thanhTien > 0 && giaVon !== 0 && lnRaw) {
        const ln = viNum(lnRaw);
        thuLn += 1;
        if (Math.abs(thanhTien - giaVon - ln) <= Math.max(Math.abs(ln) * 0.001, 1)) khopLn += 1;
      }
    }
    rows.push(rec);
  }
  return {
    rows,
    meta: {
      header_row: headIdx + 1,
      gia_von_found: col.gia_von >= 0,
      /* Nguồn thô (Báo cáo đơn hàng V3) không có cột Thành tiền lẫn cột tỷ
         giá — docLive sẽ quy đổi USD → VND bằng bảng tỷ giá tuần trong
         lib/data. Ghi lại ở đây để bên gọi biết số VND là quy đổi. */
      co_thanh_tien: col.thanh_tien >= 0,
      co_ty_gia: col.ty_gia_re >= 0,
      skipNoDate,
      skipStatus,
      /* khopTyGia lấy cột khớp NHIỀU NHẤT; cotTyGia/khopTheoCot để log nói
         được cột nào khớp bao nhiêu khi chốt báo đỏ. */
      khopTyGia: khopTheoCot.length ? Math.max(...khopTheoCot) : 0,
      thuTyGia,
      cotTyGia,
      khopTheoCot,
      khopLn,
      thuLn,
      col,
    },
  };
}

export function aggregate(rows) {
  const agg = new Map();
  for (const r of rows) {
    const key = `${r.sortKey}|${r.san}|${r.spdv}|${r.nguon || ''}`;
    if (!agg.has(key)) {
      agg.set(key, {
        ngay: r.ngay,
        sortKey: r.sortKey,
        san: r.san,
        spdv: r.spdv,
        bu: r.bu,
        nguon: r.nguon || 'dh',
        so_don: 0,
        don_fail: 0,
        don_huy: 0,
        nc_don: 0,
        nc_gmv: 0,
        doanh_thu_usd: 0,
        phi_san: 0,
        phi_san_vnd: 0,
        dthu_thuc: 0,
        thanh_tien: 0,
        gia_von: 0,
        loi_nhuan: 0,
      });
    }
    const a = agg.get(key);
    if (!a.bu && r.bu) a.bu = r.bu;
    if (r.sc === 'fail') { a.don_fail += 1; continue; }
    if (r.sc === 'huy') { a.don_huy += 1; continue; }
    a.so_don += 1;
    if (r.nc) { a.nc_don += 1; a.nc_gmv += r.thanh_tien; }
    a.doanh_thu_usd += r.doanh_thu_usd;
    a.phi_san += r.phi_san;
    a.phi_san_vnd += r.phi_san_vnd;
    a.dthu_thuc += r.dthu_thuc;
    a.thanh_tien += r.thanh_tien;
    a.gia_von += r.gia_von;
    a.loi_nhuan += r.loi_nhuan;
  }
  return [...agg.values()].sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
}
