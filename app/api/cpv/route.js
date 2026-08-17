/* ============================================================
   API tổng hợp Doanh thu – Giá vốn cho PKT8 (đa nguồn):
   - Nguồn chính: file "Giá Vốn HQS10000 - BE" tab Data (mọi sàn).
   - Nguồn phụ (tuỳ chọn, url2/gid2): file "Báo cáo đơn hàng tự động"
     lấy trực tiếp từ sàn (hiện chỉ có G1, G2) — cùng layout cột với
     file BE nhưng tiền tệ toàn bộ là USD (Doanh thu / Phí sàn /
     DThu thực nhận / Giá vốn cột X); không có Thành tiền VND, BU.
     File BE ưu tiên: đơn API trùng Order ID sẽ bị loại.
   Server đọc, lọc, gộp theo (Ngày hoàn tất × Sàn × SPDV) rồi trả
   bản compact cho trình duyệt.
   ============================================================ */

import Papa from 'papaparse';
import { spdvOf, teamOf, SAN_BU_MAP } from '@/lib/cpvDims';
import { nhoDoc, nhoDocFile } from '@/lib/boNho';
import { tyGiaRe, TY_GIA_CAP_NHAT } from '@/lib/tyGia';
/* "Datalake" tháng đã chốt sổ: dữ liệu đã gộp sẵn (Ngày × Sàn × SPDV) đóng gói
   tĩnh theo app — không phải đọc lại Google Sheet các tháng cũ ở mỗi lượt xem.
   Sinh file bằng chính API này (xem README trong lib/data nếu cần làm lại). */
import histT1 from '@/lib/data/cpv-2026-01.json';
import histT2 from '@/lib/data/cpv-2026-02.json';
import histT3 from '@/lib/data/cpv-2026-03.json';
import histT4 from '@/lib/data/cpv-2026-04.json';
import histT5 from '@/lib/data/cpv-2026-05.json';
import histT6 from '@/lib/data/cpv-2026-06.json';

const HIST = [histT1, histT2, histT3, histT4, histT5, histT6];

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

function viNum(raw) {
  let s = String(raw ?? '').trim().replace(/\s/g, '').replace(/%$/, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

const DATE_ISO = /(\d{4})-(\d{1,2})-(\d{1,2})/;
const DATE_VN = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
function parseDate(cell) {
  const s = String(cell ?? '');
  let m = s.match(DATE_ISO);
  if (m) return { y: m[1], m: m[2].padStart(2, '0'), d: m[3].padStart(2, '0') };
  m = s.match(DATE_VN);
  if (m) return { y: m[3], m: m[2].padStart(2, '0'), d: m[1].padStart(2, '0') };
  return null;
}

function toCsvUrl(sheetUrl, gid) {
  try {
    const u = new URL(sheetUrl);
    if (!u.hostname.includes('docs.google.com')) return null;
    const pub = u.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)/);
    /* single=true là BẮT BUỘC: thiếu nó Google hiểu là xuất CẢ WORKBOOK chứ
       không phải một tab, nên với file nhiều tab lớn thì trả HTTP 500 hoặc
       treo quá 90s. Đã đo được đúng lỗi này ở file BE T8 và file ví T8. */
    if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?gid=${gid || u.searchParams.get('gid') || '0'}&single=true&output=csv`;
    const m = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid || '0'}`;
    return null;
  } catch {
    return sheetUrl; // URL CSV trực tiếp (mock/test)
  }
}

function findCol(headers, candidates) {
  for (const c of candidates) {
    const contains = c.startsWith('~');
    const key = contains ? c.slice(1) : c;
    const i = headers.findIndex((h) => (contains ? h.includes(key) : h === key));
    if (i >= 0) return i;
  }
  return -1;
}

const statusClass = (raw) => {
  const st = norm(raw);
  if (!st || st.includes('hoan tat') || st.includes('hoan thanh') || st.includes('complete') || st.includes('success')) return 'ok';
  if (st.includes('hoan')) return 'huy';
  if (st.includes('huy') || st.includes('refund') || st.includes('cancel')) return 'huy';
  if (st.includes('that bai') || st.includes('fail') || st.includes('loi')) return 'fail';
  return 'other';
};

