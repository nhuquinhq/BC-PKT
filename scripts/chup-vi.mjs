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

const chot = [
  ['USD (Số Tiền)', tongCuaFile('so tien'), kq.usdTong, 0.005],
  ['VND (DT VND)', tongCuaFile('dt vnd'), kq.vndTong, 0.005],
];
let lech = false;
for (const [ten, cuaFile, cuaMinh, nguong] of chot) {
  if (cuaFile == null || cuaFile === 0) {
    console.log(`   chốt ${ten}: file không ghi sẵn tổng, bỏ qua`);
    continue;
  }
  const d = Math.abs(cuaMinh - cuaFile) / cuaFile;
  const dau = d <= nguong ? 'khớp' : 'LỆCH';
  console.log(`   chốt ${ten}: file ${so(cuaFile)} · cộng được ${so(cuaMinh)} · ${dau} ${(d * 100).toFixed(3)}%`);
  if (d > nguong) lech = true;
}
if (lech) {
  console.error('Tổng cộng được không khớp tổng của file — KHÔNG ghi. Nhiều khả năng file đã đổi tên/đổi vị trí cột.');
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
