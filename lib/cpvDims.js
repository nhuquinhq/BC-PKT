/* ============================================================
   Chiều phân tích cho báo cáo CPV BE HQS (PKT8):
   - Team: map từ cột BU của tab Data (theo quy ước PKT).
   - SPDV: phân loại từ cột Dịch vụ / Sản phẩm / Game.
   Sửa 2 bảng dưới đây khi có team/SPDV mới.
   ============================================================ */

/* BU trên file → Team báo cáo. BU không có trong map giữ nguyên mã gốc. */
export const TEAM_MAP = {
  BU1: 'HQS100',
  BD10F: 'HQS100',
  BU2: 'HQS200',
  BU4: 'HQS400',
  BU5: 'HQS500',
};

export const teamOf = (bu) => {
  const k = String(bu || '').toUpperCase().trim();
  return TEAM_MAP[k] || k || '—';
};

/* Phân loại SPDV theo từ khoá (đã bỏ dấu, thường). Ưu tiên theo thứ tự. */
const SPDV_RULES = [
  { spdv: 'GIFT CARD', re: /gift ?card|giftcard/ },
  { spdv: 'TOPUP', re: /top ?up|nap tien|welkin|diamond|zem\b|zems/ },
  { spdv: 'ACCOUNT', re: /nick|account|\bacc\b|so nhap acc/ },
  { spdv: 'ITEM', re: /\bitem\b|ban item|gold seed/ },
  { spdv: 'CURRENCY', re: /robux|gamepass|rbx|razer|gold|monochrome|lunite|currency/ },
];

export function spdvOf(...texts) {
  const t = texts
    .map((x) => String(x || ''))
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
  for (const r of SPDV_RULES) if (r.re.test(t)) return r.spdv;
  return 'KHÁC';
}
