/* ============================================================
   API TRA CỨU ĐƠN theo mã (PKT15 — Check kho flip).

   Kế toán kho duyệt thanh toán đơn flip cần biết ngay từng mã đơn:
   có trên backend không, nằm ở tháng nào, đã có giá vốn (đã CF) chưa,
   hay mới chỉ nằm ở danh sách Đơn tạo mới.

   Không đọc file riêng — gọi thẳng hai API sẵn có để nguồn số luôn
   trùng với các báo cáo khác:
   - /api/cpv?raw=1  : từng đơn của module Quản lý đơn hàng + API sàn
   - /api/taomoi?full=1 : từng đơn trên tab Đơn tạo mới

   Nhận POST { ids: [...], qsBe: '...', qsTaoMoi: '...' } — dùng POST vì
   dán vài trăm mã thì query string không chứa nổi.
   ============================================================ */

import { GET as docCpv } from '@/app/api/cpv/route';
import { GET as docTaoMoi } from '@/app/api/taomoi/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const chuan = (v) => String(v ?? '').trim().toUpperCase();

/* Gọi một route handler nội bộ như gọi hàm — không đi vòng qua HTTP */
async function goi(handler, duong) {
  const res = await handler(new Request(`https://noi-bo${duong}`));
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
  return json;
}

/* Ghi mã vào bảng tra; một đơn có thể có 2 mã (Order ID và mã nội bộ) */
function ghi(bang, ma, rec) {
  const k = chuan(ma);
  if (!k || bang.has(k)) return;
  bang.set(k, rec);
}

export async function POST(request) {
  let than;
  try {
    than = await request.json();
  } catch {
    return Response.json({ error: 'Body không phải JSON' }, { status: 400 });
  }
  const ids = (Array.isArray(than?.ids) ? than.ids : []).map(chuan).filter(Boolean);
  if (!ids.length) return Response.json({ error: 'Chưa có mã đơn nào để tra' }, { status: 400 });
  if (ids.length > 5000) return Response.json({ error: 'Mỗi lần tra tối đa 5.000 mã' }, { status: 400 });

  const loi = [];
  const bang = new Map();
  const thangBe = new Set();
  const thangTm = new Set();

  /* --- Đơn trên backend (Quản lý đơn hàng + API sàn) --- */
  if (than.qsBe) {
    try {
      const j = await goi(docCpv, `/api/cpv?${than.qsBe}&raw=1`);
      for (const r of j.raw || []) {
        const thang = String(r.ngay || '').slice(3);
        thangBe.add(thang);
        ghi(bang, r.id, {
          o: 'BE',
          nguon: r.nguon === 'api' ? 'API sàn' : 'Quản lý đơn hàng',
          ngay: r.ngay,
          thang,
          san: r.san,
          bu: r.bu,
          spdv: r.spdv,
          trang_thai: { ok: 'Hoàn tất', fail: 'Thất bại', huy: 'Hoàn hủy' }[r.sc] || r.sc,
          doanh_thu_usd: r.doanh_thu_usd,
          gmv: r.thanh_tien,
          gia_von: r.gia_von,
        });
      }
    } catch (e) {
      loi.push(`đơn hàng BE: ${e.message}`);
    }
  }

  /* --- Đơn tạo mới (chưa CF) --- */
  if (than.qsTaoMoi) {
    try {
      const j = await goi(docTaoMoi, `/api/taomoi?${than.qsTaoMoi}&full=1`);
      for (const r of j.no_cost_list || []) {
        const thang = String(r.ngay || '').slice(3);
        thangTm.add(thang);
        const rec = {
          o: 'TAOMOI',
          nguon: 'Đơn tạo mới',
          ngay: r.ngay,
          thang,
          san: r.san,
          bu: '',
          spdv: r.loai_don,
          trang_thai: r.spdv /* CHƯA CF (Chờ xử lý) | ĐANG XỬ LÝ */,
          nguon_ncc: r.nguon_ncc,
          doanh_thu_usd: r.doanh_thu_usd,
          gmv: null,
          gia_von: r.gia_von,
        };
        ghi(bang, r.order_id, rec);
        ghi(bang, r.id_don, rec);
      }
    } catch (e) {
      loi.push(`đơn tạo mới: ${e.message}`);
    }
  }

  /* --- Ghép kết quả theo đúng thứ tự mã người dùng dán vào --- */
  const daGap = new Set();
  const ket_qua = ids.map((ma) => {
    const r = bang.get(ma);
    const trung = daGap.has(ma);
    daGap.add(ma);
    if (!r) {
      return {
        ma,
        ket_luan: 'Không tìm thấy',
        nguon: '—',
        thang: '—',
        ngay: '—',
        san: '—',
        trang_thai: '—',
        cf: '—',
        doanh_thu_usd: null,
        gmv: null,
        gia_von: null,
        ghi_chu: trung ? 'Mã bị dán trùng' : '',
      };
    }
    const coGiaVon = (r.gia_von || 0) > 0;
    return {
      ma,
      ket_luan: r.o === 'BE' ? 'Có trên backend' : 'Chỉ ở Đơn tạo mới',
      nguon: r.nguon,
      thang: r.thang,
      ngay: r.ngay,
      san: r.san,
      bu: r.bu,
      spdv: r.spdv,
      trang_thai: r.trang_thai,
      cf: coGiaVon ? 'Đã có giá vốn' : 'CO = 0 (chưa CF)',
      doanh_thu_usd: r.doanh_thu_usd,
      gmv: r.gmv,
      gia_von: r.gia_von,
      ghi_chu: [trung ? 'Mã bị dán trùng' : '', r.nguon_ncc ? `NCC ${r.nguon_ncc}` : ''].filter(Boolean).join(' · '),
    };
  });

  const dem = (dk) => ket_qua.filter(dk).length;
  const thang = [...new Set([...thangBe, ...thangTm])].sort(
    (a, b) => (a.slice(3) + a.slice(0, 2)).localeCompare(b.slice(3) + b.slice(0, 2))
  );

  return Response.json({
    ket_qua,
    kpis: {
      tong_ma: ket_qua.length,
      thay_be: dem((r) => r.ket_luan === 'Có trên backend'),
      thay_taomoi: dem((r) => r.ket_luan === 'Chỉ ở Đơn tạo mới'),
      khong_thay: dem((r) => r.ket_luan === 'Không tìm thấy'),
      chua_cf: dem((r) => r.cf === 'CO = 0 (chưa CF)'),
      gmv: ket_qua.reduce((t, r) => t + (r.gmv || 0), 0),
      gia_von: ket_qua.reduce((t, r) => t + (r.gia_von || 0), 0),
    },
    meta: {
      /* Nói rõ tra được tới đâu — datalake tháng đã chốt chỉ lưu số gộp,
         không lưu từng mã đơn, nên không tra ngược được. */
      thang_tra_duoc: thang,
      loi: loi.length ? loi.join(' · ') : null,
    },
  });
}