/* Google hay trả 400/500 hoặc treo khi xuất CSV file lớn.

   Hạn chờ 90s và CHỈ thử lại khi lỗi là tạm thời. Đo ngày 12/08 cho thấy
   file nào Google xuất được thì xuất rất nhanh (BE T7: 9,6 MB trong 4,4s),
   còn file nào hỏng thì hỏng hẳn — BE T8 chạy đủ 240s rồi trả HTTP 400,
   lượt sau trả 410 ngay. Đợi hết giờ thêm lượt nữa chỉ tổ treo trang, nên
   gặp hết giờ là dừng luôn; kết hợp với việc nhớ lỗi ở lib/boNho.js thì
   mỗi 5 phút chỉ đúng một lượt phải trả giá. */
const HAN_CHO = [90000, 90000];
/* Có nhớ theo từng file: PKT8, PKT20, các trang team và trang sàn đều đọc
   đúng những file này, chưa kể PKT10/PKT15 cần dữ liệu từng đơn. Nhớ ở đây
   thì cả nhóm dùng chung một lượt tải — xem lib/boNho.js. */
/* vet: mảng thu thập tình trạng đọc từng file, để GET nói được số đang hiện
   lấy từ bản nhớ bao lâu rồi. Không có nó thì Google hỏng cả buổi mà trang
   vẫn hiện số cũ y như số mới — đúng vụ bot bắn 18h và 23h ra cùng một số. */
async function loadGrid(url, gid, luot = 2, vet = null) {
  const csvUrl = toCsvUrl(url, gid) || url;
  const kq = await nhoDocFile(`cpv-file|${csvUrl}`, async () => {
    let loiCuoi = null;
    for (let i = 0; i < luot; i++) {
      if (i) await new Promise((ok) => setTimeout(ok, i * 2000));
      const han = HAN_CHO[Math.min(i, HAN_CHO.length - 1)];
      try {
        const res = await fetch(csvUrl, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(han) });
        if (!res.ok) throw new Error(`Google trả về HTTP ${res.status}`);
        const text = await res.text();
        if (text.trim().startsWith('<')) throw new Error('Nhận về HTML thay vì CSV — kiểm tra Publish to web và GID.');
        return text;
      } catch (e) {
        if (e.name === 'TimeoutError') {
          throw new Error(`Google không xuất nổi file này trong ${han / 1000}s — nhiều khả năng phải xuất bản lại hoặc làm nhẹ tab`);
        }
        loiCuoi = e;
      }
    }
    throw loiCuoi;
  });
  if (vet) vet.push({ url: csvUrl, tuoi_giay: Math.round((kq.tuoi || 0) / 1000), loi: kq.loi || null });
  return Papa.parse(kq.val, { header: false, skipEmptyLines: false }).data;
}

/* Đọc một lưới CSV đơn hàng → danh sách đơn đã chuẩn hoá.
   defaultSan: file API theo sàn có thể không có cột Sàn. */
function parseOrders(grid, { defaultSan = '' } = {}) {
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
    thanh_tien: findCol(headers, ['thanh tien', '~thanh tien']),
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
  if (col.san < 0 && !defaultSan) throw new Error('Không tìm thấy cột Sàn.');
  if (col.ngay_hoan_tat < 0 && col.ngay_tao < 0) throw new Error('Không tìm thấy cột ngày.');

  const rows = [];
  let skipNoDate = 0;
  let skipStatus = 0;
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
    },
  };
}

