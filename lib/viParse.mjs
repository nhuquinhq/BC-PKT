/* ============================================================
   BÓC TAB "THVÍ TIỀN" — doanh thu THỰC NHẬN về ví sàn (đã sau phí).

   Tách khỏi app/api/vi/route.js để chỗ chụp ảnh định kỳ
   (scripts/chup-vi.mjs) dùng ĐÚNG bộ luật này. Trước đây mỗi nơi
   một bản là kiểu sai lệch âm thầm: cùng một file mà web ra số này,
   ảnh chụp ra số khác, không bên nào báo lỗi.

   Tại sao phải khớp tiêu đề theo HẬU TỐ chứ không so bằng:
   file ví tháng 9 Google không xuất nổi qua bản công bố lẫn qua
   export (307 rỗng sau 110s, 0/5 lượt), chỉ còn đường gviz. Mà gviz
   dán 5 dòng tiêu đề vào nhau nên tên cột về dạng "29.688,69 Số Tiền",
   "REV Rate Tỷ giá tuần", "0,00 Tìm". Tên thật nằm ở CUỐI chuỗi.
   ============================================================ */

export const chuan = (s) =>
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

/* Khớp bằng trước, hụt mới khớp hậu tố. Ưu tiên khớp bằng để bản CSV
   sạch (đường công bố) không bị một cột tên dài nuốt mất cột đúng. */
const timCot = (headers, ten) => {
  const i = headers.indexOf(ten);
  if (i >= 0) return i;
  return headers.findIndex((h) => h === ten || h.endsWith(` ${ten}`));
};

/* Tab THVí Tiền: Tên sàn | ID | Trạng thái | Số Tiền | Ngày | Tuần |
   Tỷ giá tuần | DT VND | Giá Vốn | Tìm | Lợi Nhuận | Tên Sheet |
   Loại đơn hàng BE | ... | BU */
/* Nhận dòng tiêu đề bằng "Số Tiền" + "Tìm". KHÔNG đòi có tên cột sàn: đọc
   bằng gviz thì ô tiêu đề của cột sàn về RỖNG (gviz bỏ trống nhãn của cột nó
   đoán là kiểu số, mà cột sàn đứng cạnh dòng tổng nên bị đoán nhầm). Cột sàn
   vẫn ở đúng chỗ cũ, chỉ mất tên — docCot() lùi về cột 0 và tự kiểm lại. */
export function timTieuDe(grid) {
  for (let i = 0; i < Math.min(grid.length, 20); i++) {
    const h = (grid[i] || []).map(chuan);
    if (timCot(h, 'so tien') >= 0 && timCot(h, 'tim') >= 0 && timCot(h, 'ngay') >= 0) {
      return { headIdx: i, headers: h };
    }
  }
  return { headIdx: -1, headers: [] };
}

export function docCot(headers) {
  return {
    san: (() => {
      const i = timCot(headers, 'ten san');
      if (i >= 0) return i;
      const j = timCot(headers, 'san');
      return j >= 0 ? j : 0;
    })(),
    so_tien: timCot(headers, 'so tien'),
    ty_gia: timCot(headers, 'ty gia tuan'),
    ngay: timCot(headers, 'ngay'),
    dt_vnd: timCot(headers, 'dt vnd'),
    gia_von: timCot(headers, 'gia von'),
    tim: timCot(headers, 'tim'),
    loi_nhuan: timCot(headers, 'loi nhuan'),
    /* Cột phân loại đơn. Bản ver1 gọi là "Loại đơn hàng BE" (Tự động / Thủ
       công / Flip), bản ver2 đổi thành "Phân loại doanh thu BE" (Flip /
       Doanh thu dịch vụ). Phải bám hậu tố BE: file ver2 còn hai cột trùng
       tên "Phân loại doanh thu" ở cuối bảng, lấy nhầm là ra số khác. */
    loai_don: (() => {
      const i = headers.findIndex((h) => h.startsWith('loai don hang') || h.includes(' loai don hang'));
      if (i >= 0) return i;
      return headers.findIndex((h) => h === 'phan loai doanh thu be' || h.endsWith(' phan loai doanh thu be'));
    })(),
    /* Cột BU. File ver2 từ tháng 9 đổi tên thành "Phân Loại Team" — vẫn chứa
       BU1/BU2/BU4/BU5 (kèm vài mã team HQC200/HQC300). Không nhận tên mới thì
       BU rỗng sạch và các trang lọc theo BU mất hẳn tháng đó, mà không báo lỗi
       gì — đúng kiểu đã dính với "Loại đơn hàng BE" → "Phân loại doanh thu BE". */
    bu: (() => {
      const i = timCot(headers, 'bu');
      if (i >= 0) return i;
      return timCot(headers, 'phan loai team');
    })(),
  };
}

/* Gộp theo ngày × sàn × loại đơn × BU, chỉ lấy dòng có cột Tìm = DT.
   Trả về cùng khuôn với /api/cpv để dùng chung CpvBoard. */
