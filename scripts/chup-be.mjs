/* ============================================================
   CHỤP ẢNH BẢNG ĐƠN HÀNG BE VÀO DATALAKE

   Vì sao phải chụp thay vì đọc live: đo ngày 06/10 trên file BE T10,
   QUA VERCEL thì bản công bố 0/2 lượt và export 0/2 lượt — lượt nào
   cũng HTTP 400 sau 240s; từ GitHub thì export ra 1/3 lượt trong 100s.
   Trang web có 300s và người dùng đang ngồi chờ, không đọc nổi. Job
   chạy nền thì có cả tiếng để thử lại, không ai chờ.

   Dùng ĐÚNG bộ luật của web: lib/beParse.mjs, cùng module mà
   app/api/cpv/route.js gọi. Mỗi nơi một bản là kiểu sai lệch âm thầm.

   CHỐT SỐ TRƯỚC KHI GHI, ba lớp:
     1. Hai đẳng thức từng dòng (DThu thực nhận × Tỷ giá = Thành tiền;
        Thành tiền − Giá Vốn = Lợi Nhuận) — bắt lỗi lấy nhầm cột tiền.
     2. Phải có cột Thành tiền và cột Giá Vốn — thiếu thì số VND là
        quy đổi tay hoặc giá vốn bằng 0, không được đưa vào datalake.
     3. Không được TEO so với bản đang có của chính tháng đó.
   Lệch thì KHÔNG ghi, giữ nguyên bản cũ.

   Dùng: node scripts/chup-be.mjs <file.csv> <thang> <nam> <file-ra.json>
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';
import { parseOrders, aggregate } from '../lib/beParse.mjs';

const [, , duongCsv, thangRaw, namRaw, duongRa] = process.argv;
if (!duongCsv || !thangRaw || !namRaw || !duongRa) {
  console.error('Dùng: node scripts/chup-be.mjs <file.csv> <thang> <nam> <file-ra.json>');
  process.exit(2);
}
const thang = Number(thangRaw);
const nam = Number(namRaw);
const thangKhoa = `${nam}${String(thang).padStart(2, '0')}`;

const so = (x) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(x);

const csv = readFileSync(duongCsv, 'utf8');
if (csv.trim().startsWith('<')) {
  console.error('Nhận về HTML thay vì CSV — file chưa mở quyền xem, hoặc sai GID.');
  process.exit(1);
}
const grid = Papa.parse(csv, { header: false, skipEmptyLines: false }).data;

const { rows, meta } = parseOrders(grid);
/* Chỉ giữ đúng tháng cần chụp. Tab BE có thể còn đơn của tháng khác (đơn chốt
   muộn, đơn sửa lại), mà datalake xếp MỘT FILE MỘT THÁNG — lẫn tháng vào là
   /api/cpv loại trùng theo tháng sẽ cắt oan cả cụm. */
const trongThang = rows.filter((r) => r.sortKey.slice(0, 6) === thangKhoa);
const ngoai = rows.length - trongThang.length;
console.log(`   bóc ${so(rows.length)} dòng · trong tháng ${thang}/${nam}: ${so(trongThang.length)}${ngoai ? ` · bỏ ${so(ngoai)} dòng tháng khác` : ''}`);
if (!trongThang.length) {
  console.error('Không có dòng nào của tháng này — KHÔNG ghi.');
  process.exit(1);
}

const detail = aggregate(trongThang);
const ok = detail.reduce((s, r) => s + r.so_don, 0);
const fail = detail.reduce((s, r) => s + r.don_fail, 0);
const huy = detail.reduce((s, r) => s + r.don_huy, 0);
const tt = detail.reduce((s, r) => s + r.thanh_tien, 0);
const gv = detail.reduce((s, r) => s + r.gia_von, 0);

let lech = false;

/* Chốt 1 — hai đẳng thức từng dòng. Ngưỡng 85% như chup-vi: phần hụt là đơn
   có tỷ giá riêng hoặc giá vốn chốt tay, còn lấy nhầm cột thì tỉ lệ về gần 0
   chứ không phải 90. Đo trên file BE T9: cả hai đều 100,00%. */
/* In cả ma trận gốc × cột tỷ giá. Đã mất hai lượt chạy để hiểu một con số
   "58%" trơ trọi, nên chốt phải tự nói ra chỗ lệch. */
