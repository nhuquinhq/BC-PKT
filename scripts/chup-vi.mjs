/* ============================================================
   CHỤP ẢNH TAB THVÍ TIỀN VÀO DATALAKE

   Vì sao phải chụp thay vì đọc live: đo ngày 07/09 trên file ví T9,
   bản công bố ra 0/2 lượt và export ra 0/3 lượt (lượt nào cũng HTTP
   307 rỗng sau 110s); chỉ còn đường gviz và cũng chỉ 1/5–1/6 lượt,
   mỗi lượt 38–44s. Một trang mà 4 lần bấm hỏng 3 thì không dùng được.

   Ở đây thì khác: chạy nền, có cả tiếng đồng hồ để thử lại, nên cứ
   thử tới khi được. Web đọc file JSON tĩnh — mở phát ra ngay.

   CHỐT SỐ TRƯỚC KHI GHI: gviz dán 5 dòng tiêu đề vào nhau nên chính
   dòng tổng của file nằm sẵn trong tên cột ("29.688,69 Số Tiền",
   "1.856.675.361,29 DT VND"). Bóc ra so với tổng mình cộng được; lệch
   quá ngưỡng thì KHÔNG ghi. Đã dính vài lần đổi tên cột làm sai số
   tiền mà không có gì báo — bản này tự bắt được loại lỗi đó.

   Dùng: node scripts/chup-vi.mjs <file.csv> <thang> <nam> <file-ra.json>
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';
import { parseWallet, timTieuDe, chuan, viNum } from '../lib/viParse.mjs';

const [, , duongCsv, thangRaw, namRaw, duongRa] = process.argv;
if (!duongCsv || !thangRaw || !namRaw || !duongRa) {
  console.error('Dùng: node scripts/chup-vi.mjs <file.csv> <thang> <nam> <file-ra.json>');
  process.exit(2);
}
const thang = Number(thangRaw);
const nam = Number(namRaw);

const so = (x) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(x);

const csv = readFileSync(duongCsv, 'utf8');
if (csv.trim().startsWith('<')) {
  console.error('Nhận về HTML thay vì CSV — file chưa mở quyền xem, hoặc sai GID.');
  process.exit(1);
}
const grid = Papa.parse(csv, { header: false, skipEmptyLines: false }).data;

const kq = parseWallet(grid, { month: thang, year: nam });
if (!kq.detail.length) {
  console.error('Bóc ra 0 dòng — không ghi.');
  process.exit(1);
}

/* Tổng của chính file, bóc từ phần SỐ dán ở đầu tên cột. Chỉ có khi đọc
   bằng gviz headers=5; đọc bằng đường công bố thì tên cột sạch, không có
   số để đối chiếu — lúc đó bỏ qua bước chốt. */
const { headers } = timTieuDe(grid);
const tongCuaFile = (ten) => {
  const h = headers.find((x) => x.endsWith(` ${ten}`));
  if (!h) return null;
  const m = h.slice(0, h.length - ten.length).trim();
  return /\d/.test(m) ? viNum(m) : null;
};

let lech = false;

/* Chốt 1 — tổng VND. Đây là con số cuối cùng lên báo cáo nên phải khớp
   tuyệt đối. Chạy ngày 07/09: file 1.856.675.361 · cộng được 1.856.675.361,
   lệch 0,000%. */
const vndFile = tongCuaFile('dt vnd');
if (vndFile) {
  const d = Math.abs(kq.vndTong - vndFile) / vndFile;
  console.log(`   chốt VND: file ${so(vndFile)} · cộng được ${so(kq.vndTong)} · ${d <= 0.005 ? 'khớp' : 'LỆCH'} ${(d * 100).toFixed(3)}%`);
  if (d > 0.005) lech = true;
} else {
  console.log('   chốt VND: file không ghi sẵn tổng, bỏ qua');
}

/* Chốt 2 — cột Số Tiền, kiểm theo TỪNG DÒNG chứ không so với ô tổng.
   Vì sao không so ô tổng: chạy ngày 07/09, ô tổng của cột Số Tiền ghi 30.119
   trong khi cộng các dòng DT ra 67.898. Ô đó không phải tổng của các dòng DT
   (hàng xóm của nó tên là "Cộng tổng giá trị TÌM ĐƯỢC Giá Vốn" — tức tổng của
   ô tìm kiếm), và nó nhích 29.688 → 30.119 trong nửa tiếng trong khi tổng VND
   đứng yên, tức hai ô đếm hai thứ khác nhau. Đẳng thức từng dòng thì không mơ
   hồ: lấy nhầm cột là vỡ ngay. */
if (kq.thuTyGia > 0) {
  const ty = kq.khopTyGia / kq.thuTyGia;
  console.log(`   chốt Số Tiền: ${so(kq.khopTyGia)}/${so(kq.thuTyGia)} dòng thoả Số Tiền × Tỷ giá tuần = DT VND (${(ty * 100).toFixed(2)}%)`);
  /* Ngưỡng 85% chứ không phải 99%: đo ngày 07/09 ra 3.214/3.419 dòng, tức 94%.
     Phần còn lại là dòng có tỷ giá riêng (đơn bù, đơn chốt tay), không phải
     lấy nhầm cột — lấy nhầm cột thì tỉ lệ về gần 0 chứ không phải 94. Ngưỡng
     này vẫn bắt được lỗi cột mà không chặn oan. */
  if (ty < 0.85) lech = true;
} else {
  console.error('   chốt Số Tiền: không có dòng nào đủ Số Tiền/Tỷ giá/DT VND để kiểm.');
  lech = true;
}

if (lech) {
  console.error('Số không chốt được — KHÔNG ghi. Nhiều khả năng file đã đổi tên hoặc đổi vị trí cột.');
  console.error(`Tiêu đề đọc được (${kq.headers.length} cột): ${JSON.stringify(kq.headers)}`);
  console.error(`Cột đã chọn: ${JSON.stringify(kq.col)}`);
  process.exit(1);
}

const ra = {
  thang: `${String(thang).padStart(2, '0')}/${nam}`,
  nguon: 'Tab THVí Tiền, chụp tự động bằng .github/workflows/chup-vi.yml',
  chup_luc: new Date().toISOString(),
  counts: { ok: kq.ok, so_dong: kq.detail.length, usd: kq.usdTong, vnd: kq.vndTong },
  detail: kq.detail,
};
writeFileSync(duongRa, `${JSON.stringify(ra, null, 0)}\n`, 'utf8');

const ngay = [...new Set(kq.detail.map((r) => r.ngay))].sort();
console.log(`   ghi ${duongRa}: ${so(kq.ok)} dòng DT · ${so(kq.detail.length)} nhóm · ${ngay[0]} → ${ngay[ngay.length - 1]}`);
console.log(`   USD ${so(kq.usdTong)} · VND ${so(kq.vndTong)}`);