export function parseWallet(grid, { month, year }) {
  const { headIdx, headers } = timTieuDe(grid);
  if (headIdx < 0) throw new Error('Không tìm thấy dòng tiêu đề tab THVí Tiền.');
  const col = docCot(headers);

  const agg = new Map();
  let ok = 0;
  let usdTong = 0;
  let vndTong = 0;
  let gvTong = 0;
  /* Tổng giá vốn CỦA CẢ CỘT, không lọc theo Tìm = DT. Để đối chiếu với ô tổng
     mà chính file ghi sẵn ở đầu tên cột — đó mới là bằng chứng đã lấy đúng
     cột giá vốn. Tổng của riêng dòng DT thì không so được: ô tổng của file
     tính cả dòng khác. */
  let gvTatCa = 0;
  /* Đếm số dòng thoả Số Tiền × Tỷ giá tuần = DT VND. Đây là cách tự chứng
     minh đã lấy ĐÚNG cột Số Tiền: lấy nhầm một cột số khác thì đẳng thức này
     vỡ ngay, trong khi tổng tiền VND vẫn đẹp và không có gì báo. */
  let khopTyGia = 0;
  let thuTyGia = 0;
  /* Y HỆT VẬY CHO CỘT GIÁ VỐN — DT VND − Giá Vốn = Lợi Nhuận, lấy cả ba cột
     ngay trên cùng một dòng. Trước đây cột này không có chốt nào: tổng tiền
     VND chốt được nhưng giá vốn thì không, nên nếu file đổi chỗ cột giá vốn
     thì lợi nhuận sai mà không có gì báo. Phát hiện ra chỗ hổng này khi ví
     T10 cho tỉ lệ GV/DT trên 100% mọi ngày (T9 là 83%) mà không có cách nào
     nói được là file sai hay mình đọc sai. */
  let khopLn = 0;
  let thuLn = 0;
  for (let i = headIdx + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    if (col.gia_von >= 0) gvTatCa += viNum(r[col.gia_von]);
    if (chuan(r[col.tim]) !== 'dt') continue; // chỉ dòng doanh thu
    /* HOA HẾT mã sàn. File ví ghi 'u1'/'u2' chữ thường còn file BE ghi
       'U1'/'U2', nên U7Buy và U7Buy2 bị tách thành hai sàn khác nhau giữa
       PKT6 và PKT8 — suốt từ tháng 4. Bảng Sàn–BU (lib/data/san-bu.json)
       dùng chữ hoa, nên trang lọc theo sàn U2 không thấy dòng ví nào.
       Đã kiểm: không file ví nào chứa đồng thời hai dạng chữ của cùng một
       mã, nên hoa hết là gộp đúng chứ không trộn hai sàn khác nhau. */
    const san = String(r[col.san] ?? '').trim().toUpperCase();
    const day = Math.round(viNum(r[col.ngay]));
    if (!san || day < 1 || day > 31) continue;
    const ngay = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    const sortKey = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const spdv = String(r[col.loai_don] ?? '').trim() || 'KHÁC';
    const bu = col.bu >= 0 ? String(r[col.bu] ?? '').trim().toUpperCase() : '';
    const key = `${sortKey}|${san}|${spdv}|${bu}`;
    if (!agg.has(key)) {
      agg.set(key, {
        ngay, sortKey, san, spdv, bu, nguon: 'dh',
        so_don: 0, don_fail: 0, don_huy: 0,
        doanh_thu_usd: 0, phi_san: 0, phi_san_vnd: 0,
        dthu_thuc: 0, thanh_tien: 0, gia_von: 0, loi_nhuan: 0,
      });
    }
    const a = agg.get(key);
    ok += 1;
    const usd = viNum(r[col.so_tien]);
    const tt = viNum(r[col.dt_vnd]);
    const gv = viNum(r[col.gia_von]);
    const lnRaw = String(r[col.loi_nhuan] ?? '').trim();
    usdTong += usd;
    vndTong += tt;
    gvTong += gv;
    const tg = col.ty_gia >= 0 ? viNum(r[col.ty_gia]) : 0;
    if (tg > 0 && usd > 0 && tt > 0) {
      thuTyGia += 1;
      if (Math.abs(usd * tg - tt) / tt <= 0.001) khopTyGia += 1;
    }
    if (lnRaw && tt > 0 && gv !== 0) {
      const ln = viNum(lnRaw);
      thuLn += 1;
      if (Math.abs(tt - gv - ln) <= Math.max(Math.abs(ln) * 0.001, 1)) khopLn += 1;
    }
    a.so_don += 1;
    a.doanh_thu_usd += usd;
    a.dthu_thuc += usd;
    a.thanh_tien += tt;
    a.gia_von += gv;
    a.loi_nhuan += lnRaw ? viNum(lnRaw) : tt - gv;
  }
  /* Cột sàn lấy theo vị trí (khi gviz nuốt mất tên) thì phải kiểm lại: tên sàn
     là mã ngắn kiểu PO3/EL2, không phải số. Trúng nhầm cột số thì mọi dòng gộp
     vào vài "sàn" vô nghĩa mà tổng tiền vẫn đúng — không có gì báo. */
  if (!headers.some((h) => h === 'ten san' || h === 'san' || h.endsWith(' ten san') || h.endsWith(' san'))) {
    const ten = [...agg.values()].map((a) => a.san);
    const hong = ten.filter((s) => !s || /^[\d.,\s-]+$/.test(s) || s.length > 24).length;
    if (ten.length && hong / ten.length > 0.1) {
      throw new Error(`Cột tên sàn không nhận ra được — ${hong}/${ten.length} nhóm có tên sàn không hợp lệ.`);
    }
  }

  const detail = [...agg.values()].sort((x, y) => (x.sortKey < y.sortKey ? -1 : x.sortKey > y.sortKey ? 1 : x.san.localeCompare(y.san)));
  return { detail, ok, usdTong, vndTong, gvTong, gvTatCa, khopTyGia, thuTyGia, khopLn, thuLn, headIdx, col, headers };
}