if ((meta.cotTyGia || []).length && meta.thuTyGia) {
  for (let g = 0; g < meta.gocTyGia.length; g++) {
    console.log(
      `   ${meta.gocTyGia[g].padEnd(14)} × tỷ giá: ${meta.cotTyGia
        .map((i, k) => `[${i}] ${so(meta.khopTheoCap[g][k])}/${so(meta.thuTyGia)} (${((meta.khopTheoCap[g][k] / meta.thuTyGia) * 100).toFixed(1)}%)`)
        .join(' · ')}`
    );
  }
}
for (const [ten, khop, thu] of [
  ['DThu thực nhận × Tỷ giá = Thành tiền', meta.khopTyGia, meta.thuTyGia],
  ['Thành tiền − Giá Vốn = Lợi Nhuận', meta.khopLn, meta.thuLn],
]) {
  if (!thu) {
    console.error(`   chốt "${ten}": không có dòng nào đủ cột để kiểm.`);
    lech = true;
    continue;
  }
  const ty = khop / thu;
  console.log(`   chốt ${ten}: ${so(khop)}/${so(thu)} dòng (${(ty * 100).toFixed(2)}%)`);
  if (ty < 0.85) lech = true;
}

/* Chốt 2 — phải có cột Thành tiền và cột Giá Vốn. Thiếu cột Thành tiền thì số
   VND là do route tự quy đổi bằng bảng tỷ giá tuần, KHÔNG phải số của file;
   đóng băng con số quy đổi đó vào datalake là chốt sổ một con số mình tự tính. */
console.log(`   cột: Thành tiền ${meta.co_thanh_tien ? 'có' : 'KHÔNG'} · Tỷ giá tuần ${meta.co_ty_gia ? 'có' : 'KHÔNG'} · Giá Vốn ${meta.gia_von_found ? 'có' : 'KHÔNG'} · tiêu đề dòng ${meta.header_row}`);
if (!meta.co_thanh_tien || !meta.gia_von_found) lech = true;

if (lech) {
  console.error('Số không chốt được — KHÔNG ghi. Nhiều khả năng file đã đổi tên hoặc đổi vị trí cột.');
  console.error(`Cột đã chọn: ${JSON.stringify(meta.col)}`);
  process.exit(1);
}

/* Chốt 3 — KHÔNG ĐƯỢC TEO. Một tháng đang chạy chỉ dày thêm, không mỏng đi.
   Chốt này học từ vụ ví T9 ngày 03/10: file nguồn bị dựng lại, job chụp đúng
   cái rỗng đó đè lên bản tốt, 21.703 dòng tụt còn 435 và chạy ba ngày không
   ai biết. Cho tụt tối đa 2% để chừa chỗ cho đơn huỷ/sửa. Cố tình ghi đè bản
   nhỏ hơn (vd chốt sổ lại từ file tải tay) thì đặt CHO_PHEP_TEO=1. */
const BAN_CU = (() => {
  try {
    return JSON.parse(readFileSync(duongRa, 'utf8'));
  } catch {
    return null;
  }
})();
if (BAN_CU && !process.env.CHO_PHEP_TEO) {
  const cu = Number(BAN_CU.counts?.ok) || 0;
  const cuTt = (BAN_CU.detail || []).reduce((s, r) => s + (r.thanh_tien || 0), 0);
  if (cu > 0) {
    const tiLe = ok / cu;
    const tiLeTt = cuTt > 0 ? tt / cuTt : 1;
    console.log(`   chốt không teo: bản cũ ${so(cu)} đơn / ${so(cuTt)} đ · bản mới ${so(ok)} đơn / ${so(tt)} đ`);
    if (tiLe < 0.98 || tiLeTt < 0.98) {
      console.error(
        `Bản mới TEO so với bản đang có (${(tiLe * 100).toFixed(1)}% số đơn · ${(tiLeTt * 100).toFixed(1)}% số tiền) — KHÔNG ghi, giữ nguyên bản cũ.`
      );
      console.error('Nhiều khả năng file nguồn đang được dựng lại. Chốt sổ lại từ file tải tay thì đặt CHO_PHEP_TEO=1.');
      process.exit(1);
    }
  }
}

/* Khuôn giống các file cpv-*.json đã chốt sổ để /api/cpv nối thẳng vào HIST.
   api_file và dup_list để rỗng: ảnh chụp này chỉ có nguồn đơn hàng BE, phần
   file API sàn do chốt sổ cuối tháng gộp vào. */
const ra = {
  thang: `${String(thang).padStart(2, '0')}/${nam}`,
  nguon: 'Tab đơn hàng file CPV BE, chụp tự động bằng .github/workflows/chup-be.yml',
  chup_luc: new Date().toISOString(),
  counts: { ok, fail, huy },
  detail,
  api_file: [],
  dup_list: [],
};
writeFileSync(duongRa, `${JSON.stringify(ra, null, 0)}\n`, 'utf8');

const ngay = [...new Set(detail.map((r) => r.ngay))].sort();
console.log(`   ghi ${duongRa}: ${so(ok)} đơn · ${so(detail.length)} nhóm · ${ngay[0]} → ${ngay[ngay.length - 1]}`);
console.log(`   DT ${so(tt)} đ · GV ${so(gv)} đ · LN ${so(tt - gv)} đ (${tt > 0 ? ((gv / tt) * 100).toFixed(1) : 0}% giá vốn)`);
