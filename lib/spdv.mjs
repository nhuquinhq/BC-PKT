/* ============================================================
   XẾP NHÓM SPDV từ cột "LOẠI DỊCH VỤ" của file đơn hàng.

   Tách khỏi lib/cpvDims.js để scripts/chup-be.mjs chạy được bằng node
   trần: cpvDims.js nạp lib/data/san-bu.json qua bí danh '@/', mà node
   ngoài Next thì không hiểu bí danh đó. Phần xếp nhóm SPDV không cần
   tới file JSON nào nên mang ra đây được nguyên vẹn.

   .mjs chứ không phải .js: package.json không đặt type:module nên node
   đọc .js là CommonJS.

   lib/cpvDims.js xuất lại y nguyên các tên dưới đây, nên mọi chỗ đang
   gọi spdvOf / SPDV_VALUE_MAP không phải sửa gì.
   ============================================================ */

const normText = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

/* Giá trị cột LOẠI DỊCH VỤ → nhóm SPDV (so khớp sau khi bỏ dấu, thường) */
export const SPDV_VALUE_MAP = {
  'gift card': 'GIFT CARD',
  giftcard: 'GIFT CARD',
  /* Razer Gold tạm tách nhóm riêng theo yêu cầu PKT (chưa gộp vào GIFT CARD) */
  'razer gold': 'RAZER GOLD',
  razergold: 'RAZER GOLD',
  'top up': 'TOPUP',
  topup: 'TOPUP',
  'nap tien': 'TOPUP',
  'robux 120h': 'CURRENCY',
  robux: 'CURRENCY',
  gamepass: 'CURRENCY',
  nick: 'ACCOUNT',
  acc: 'ACCOUNT',
  account: 'ACCOUNT',
  'ban item': 'ITEM',
  item: 'ITEM',
};

/* Dự phòng khi giá trị không có trong bảng map */
const SPDV_RULES = [
  { spdv: 'RAZER GOLD', re: /razer/ },
  { spdv: 'GIFT CARD', re: /gift ?card/ },
  { spdv: 'TOPUP', re: /top ?up|nap tien|welkin|diamond|zem\b|zems/ },
  { spdv: 'ACCOUNT', re: /nick|account|\bacc\b/ },
  { spdv: 'ITEM', re: /\bitem\b|ban item|gold seed/ },
  { spdv: 'CURRENCY', re: /robux|gamepass|rbx|gold|monochrome|lunite|currency/ },
];

/* Ưu tiên cột LOẠI DỊCH VỤ; loại mới chưa map → hiện nguyên tên để PKT xếp nhóm */
export function spdvOf(loaiDichVu, ...fallbackTexts) {
  const v = normText(loaiDichVu);
  if (v) {
    if (SPDV_VALUE_MAP[v]) return SPDV_VALUE_MAP[v];
    for (const r of SPDV_RULES) if (r.re.test(v)) return r.spdv;
    return String(loaiDichVu).trim().toUpperCase();
  }
  const t = normText(fallbackTexts.join(' '));
  if (t) for (const r of SPDV_RULES) if (r.re.test(t)) return r.spdv;
  return 'KHÁC';
}
