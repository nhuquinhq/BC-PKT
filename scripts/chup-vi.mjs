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

/* Chốt 3 — cột GIÁ VỐN, cũng kiểm theo TỪNG DÒNG: DT VND − Giá Vốn = Lợi
   Nhuận, ba cột cùng một dòng. Trước đây cột giá vốn không có chốt nào cả:
   lấy nhầm nó thì tổng VND vẫn đẹp, hai chốt trên vẫn xanh, chỉ có lợi nhuận
   sai âm thầm. Thiếu chốt này nên khi ví T10 ra GV/DT trên 100% mọi ngày
   (T9 là 83%) thì không có cách nào nói được file sai hay mình đọc sai. */
if (kq.thuLn > 0) {
  const ty = kq.khopLn / kq.thuLn;
  console.log(`   chốt Giá Vốn: ${so(kq.khopLn)}/${so(kq.thuLn)} dòng thoả DT VND − Giá Vốn = Lợi Nhuận (${(ty * 100).toFixed(2)}%)`);
  /* Ngưỡng 50%: lấy nhầm cột thì đẳng thức vỡ gần hết, chứ không rơi xuống
     quá nửa. Để rộng vì chưa có số đo nhiều tháng — siết lại khi đã biết
     mức bình thường của nó. */
  if (ty < 0.5) lech = true;
} else {
  console.log('   chốt Giá Vốn: không có dòng nào đủ DT VND/Giá Vốn/Lợi Nhuận để kiểm.');
}
/* Tổng giá vốn in ra để đối chiếu bằng mắt với chính file. Không dùng ô tổng
   của cột này làm chốt: hàng xóm của nó tên "Cộng tổng giá trị TÌM ĐƯỢC Giá
   Vốn" — tức tổng của ô tìm kiếm, không phải tổng các dòng DT. */
{
  const gvFile = tongCuaFile('gia von');
  const tyLe = kq.vndTong > 0 ? (kq.gvTong / kq.vndTong) * 100 : 0;
  console.log(`   giá vốn: cộng được ${so(kq.gvTong)} (${tyLe.toFixed(1)}% doanh thu)${gvFile ? ` · ô tổng của file ${so(gvFile)}` : ''}`);
}

if (lech) {
  console.error('Số không chốt được — KHÔNG ghi. Nhiều khả năng file đã đổi tên hoặc đổi vị trí cột.');
  console.error(`Tiêu đề đọc được (${kq.headers.length} cột): ${JSON.stringify(kq.headers)}`);
  console.error(`Cột đã chọn: ${JSON.stringify(kq.col)}`);
  process.exit(1);
}

/* Chốt 4 — KHÔNG ĐƯỢC TEO. So với bản đang nằm trong datalake của CHÍNH tháng
   này: một tháng đang chạy chỉ có thể dày thêm, không thể mỏng đi.

   Vì sao có chốt này: ngày 03/10 file ví T9 trên Google bị dựng lại, job chụp
   chép đúng cái rỗng đó đè lên bản tốt — 21.703 dòng tụt còn 811 rồi 435, giá
   vốn về 0, và chạy như vậy suốt ba ngày không ai biết. Hai chốt trên không bắt
   được vì chúng chỉ kiểm bản đọc về có TỰ NHẤT QUÁN không, chứ không hỏi
   "tháng này có bị mất dữ liệu so với hôm qua không".

   Cho tụt tối đa 2% để chừa chỗ cho đơn bị huỷ/sửa; quá thì dừng, báo rõ, và
   giữ nguyên bản cũ. Muốn cố tình ghi đè bản nhỏ hơn (vd chốt sổ lại từ file
   tải tay) thì đặt CHO_PHEP_TEO=1. */
const BAN_CU = (() => {
  try {
    return JSON.parse(readFileSync(duongRa, 'utf8'));
  } catch {
    return null;
  }
})();
if (BAN_CU && !process.env.CHO_PHEP_TEO) {
  const cu = Number(BAN_CU.counts?.ok) || 0;
  const cuVnd = Number(BAN_CU.counts?.vnd) || 0;
  if (cu > 0) {
    const tiLe = kq.ok / cu;
    const tiLeVnd = cuVnd > 0 ? kq.vndTong / cuVnd : 1;
    console.log(`   chốt không teo: bản cũ ${so(cu)} dòng / ${so(cuVnd)} đ · bản mới ${so(kq.ok)} dòng / ${so(kq.vndTong)} đ`);
    if (tiLe < 0.98 || tiLeVnd < 0.98) {
      console.error(
        `Bản mới TEO so với bản đang có (${(tiLe * 100).toFixed(1)}% số dòng · ${(tiLeVnd * 100).toFixed(1)}% số tiền) — KHÔNG ghi, giữ nguyên bản cũ.`
      );
      console.error('Nhiều khả năng file nguồn đang được dựng lại. Chốt sổ lại từ file tải tay thì đặt CHO_PHEP_TEO=1.');
      process.exit(1);
    }
  }
}

const ra = {
  thang: `${String(thang).padStart(2, '0')}/${nam}`,
  nguon: 'Tab THVí Tiền, chụp tự động bằng .github/workflows/chup-vi.yml',
  chup_luc: new Date().toISOString(),
  counts: { ok: kq.ok, so_dong: kq.detail.length, usd: kq.usdTong, vnd: kq.vndTong, gv: kq.gvTong },
  detail: kq.detail,
};
writeFileSync(duongRa, `${JSON.stringify(ra, null, 0)}\n`, 'utf8');

const ngay = [...new Set(kq.detail.map((r) => r.ngay))].sort();
console.log(`   ghi ${duongRa}: ${so(kq.ok)} dòng DT · ${so(kq.detail.length)} nhóm · ${ngay[0]} → ${ngay[ngay.length - 1]}`);
console.log(`   USD ${so(kq.usdTong)} · VND ${so(kq.vndTong)}`);
