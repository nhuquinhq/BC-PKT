'use client';

/* Nút Hỏi đáp nổi góc phải màn hình.
   Người dùng TỰ GÕ câu hỏi — widget dò từ khóa trong kho kiến thức của
   báo cáo để trả lời; danh sách câu hỏi sẵn chỉ là GỢI Ý (chip bấm nhanh).
   Không khớp mục nào → nút gửi câu hỏi cho Admin qua email. */

import { useEffect, useRef, useState } from 'react';

const normText = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();

/* Kho kiến thức: keywords so khớp sau khi bỏ dấu. Thêm mục mới tại đây. */
const KB = [
  {
    q: 'GMV là gì, tính thế nào?',
    keywords: ['gmv', 'doanh thu vnd', 'thanh tien', 'tong giao dich'],
    a: <p><b>GMV</b> (Doanh thu VND) = Σ Thành tiền của các đơn trong kỳ đang lọc. Trên PKT8 chỉ đơn Hoàn Tất được tính tiền; trên PKT6 là tiền thực nhận về ví (dòng cờ DT).</p>,
  },
  {
    q: 'Giá vốn (CO) và %CO lấy từ đâu?',
    keywords: ['gia von', 'co ', '%co', 'cogs', 'von'],
    a: <p><b>CO (Giá vốn)</b> = Σ cột Giá Vốn (VND) trên file nguồn — hệ thống tự chọn đúng cột Giá Vốn đứng ngay trước cột Lợi Nhuận khi file có nhiều cột trùng tên. <b>%CO</b> = CO ÷ GMV × 100.</p>,
  },
  {
    q: 'PL1, PL2A khác nhau thế nào?',
    keywords: ['pl1', 'pl2a', 'pl2', 'loi nhuan', 'lai gop', 'bien loi nhuan', 'gp'],
    a: <p><b>PL1</b> (= Lợi nhuận gộp GP) = GMV − Giá vốn. <b>PL2A</b> = PL1 − phí sàn quy VND (phí USD nhân tỷ giá của chính đơn đó). Chuỗi: GMV → PL1 → PL2A.</p>,
  },
  {
    q: 'ARPO là gì?',
    keywords: ['arpo', 'binh quan don', 'trung binh don', 'gia tri don'],
    a: <p><b>ARPO</b> = GMV ÷ số đơn Hoàn Tất trong kỳ — doanh thu bình quân trên mỗi đơn.</p>,
  },
  {
    q: 'Tỷ giá quy đổi USD → VND lấy ở đâu?',
    keywords: ['ty gia', 'quy doi', 'usd', 'vnd', 'ngoai te', 'nguyen te'],
    a: <p>Đơn API sàn quy VND bằng <b>TỶ GIÁ TUẦN</b> đọc từ cột Tỷ giá tuần của file Quản lý đơn hàng, khớp theo Ngày hoàn tất; thiếu mới dùng tỷ giá suy từ doanh thu. Cột "Tỷ giá BQ" trên bảng module là tỷ giá bình quân thực áp. Tỷ giá thị trường xem PKT1.</p>,
  },
  {
    q: 'PKT8 lấy số từ đâu?',
    keywords: ['pkt8', 'nguon du lieu', 'be hqs', 'module', 'file nao', 'lay so'],
    a: (
      <>
        <p>PKT8 gộp 2 module: <b>Quản lý đơn hàng</b> (file Giá Vốn BE) + <b>API sàn G1/G2</b> (quy VND theo tỷ giá tuần).</p>
        <p>Tháng đã chốt nằm trong kho dữ liệu tĩnh; tháng hiện tại đọc live, tự làm mới 60 giây. Bảng cuối trang đối soát số gốc từng module.</p>
      </>
    ),
  },
  {
    q: 'Đơn trùng giữa 2 module xử lý sao?',
    keywords: ['don trung', 'trung don', 'don bu', 'dedup', 'order id', 'tra thieu hang'],
    a: <p>Đơn có Order ID xuất hiện ở cả hai file là <b>đơn bù trả thiếu hàng cho khách</b> — doanh thu VẪN TÍNH ở cả hai module theo quy tắc PKT. Danh sách chi tiết xem bảng "Đơn trùng giữa 2 module" trên PKT9.</p>,
  },
  {
    q: 'PKT6 (lịch sử ví) khác PKT8 thế nào?',
    keywords: ['pkt6', 'lich su vi', 'vi san', 'thuc nhan', 'sau phi', 'vi tien'],
    a: <p><b>PKT6</b> đo tiền <b>THỰC NHẬN về ví sàn</b> (đã trừ phí, chỉ dòng đánh dấu DT trên tab THVí Tiền). <b>PKT8</b> đo doanh thu – giá vốn theo đơn hàng BE. PKT8 nói mình bán được bao nhiêu, PKT6 nói tiền thật về ví bao nhiêu.</p>,
  },
  {
    q: 'Trang team (Tầng 3) xem gì, đổi kiểu xem ở đâu?',
    keywords: ['team', 'tang 3', 'hqs100', 'hqs200', 'hqs400', 'hqs500', 'bu1', 'bu2', 'bu4', 'bu5', 'kieu xem'],
    a: <p>Mỗi trang team chỉ hiện số của BU mình (HQS100=BU1 · HQS200=BU2 · HQS400=BU4 · HQS500=BU5). Nút <b>CPV theo BE / CPV theo LS Ví</b> góc trên trái để đổi giữa hai kiểu xem.</p>,
  },
  {
    q: 'PKT9 đối soát những gì?',
    keywords: ['pkt9', 'doi soat', 'lech', 'khop so', 'kiem tra so'],
    a: <p><b>PKT9 — Đối soát lệch đơn</b>: số gốc từng module (bảng module + bảng nguyên tệ THÁNG × MODULE) và danh sách đơn trùng kèm chênh lệch USD từng đơn. Số trên báo cáo lệch với file gốc thì soi ở đây trước.</p>,
  },
  {
    q: 'Lọc thời gian và so sánh tháng dùng sao?',
    keywords: ['loc thoi gian', 'tu ngay', 'den ngay', '7n', '30n', 'thang nay', 'ca nam', 'ca ky', 'so sanh thang'],
    a: <p>Chọn TỪ NGÀY / ĐẾN NGÀY hoặc nút nhanh <b>7N · 30N · Tháng này · Cả năm · Cả kỳ</b> — mọi số trên trang đổi theo. Bấm <b>Cả năm</b> để cụm biểu đồ "theo THÁNG" so các tháng cạnh nhau.</p>,
  },
  {
    q: 'SPDV phân loại theo cột nào?',
    keywords: ['spdv', 'phan loai', 'loai dich vu', 'gift card', 'razer', 'topup', 'currency', 'robux', 'gamepass'],
    a: <p>Theo cột R "LOẠI DỊCH VỤ" trên file BE: Gift Card → GIFT CARD · Robux 120h + Gamepass → CURRENCY · Top up → TOPUP · Nick → ACCOUNT · Bán Item → ITEM · Razer Gold để nhóm riêng.</p>,
  },
  {
    q: 'Đơn thất bại / hoàn hủy tính thế nào?',
    keywords: ['that bai', 'hoan huy', 'huy', 'fail', 'ti le'],
    a: <p>Đơn Thất bại / Hoàn hủy được <b>đếm số lượng</b> trong bảng ĐƠN HÀNG (tỉ lệ tính trên tổng đơn ghi nhận). Tiền của đơn hủy chỉ tính khi file gốc có ghi (các tháng đầu năm theo sheet PKT).</p>,
  },
  {
    q: 'Sắp xếp bảng, lọc nhanh, tải CSV?',
    keywords: ['sap xep', 'loc nhanh', 'tai csv', 'xuat file', 'excel', 'bang'],
    a: <p>Bấm <b>tiêu đề cột</b> để sắp xếp (giảm → tăng → bỏ). Ô <b>Lọc nhanh</b> tìm trên mọi cột. <b>Tải CSV</b> xuất đúng phần đang lọc. Dòng <b>TỔNG</b> cộng theo dòng đang lọc, cột % tính lại từ tổng.</p>,
  },
  {
    q: 'Đăng nhập & phân quyền hoạt động sao?',
    keywords: ['dang nhap', 'phan quyen', 'quyen', 'admin', 'tai khoan', 'google', 'cap quyen'],
    a: <p>Đăng nhập bằng Google; tài khoản mới ở trạng thái chờ đến khi Admin cấp quyền trong <b>Nguồn &amp; Cấu hình → Quản lý đăng nhập</b> (chọn được từng trang cho từng người). Admin: <span className="mono">quynhhtn@hqplay.vn</span>.</p>,
  },
  {
    q: 'Cài web thành app trên điện thoại?',
    keywords: ['dien thoai', 'mobile', 'app', 'cai dat', 'pwa', 'man hinh chinh'],
    a: <p>Mở trang trên trình duyệt điện thoại → menu <b>Thêm vào màn hình chính</b> (Add to Home Screen) — web chạy như app riêng, có icon HQ.</p>,
  },
  {
    q: 'Số cập nhật bao lâu một lần?',
    keywords: ['cap nhat', 'realtime', 'lam moi', 'tre', 'moi nhat', 'live'],
    a: <p>Trang CPV tự làm mới <b>60 giây/lần</b> từ file publish (tháng hiện tại); tháng đã chốt là số tĩnh đã đối soát. Nút <b>Làm mới</b> trên thanh lọc ép tải lại ngay.</p>,
  },
];

