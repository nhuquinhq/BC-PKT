'use client';

/* ============================================================
   Khối tra cứu mã đơn của PKT15 — Check kho flip.

   Ô nhập nhận cả cột copy thẳng từ Google Sheet (mỗi mã một dòng),
   cũng chấp nhận dán ngang cách nhau bằng dấu phẩy / tab / khoảng
   trắng. Bấm Tra cứu thì gọi /api/timdon và đẩy kết quả lên bảng
   qua onLive như các khối LIVE khác.
   ============================================================ */

import { useCallback, useMemo, useState } from 'react';
import { sheetQuery } from '@/lib/sheetQuery';

function tachMa(raw) {
  return [...new Set(
    String(raw || '')
      .split(/[\s,;]+/)
      .map((x) => x.trim().replace(/^["']|["']$/g, '').toUpperCase())
      .filter(Boolean)
  )];
}

export default function TimDonBoard({ report, onLive }) {
  const [nhap, setNhap] = useState('');
  const [st, setSt] = useState({ trangThai: 'roi' });

  const ma = useMemo(() => tachMa(nhap), [nhap]);
  const thoMa = useMemo(() => String(nhap || '').split(/[\s,;]+/).filter(Boolean).length, [nhap]);

  const tra = useCallback(async () => {
    if (!ma.length) return;
    setSt({ trangThai: 'dangTra' });
    try {
      const res = await fetch('/api/timdon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ma,
          qsBe: sheetQuery(report.sheet),
          qsTaoMoi: sheetQuery(report.sheetTaoMoi),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không tra được');
      setSt({ trangThai: 'xong', data: json });
      onLive?.({ tables: { tim_don: json.ket_qua }, kpis: json.kpis });
    } catch (e) {
      setSt({ trangThai: 'loi', loi: e.message });
    }
  }, [ma, report, onLive]);

  function xoa() {
    setNhap('');
    setSt({ trangThai: 'roi' });
    onLive?.({ tables: { tim_don: [] }, kpis: {} });
  }

  const m = st.data?.meta;

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Dán mã đơn cần tra</h2>
          <span className="tag">{ma.length} mã</span>
        </div>
        <div className="panel-body">
          <div className="muted" style={{ marginBottom: 8 }}>
            Copy thẳng một cột mã từ Google Sheet rồi dán vào đây — mỗi dòng một mã.
            Dán ngang cách nhau bằng dấu phẩy, tab hay khoảng trắng cũng được.
            Tra được cả <b>Order ID</b> lẫn <b>mã đơn nội bộ</b>.
          </div>
          <textarea
            className="ma-nhap"
            rows={10}
            spellCheck={false}
            value={nhap}
            onChange={(e) => setNhap(e.target.value)}
            placeholder={'1780789076106REQS\n1780791234567REQS\n…'}
          />
          <div className="ma-hang">
            <button className="btn" onClick={tra} disabled={!ma.length || st.trangThai === 'dangTra'}>
              {st.trangThai === 'dangTra' ? '⏳ Đang tra…' : `🔎 Tra cứu ${ma.length} mã`}
            </button>
            <button className="btn ghost" onClick={xoa} disabled={!nhap}>Xoá</button>
            {thoMa > ma.length ? (
              <span className="muted">Đã bỏ {thoMa - ma.length} mã trùng nhau trong danh sách dán vào.</span>
            ) : null}
          </div>
        </div>
      </section>

      {st.trangThai === 'loi' ? (
        <div className="notice-amber" style={{ marginBottom: 18 }}>
          Không tra được — {st.loi}
        </div>
      ) : null}

      {m ? (
        <div className="notice-amber" style={{ marginBottom: 18 }}>
          <b>Phạm vi tra được:</b> {m.thang_tra_duoc?.length ? m.thang_tra_duoc.join(' · ') : 'chưa đọc được tháng nào'}.
          Các tháng đã chốt sổ chỉ lưu số gộp trong datalake, <b>không lưu từng mã đơn</b>, nên mã của những
          tháng đó sẽ trả về “Không tìm thấy” dù đơn có thật.
          {m.loi ? <> {' · '} <b>Lỗi đọc:</b> {m.loi}</> : null}
        </div>
      ) : null}
    </>
  );
}
