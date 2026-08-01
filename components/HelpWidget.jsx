'use client';

/* Nút Hỏi đáp nổi góc phải màn hình — mở bảng giải đáp nhanh:
   định nghĩa chỉ số, nguồn dữ liệu từng báo cáo, cách dùng bộ lọc.
   Nội dung theo đúng quy tắc PKT đã chốt. */

import { useEffect, useState } from 'react';

const FAQ = [
  {
    q: 'GMV, CO, PL1, PL2A, ARPO là gì?',
    a: (
      <>
        <p><b>GMV</b> = Σ Thành tiền (VND) của đơn trong kỳ. <b>CO (Giá vốn)</b> = Σ Giá Vốn (VND). <b>%CO</b> = CO ÷ GMV.</p>
        <p><b>PL1</b> (= Lợi nhuận gộp GP) = GMV − CO. <b>PL2A</b> = PL1 − phí sàn quy VND. <b>ARPO</b> = GMV ÷ số đơn Hoàn Tất.</p>
        <p>Chuỗi quan hệ: GMV → (− giá vốn) → PL1 → (− phí sàn) → PL2A; %CO + %PL1/GMV = 100%.</p>
      </>
    ),
  },
  {
    q: 'PKT8 lấy số từ đâu?',
    a: (
      <>
        <p>Gộp 2 module: <b>Quản lý đơn hàng</b> (file Giá Vốn BE, tính tiền đơn Hoàn Tất theo Ngày hoàn tất) và <b>API sàn G1/G2</b> (toàn bộ đơn Hoàn Tất, quy VND theo tỷ giá tuần).</p>
        <p>Đơn trùng Order ID giữa 2 module là <b>đơn bù trả thiếu hàng</b> — doanh thu vẫn tính, danh sách xem ở PKT9.</p>
        <p>Tháng đã chốt sổ nằm trong kho dữ liệu tĩnh (nhanh, không đổi); tháng hiện tại đọc live, tự làm mới 60 giây.</p>
      </>
    ),
  },
  {
    q: 'PKT6 khác PKT8 thế nào?',
    a: (
      <>
        <p><b>PKT6 — CPV theo lịch sử ví HQS</b>: tiền <b>THỰC NHẬN về ví sàn</b> (đã trừ phí), chỉ tính các dòng đánh dấu DT trên tab THVí Tiền.</p>
        <p><b>PKT8 — CPV BE HQS</b>: doanh thu – giá vốn theo <b>đơn hàng</b> ghi nhận ở BE. Hai góc nhìn bổ trợ nhau: PKT8 đo bán hàng, PKT6 đo tiền thật về ví.</p>
      </>
    ),
  },
  {
    q: 'Trang team (Tầng 3) xem gì?',
    a: (
      <>
        <p>Mỗi team (HQS100/200/400/500) chỉ thấy số của BU mình. Nút <b>CPV theo BE / CPV theo LS Ví</b> ở góc trên trái để đổi kiểu xem.</p>
        <p>Quyền xem từng trang do Admin cấp trong Nguồn &amp; Cấu hình → Quản lý đăng nhập.</p>
      </>
    ),
  },
  {
    q: 'Lọc thời gian & so sánh tháng?',
    a: (
      <>
        <p>Chọn TỪ NGÀY / ĐẾN NGÀY hoặc nút nhanh <b>7N · 30N · Tháng này · Cả năm · Cả kỳ</b> — mọi KPI, bảng, biểu đồ đổi theo.</p>
        <p>Bấm <b>Cả năm</b> để xem cụm biểu đồ "theo THÁNG" so các tháng với nhau trên đủ chỉ số.</p>
      </>
    ),
  },
  {
    q: 'Mẹo dùng bảng số liệu',
    a: (
      <>
        <p>Bấm <b>tiêu đề cột</b> để sắp xếp (giảm → tăng → bỏ). Ô <b>Lọc nhanh</b> tìm theo mọi cột. <b>Tải CSV</b> xuất đúng phần đang lọc.</p>
        <p>Dòng <b>TỔNG</b> cộng theo các dòng đang lọc; cột % được tính lại từ tổng, không cộng thô.</p>
      </>
    ),
  },
  {
    q: 'Số liệu lệch với file gốc?',
    a: (
      <>
        <p>Xem <b>PKT9 — Đối soát lệch đơn</b>: số gốc từng module, bảng đối soát nguyên tệ theo tháng và danh sách đơn trùng.</p>
        <p>Vẫn lệch không rõ nguyên nhân → báo Admin <span className="mono">quynhhtn@hqplay.vn</span> kèm ảnh chụp và khoảng thời gian đang lọc.</p>
      </>
    ),
  },
];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button className="help-fab" onClick={() => setOpen(true)} aria-label="Hỏi đáp" title="Hỏi đáp">
        <span className="help-fab-icon">?</span>
        <span className="help-fab-text">Hỏi đáp</span>
      </button>
      {open ? (
        <div className="help-backdrop" onClick={() => setOpen(false)}>
          <aside className="help-panel" onClick={(e) => e.stopPropagation()}>
            <div className="help-head">
              <h3>Hỏi đáp nhanh</h3>
              <button className="help-close" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>
            <div className="help-body">
              {FAQ.map((item, i) => (
                <details key={i} className="help-item" open={i === 0}>
                  <summary>{item.q}</summary>
                  <div className="help-answer">{item.a}</div>
                </details>
              ))}
            </div>
            <div className="help-foot">
              Chưa có câu trả lời chị/anh cần? Liên hệ Admin: <span className="mono">quynhhtn@hqplay.vn</span>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