const SUGGEST = ['GMV là gì, tính thế nào?', 'PKT8 lấy số từ đâu?', 'PKT6 (lịch sử ví) khác PKT8 thế nào?', 'Đơn trùng giữa 2 module xử lý sao?', 'Lọc thời gian và so sánh tháng dùng sao?', 'Số liệu lệch thì đối soát ở đâu?'];

function search(question) {
  const qn = normText(question);
  if (!qn) return [];
  const scored = KB.map((item) => {
    let score = 0;
    for (const kw of item.keywords) if (qn.includes(normText(kw))) score += 2;
    for (const w of normText(item.q).split(' ')) if (w.length > 3 && qn.includes(w)) score += 1;
    return { item, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((x) => x.item);
}

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState('');
  const [results, setResults] = useState(null); // null = chưa hỏi
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = (text) => {
    const question = (text ?? q).trim();
    if (!question) return;
    setQ(question);
    setAsked(question);
    setResults(search(question));
  };

  const mailHref = `mailto:quynhhtn@hqplay.vn?subject=${encodeURIComponent('[BC PKT] Câu hỏi về báo cáo')}&body=${encodeURIComponent(`Câu hỏi: ${asked || q}\n\n(Ghi rõ trang báo cáo và khoảng thời gian đang lọc nếu liên quan số liệu)`)}`;

  return (
    <>
      <button className="help-fab" onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 60); }} aria-label="Hỏi đáp" title="Hỏi đáp">
        <span className="help-fab-icon">?</span>
        <span className="help-fab-text">Hỏi đáp</span>
      </button>
      {open ? (
        <div className="help-backdrop" onClick={() => setOpen(false)}>
          <aside className="help-panel" onClick={(e) => e.stopPropagation()}>
            <div className="help-head">
              <h3>Hỏi đáp</h3>
              <button className="help-close" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
            </div>
            <div className="help-body">
              <form
                className="help-ask"
                onSubmit={(e) => { e.preventDefault(); ask(); }}
              >
                <input
                  ref={inputRef}
                  className="input"
                  placeholder="Gõ câu hỏi của chị/anh…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button className="btn" type="submit">Hỏi</button>
              </form>

              {results !== null ? (
                results.length ? (
                  <div className="help-results">
                    <div className="help-label">Trả lời cho: “{asked}”</div>
                    {results.map((item, i) => (
                      <div key={i} className="help-item help-item-open">
                        <div className="help-q">{item.q}</div>
                        <div className="help-answer">{item.a}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="help-results">
                    <div className="help-empty">
                      <b>Chưa có sẵn câu trả lời cho câu này.</b>
                      <p>Chị/anh gửi thẳng cho Admin — kèm trang báo cáo và khoảng thời gian đang lọc nếu hỏi về số liệu.</p>
                      <a className="btn" href={mailHref}>Gửi câu hỏi cho Admin ✉</a>
                    </div>
                  </div>
                )
              ) : null}

              <div className="help-label" style={{ marginTop: 14 }}>Gợi ý câu hỏi</div>
              <div className="help-chips">
                {SUGGEST.map((s) => (
                  <button key={s} className="help-chip" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="help-foot">
              Cần hỗ trợ trực tiếp: Admin <span className="mono">quynhhtn@hqplay.vn</span>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