function aggregate(rows) {
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

/* Đọc toàn bộ nguồn LIVE (file BE các tháng đang chạy + file API sàn) rồi
   chuẩn hoá thành danh sách từng đơn. Tách riêng khỏi GET để bọc được bộ
   nhớ đệm — xem lib/boNho.js. */
async function docLive({ urls, gids, url2s, gid2s, san2 }) {
  let mainRows = [];
  let mainMeta = {};
  const mainErrors = [];
  const vetFile = [];
  const loaded = await Promise.all(
    urls.map((u, i) =>
      loadGrid(u, gids[i] || '0', 2, vetFile)
        .then((grid) => ({ grid }))
        .catch((e) => ({ err: e }))
    )
  );
  let mainOkCount = 0;
  let quyDoiVnd = 0; /* số đơn phải tự quy đổi USD → VND vì file thiếu cột */
  let ngoaiBangTyGia = 0; /* đơn có ngày nằm trước mốc đầu của bảng tỷ giá */
  for (let i = 0; i < loaded.length; i++) {
    try {
      if (loaded[i].err) throw loaded[i].err;
      const p = parseOrders(loaded[i].grid);
      if (!mainOkCount) mainMeta = p.meta;
      mainOkCount += 1;
      /* Nguồn thô không có cột Thành tiền: quy đổi bằng TỶ GIÁ REV theo tuần
         trong lib/data/ty-gia-tuan.json. Giá vốn của nguồn này cũng là USD
         nên quy đổi cùng lượt, nếu không Lợi nhuận sẽ là VND trừ USD. */
      if (!p.meta.co_thanh_tien) {
        for (const r of p.rows) {
          if (r.sc !== 'ok') continue;
          const rate = tyGiaRe(r.sortKey);
          if (!rate) { ngoaiBangTyGia += 1; continue; }
          r.ty_gia_tuan = rate;
          r.thanh_tien = r.doanh_thu_usd * rate;
          r.gia_von = r.gia_von * rate;
          r.phi_san_vnd = r.phi_san * rate;
          r.loi_nhuan = r.thanh_tien - r.gia_von;
          quyDoiVnd += 1;
        }
      }
      mainRows = mainRows.concat(p.rows);
    } catch (e) {
      mainErrors.push(`file ${i + 1}: ${e.message}`);
    }
  }
  /* Chỉ chặn khi KHÔNG đọc được file nào; 1 file lỗi (vd file tháng mới
     chưa có dữ liệu) thì cảnh báo vàng và vẫn chạy các file còn lại */
  if (!mainOkCount) {
    throw new Error(`File tổng hợp: ${mainErrors.join(' · ')}`);
  }

  /* File API từ sàn (chỉ G1/G2): file BE ƯU TIÊN vì đã đối soát;
     API chỉ BỔ SUNG những đơn file BE còn thiếu (so theo Order ID, kể cả
     bỏ đuôi -1/-2), giới hạn trong khoảng ngày của file BE. */
  let apiRows = [];
  let apiAllRows = []; /* mọi đơn Hoàn Tất của file API — dùng cho bảng đối soát module */
  let apiMeta = null;
  let dedup = 0;
  let outOfRange = 0;
  const dupList = [];
  if (url2s.length) {
    const stripSuffix = (id) => id.replace(/-\d+$/, '');
    const mainIds = new Set();
    const mainById = new Map(); /* để trả danh sách đơn trùng kèm số phía BE */
    for (const r of mainRows) {
      if (!r.id) continue;
      mainIds.add(r.id);
      mainIds.add(stripSuffix(r.id));
      if (!mainById.has(r.id)) mainById.set(r.id, r);
      const s = stripSuffix(r.id);
      if (!mainById.has(s)) mainById.set(s, r);
    }
    const minKey = mainRows.reduce((m, r) => (m && m < r.sortKey ? m : r.sortKey), '');
    const maxKey = mainRows.reduce((m, r) => (m > r.sortKey ? m : r.sortKey), '');

    const apiErrors = [];
    const apiGrids = await Promise.all(
      url2s.map((u, i) =>
        loadGrid(u, gid2s[i] || '0', 2, vetFile)
          .then((grid) => ({ grid }))
          .catch((e) => ({ err: e }))
      )
    );
    for (let gi = 0; gi < apiGrids.length; gi++) {
      try {
        if (apiGrids[gi].err) throw apiGrids[gi].err;
        const p2 = parseOrders(apiGrids[gi].grid, { defaultSan: san2 });
        if (!apiMeta) apiMeta = p2.meta;
        apiAllRows = apiAllRows.concat(p2.rows.filter((r) => r.sc === 'ok'));

        for (const r of p2.rows) {
          if (minKey && (r.sortKey < minKey || r.sortKey > maxKey)) { outOfRange++; continue; }
          /* Đơn trùng Order ID với BE = đơn BÙ trả thiếu hàng cho khách:
             VẪN TÍNH doanh thu (không loại), chỉ ghi vào bảng đối soát. */
          if (r.id && (mainIds.has(r.id) || mainIds.has(stripSuffix(r.id)))) {
            dedup++;
            const m = mainById.get(r.id) || mainById.get(stripSuffix(r.id));
            if (dupList.length < 1000) {
              dupList.push({
                order_id: r.id,
                san: r.san,
                ngay: r.ngay,
                usd_api: r.doanh_thu_usd,
                order_id_be: m?.id || '',
                ngay_be: m?.ngay || '',
                usd_be: m?.doanh_thu_usd || 0,
                lech: r.doanh_thu_usd - (m?.doanh_thu_usd || 0),
              });
            }
          }
          apiRows.push(r);
        }
      } catch (e) {
        apiErrors.push(`file API ${gi + 1}: ${e.message}`);
      }
    }
    if (apiErrors.length) apiMeta = { ...(apiMeta || {}), error: apiErrors.join(' · ') };
  }

  /* Quy đổi VND cho đơn API (file sàn toàn USD: doanh thu, phí, giá vốn cột X):
     nhân với TỶ GIÁ TUẦN — đọc từ cột "Tỷ giá tuần" của file BE, theo ngày
     hoàn tất của đơn. Thiếu tỷ giá tuần mới rơi về tỷ giá suy từ doanh thu
     (Σ Thành tiền / Σ DThu thực nhận). */
  const twByDate = new Map();
  let twSum = 0;
  let twCnt = 0;
  const rateByDate = new Map();
  let sumTt = 0;
  let sumNet = 0;
  for (const r of mainRows) {
    if (r.sc !== 'ok') continue;
    if (r.ty_gia_tuan > 0) {
      if (!twByDate.has(r.sortKey)) twByDate.set(r.sortKey, r.ty_gia_tuan);
      twSum += r.ty_gia_tuan;
      twCnt += 1;
    }
    if (r.dthu_thuc <= 0 || r.thanh_tien <= 0) continue;
    const cur = rateByDate.get(r.sortKey) || { tt: 0, net: 0 };
    cur.tt += r.thanh_tien;
    cur.net += r.dthu_thuc;
    rateByDate.set(r.sortKey, cur);
    sumTt += r.thanh_tien;
    sumNet += r.dthu_thuc;
  }
  const overallTw = twCnt > 0 ? twSum / twCnt : 0;
  const overallRate = sumNet > 0 ? sumTt / sumNet : 0;

  /* Đối soát module: tổng SỐ GỐC của file API theo Ngày hoàn tất (cột Q) —
     tính TRƯỚC khi khử trùng, gộp theo ngày để trình duyệt lọc thời gian.
     Quy VND cùng công thức: nhân tỷ giá tuần. (Tính trước vòng quy đổi
     bên dưới vì các đơn bổ sung dùng chung object và sẽ bị đổi sang VND.) */
  const apiFileByDate = new Map();
  for (const r of apiAllRows) {
    const d0 = rateByDate.get(r.sortKey);
    const rate = twByDate.get(r.sortKey) || overallTw || (d0 && d0.net > 0 ? d0.tt / d0.net : overallRate);
    const a = apiFileByDate.get(r.sortKey) || { ngay: r.ngay, sortKey: r.sortKey, so_don: 0, doanh_thu_usd: 0, dthu_thuc: 0, thanh_tien: 0, gia_von: 0, loi_nhuan: 0 };
    a.so_don += 1;
    a.doanh_thu_usd += r.doanh_thu_usd;
    a.dthu_thuc += r.dthu_thuc;
    a.thanh_tien += r.dthu_thuc * rate;
    a.gia_von += r.gia_von * rate;
    a.loi_nhuan += (r.dthu_thuc - r.gia_von) * rate;
    apiFileByDate.set(r.sortKey, a);
  }
  const api_file = [...apiFileByDate.values()].sort((x, y) => (x.sortKey < y.sortKey ? -1 : 1));

  let apiNoCost = 0;
  for (const r of apiRows) {
    if (r.sc !== 'ok') continue;
    if (!r.gia_von) apiNoCost++; /* đơn Thủ công chưa điền giá vốn cột X */
    if (r.thanh_tien === 0) {
      const d = rateByDate.get(r.sortKey);
      const rate = twByDate.get(r.sortKey) || overallTw || (d && d.net > 0 ? d.tt / d.net : overallRate);
      r.thanh_tien = r.dthu_thuc * rate;
      r.gia_von = r.gia_von * rate;
      r.phi_san_vnd = r.phi_san * rate;
      r.loi_nhuan = r.thanh_tien - r.gia_von;
    }
  }

  /* Gắn BU cho dòng thiếu: học từ file BE theo sàn → map thủ công → tiền tố.
     nguon: module gốc của đơn — dh (Quản lý đơn hàng) / api (file API sàn). */
  const sanBu = new Map();
  for (const r of mainRows) if (r.bu && !sanBu.has(r.san)) sanBu.set(r.san, r.bu);
  let all = [...mainRows.map((r) => ({ ...r, nguon: 'dh' })), ...apiRows.map((r) => ({ ...r, nguon: 'api' }))].map((r) => ({
    ...r,
    bu: r.bu || sanBu.get(r.san) || SAN_BU_MAP[r.san] || (r.san.match(/^[A-Za-z]+/)?.[0] || r.san).toUpperCase(),
  }));

  /* Đánh dấu đơn CHƯA TÌM ĐƯỢC GIÁ VỐN (PKT10): đơn BE Hoàn Tất có doanh thu
     mà Giá Vốn = 0 — đếm song song với tổng để tính tỉ lệ đơn không CO / tổng. */
  all = all.map((r) => ({
    ...r,
    nc: r.nguon === 'dh' && r.sc === 'ok' && r.thanh_tien > 0 && !r.gia_von ? 1 : 0,
  }));

  return { all, api_file, dupList, mainMeta, apiMeta, dedup, outOfRange, apiNoCost, mainErrors, sanBu, vetFile, quyDoiVnd, ngoaiBangTyGia };
}

/* Bản GỌN để cất vào bộ nhớ đệm: đã gộp theo Ngày × Sàn × SPDV nên nhẹ hơn
   danh sách từng đơn vài chục lần, mà mọi bảng của trang đều chỉ cần bản này.
   Danh sách từng đơn (raw / nocost) vẫn phải đọc đủ nên không đi đường này. */
function goiGon(kq) {
  const dem = (loc) => kq.all.reduce((n, r) => n + (loc(r) ? 1 : 0), 0);
  return {
    detail: aggregate(kq.all),
    api_file: kq.api_file,
    dup_list: kq.dupList,
    san_bu: [...kq.sanBu.entries()],
    meta: {
      ...kq.mainMeta,
      rows_used: dem((r) => r.sc === 'ok'),
      don_fail: dem((r) => r.sc === 'fail'),
      don_huy: dem((r) => r.sc === 'huy'),
      main_used: dem((r) => r.nguon === 'dh' && r.sc === 'ok'),
      api_used: dem((r) => r.nguon === 'api' && r.sc === 'ok'),
      api_no_cost: kq.apiNoCost,
      api_error: kq.apiMeta?.error || null,
      main_error: kq.mainErrors.length ? kq.mainErrors.join(' · ') : null,
      dedup_removed: kq.dedup,
      api_out_of_range: kq.outOfRange,
      /* Tuổi bản nhớ của file GIÀ NHẤT trong lượt đọc này. Google xuất hụt
         thì lib/boNho.js trả bản cũ tới 6 tiếng — không ghi ra đây thì số cũ
         trông y hệt số mới. */
      nguon_cu_giay: kq.vetFile?.length ? Math.max(...kq.vetFile.map((v) => v.tuoi_giay || 0)) : 0,
      nguon_loi: kq.vetFile?.map((v) => v.loi).filter(Boolean).join(' · ') || null,
      /* Số VND là quy đổi từ USD bằng bảng tỷ giá tuần chứ không đọc thẳng
         từ file — nói ra để đối chiếu lệch với sổ kế toán còn biết đường tra. */
      quy_doi_vnd: kq.quyDoiVnd || 0,
      ty_gia_cap_nhat: kq.quyDoiVnd ? TY_GIA_CAP_NHAT : null,
      ngoai_bang_ty_gia: kq.ngoaiBangTyGia || 0,
    },
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  /* Nguồn chính có thể gồm NHIỀU file cùng form (mỗi tháng một file):
     truyền lặp ?url=...&gid=...&url=...&gid=... — file đầu là file chủ đạo. */
  const urls = searchParams.getAll('url');
  const gids = searchParams.getAll('gid');
  /* File API sàn cũng có thể nhiều file theo tháng: lặp url2/gid2 */
  const url2s = searchParams.getAll('url2');
  const gid2s = searchParams.getAll('gid2');
  const san2 = searchParams.get('san2') || ''; // sàn mặc định cho file API nếu thiếu cột Sàn
  /* nocost=1 (PKT10): chỉ giữ đơn Hoàn Tất CHƯA TÌM ĐƯỢC GIÁ VỐN (có doanh thu, giá vốn = 0) */
  const nocost = searchParams.get('nocost') === '1';
  const raw = searchParams.get('raw') === '1';
  /* moi=1: bỏ qua bản đang nhớ, đọc lại Google cho bằng được. Trình duyệt
     dùng tham số này để lấy số mới sau khi đã hiện bản cũ. */
  const moi = searchParams.get('moi') === '1';
  if (!urls.length) return Response.json({ error: 'Thiếu url' }, { status: 400 });

  const thamSo = { urls, gids, url2s, gid2s, san2 };
  const khoa = `cpv|${urls.join(',')}|${gids.join(',')}|${url2s.join(',')}|${gid2s.join(',')}|${san2}`;

  let goi = null;
  let noCostList = null;
  let boNho = null;

  if (raw || nocost) {
    /* PKT10 và PKT15 cần dữ liệu TỪNG ĐƠN nên phải đọc đủ, không dùng bản gộp.
       Từng file CSV vẫn có bộ nhớ riêng nên thường cũng không phải tải lại. */
    let kq;
    try {
      kq = await docLive(thamSo);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 502 });
    }
    if (raw) {
      const teamF = searchParams.get('team') || '';
      const sanF = searchParams.get('san') || '';
      let raws = kq.all;
      if (sanF) raws = raws.filter((r) => r.san === sanF);
      if (teamF) raws = raws.filter((r) => teamOf(r.bu) === teamF);
      return Response.json({
        raw: raws.slice(0, 60000).map((r) => ({
          ngay: r.ngay,
          sortKey: r.sortKey,
          id: r.id,
          san: r.san,
          bu: r.bu,
          spdv: r.spdv,
          nguon: r.nguon,
          sc: r.sc,
          doanh_thu_usd: r.doanh_thu_usd,
          thanh_tien: r.thanh_tien,
          gia_von: r.gia_von,
          loi_nhuan: r.loi_nhuan,
        })),
        meta: { tong: raws.length, gioi_han: 60000 },
      });
    }
    noCostList = kq.all
      .filter((r) => r.nc)
      .slice(0, 3000)
      .map((r) => ({
        order_id: r.id,
        san: r.san,
        bu: r.bu,
        spdv: r.spdv,
        ngay: r.ngay,
        sortKey: r.sortKey,
        doanh_thu_usd: r.doanh_thu_usd,
        thanh_tien: r.thanh_tien,
      }));
    goi = goiGon(kq);
  } else {
    let kq;
    try {
      kq = await nhoDoc(khoa, async () => goiGon(await docLive(thamSo)), { moi });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 502 });
    }
    goi = kq.val;
    if (kq.tuoi > 0) {
      boNho = { tuoi_giay: Math.round(kq.tuoi / 1000), dang_lam_moi: !!kq.dangLamMoi };
      if (kq.loi) boNho.loi_doc_moi = kq.loi;
    }
  }

  /* hist=1: nối thêm các tháng đã chốt từ datalake tĩnh */
  const useHist = searchParams.get('hist') === '1';
  let detail = goi.detail;
  let histOk = 0;
  let histFail = 0;
  let histHuy = 0;
  if (useHist) {
    /* Snapshot không lưu BU (file gốc ẩn cột) — gán lại bằng map Sàn→BU
       học từ tháng đang live, cùng chuỗi dự phòng như dòng thường. */
    const sanBu = new Map(goi.san_bu || []);
    const histRows = HIST.flatMap((h) => h.detail).map((r) => ({
      ...r,
      bu: r.bu || sanBu.get(r.san) || SAN_BU_MAP[r.san] || (r.san.match(/^[A-Za-z]+/)?.[0] || r.san).toUpperCase(),
    }));
    if (histRows.length) {
      detail = histRows
        .concat(detail)
        .sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
    }
    for (const h of HIST) {
      histOk += h.counts?.ok || 0;
      histFail += h.counts?.fail || 0;
      histHuy += h.counts?.huy || 0;
    }
  }
  const dates = detail.map((x) => x.ngay);

  /* Đối soát các tháng đã chốt: api_file + danh sách trùng lấy từ datalake */
  const apiFileOut = useHist ? HIST.flatMap((h) => h.api_file || []).concat(goi.api_file) : goi.api_file;
  const dupOut = useHist ? HIST.flatMap((h) => h.dup_list || []).concat(goi.dup_list) : goi.dup_list;

  return Response.json({
    detail,
    api_file: apiFileOut,
    dup_list: dupOut,
    no_cost_list: noCostList || undefined,
    meta: {
      ...goi.meta,
      rows_used: goi.meta.rows_used + histOk,
      don_fail: goi.meta.don_fail + histFail,
      don_huy: goi.meta.don_huy + histHuy,
      main_used: goi.meta.main_used + histOk,
      main_files: urls.length,
      bo_nho: boNho,
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
    },
  });
}
