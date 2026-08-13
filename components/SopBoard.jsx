'use client';

/* ============================================================
   Trang SOP Phòng Kế toán (PKT30) và SOP Liên phòng ban (PKT31).
   Dữ liệu chép từ repo nhuquinhq/sop-pkt (lib/sop/*) — sửa SOP thì sửa
   ở repo gốc rồi chép lại, đừng sửa tay hai nơi.

   Ba lớp màn hình, đi theo đúng bố cục của site SOP gốc:
   1. TỔNG (PKT30): tiêu đề bộ SOP + số liệu tổng + hai loại SOP
   2. DANH SÁCH: lưới thẻ các SOP của loại đang chọn
   3. CHI TIẾT: thông tin vận hành · các bước theo vị trí · RACI ·
      điểm bàn giao · chốt kiểm soát
   PKT31 chỉ có bản liên phòng nên vào thẳng lớp 2.
   ============================================================ */

import { useMemo, useState } from 'react';
import { ORG, SOPS_NB } from '@/lib/sop/noi-bo';
import { SOPS_LP } from '@/lib/sop/lien-phong-ban';

const LOAI_NUT = {
  start: 'Bắt đầu', end: 'Kết thúc', decision: 'Quyết định',
  gateway: 'Rẽ nhánh', event: 'Sự kiện', sub: 'Việc con',
};

const XANH = '#00A651';
const VANG = '#D9A400';

/* ---------- Thẻ một SOP trong lưới danh sách ---------- */
function TheSop({ sop, onMo }) {
  const xong = String(sop.status || '').toLowerCase() === 'done';
  return (
    <div
      className="panel"
      onClick={onMo}
      style={{ cursor: 'pointer', margin: 0 }}
      title={`Mở ${sop.code}`}
    >
      <div className="panel-body">
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          {sop.code}{sop.position ? ` · ${sop.position}` : ''}
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{sop.name}</div>
        {sop.use || sop.tagline ? (
          <div className="muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>
            {sop.use || sop.tagline}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="tag" style={{ color: xong ? XANH : VANG, borderColor: 'currentColor' }}>
            {xong ? 'Done' : sop.status || 'Chờ bổ sung'}
          </span>
          {sop.cycle ? <span className="tag">{sop.cycle}</span> : null}
          {(sop.lanes || []).slice(0, 5).map((l, i) => (
            <span key={i} className="tag">{l.short || l.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Lớp 3: chi tiết một SOP ---------- */
function ChiTiet({ sop, onQuayLai }) {
  const theoLane = useMemo(() => {
    if (!sop?.nodes?.length) return [];
    const nhom = (sop.lanes || []).map((l, i) => ({ lane: l, i, nodes: [] }));
    for (const n of sop.nodes) nhom[n.lane]?.nodes.push(n);
    for (const g of nhom) g.nodes.sort((a, b) => (a.col ?? 0) - (b.col ?? 0));
    return nhom.filter((g) => g.nodes.length);
  }, [sop]);

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <button className="btn ghost" onClick={onQuayLai}>← Về danh sách</button>
      </div>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>{sop.code} — {sop.name}</h3>
          {sop.status ? <span className="tag">{sop.status}</span> : null}
        </div>
        <div className="panel-body">
          {sop.tagline ? <div className="muted" style={{ marginBottom: 10 }}>{sop.tagline}</div> : null}
          <table className="tbl">
            <tbody>
              {[
                ['Vị trí phụ trách', sop.position],
                ['Người chịu trách nhiệm', sop.owner],
                ['Khi nào chạy', sop.trigger],
                ['Chu kỳ', sop.cycle],
                ['Hệ thống dùng', sop.systems],
                ['Dùng để làm gì', sop.use],
                ['Ý nghĩa', sop.meaning],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ width: 210, whiteSpace: 'nowrap' }}><b>{k}</b></td>
                    <td>{v}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {theoLane.length ? (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-head">
            <h3>Các bước — theo từng vị trí</h3>
            <span className="tag">{sop.nodes.length} bước</span>
          </div>
          <div className="panel-body">
            {theoLane.map((g) => (
              <div key={g.i} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {g.lane?.name || `Vị trí ${g.i + 1}`}
                  {g.lane?.short ? <span className="tag" style={{ marginLeft: 8 }}>{g.lane.short}</span> : null}
                </div>
                <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.7 }}>
                  {g.nodes.map((n) => (
                    <li key={n.id}>
                      {String(n.label || '').split('\n').join(' ')}
                      {LOAI_NUT[n.type] ? (
                        <span className="tag" style={{ marginLeft: 8 }}>{LOAI_NUT[n.type]}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {sop.raci?.rows?.length ? (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-head">
            <h3>Phân vai RACI</h3>
            <span className="tag">R làm · A chịu trách nhiệm · C hỏi ý · I báo tin</span>
          </div>
          <div className="panel-body table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Công việc</th>
                  {(sop.raci.roles || []).map((r) => <th key={r}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {sop.raci.rows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.task}</td>
                    {(row.v || []).map((v, j) => <td key={j} className="num">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {sop.handoffs?.length ? (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-head">
            <h3>Điểm bàn giao</h3>
            <span className="tag">{sop.handoffs.length} điểm</span>
          </div>
          <div className="panel-body table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Từ</th><th>Sang</th><th>Bàn giao cái gì</th><th>Khi nào</th></tr>
              </thead>
              <tbody>
                {sop.handoffs.map((h, i) => (
                  <tr key={i}>
                    <td>{h.from}</td><td>{h.to}</td><td>{h.data}</td><td>{h.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {sop.controls?.length ? (
        <section className="panel" style={{ marginBottom: 18 }}>
          <div className="panel-head"><h3>Chốt kiểm soát</h3></div>
          <div className="panel-body">
            <ul style={{ margin: 0, paddingLeft: 22, lineHeight: 1.8 }}>
              {sop.controls.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

/* ---------- Số liệu tổng của một bộ SOP ---------- */
function thongKe(sops) {
  const buoc = sops.reduce((t, s) => t + (s.nodes?.length || 0), 0);
  const dauMoi = new Set();
  for (const s of sops) for (const l of s.lanes || []) dauMoi.add(l.short || l.name);
  const cho = sops.filter((s) => String(s.status || '').toLowerCase() !== 'done').length;
  return { soSop: sops.length, buoc, dauMoi: dauMoi.size, cho };
}

function OSo({ so, ten }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--f-disp)' }}>{so}</div>
      <div className="muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}>{ten}</div>
    </div>
  );
}

/* ---------- Lớp 2: danh sách SOP của một loại ---------- */
function DanhSach({ tieuDe, moTa, sops, onMoSop, onVeTong }) {
  const tk = thongKe(sops);
  return (
    <>
      {onVeTong ? (
        <div style={{ marginBottom: 14 }}>
          <button className="btn ghost" onClick={onVeTong}>← Về trang tổng</button>
        </div>
      ) : null}
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head"><h3>{tieuDe}</h3></div>
        <div className="panel-body">
          {moTa ? <div className="muted" style={{ marginBottom: 14 }}>{moTa}</div> : null}
          <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap' }}>
            <OSo so={tk.soSop} ten="Quy trình" />
            <OSo so={tk.buoc} ten="Bước công việc" />
            <OSo so={tk.dauMoi} ten="Đầu mối tham gia" />
            {tk.cho ? <OSo so={tk.cho} ten="Chờ bổ sung" /> : null}
          </div>
        </div>
      </section>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}
      >
        {sops.map((s, i) => <TheSop key={s.id || i} sop={s} onMo={() => onMoSop(i)} />)}
      </div>
    </>
  );
}

/* ============================================================ */
export default function SopBoard({ report }) {
  /* kind: 'nb' — trang tổng của bộ SOP Kế toán (PKT30)
           'lp' — chỉ bản liên phòng ban (PKT31), vào thẳng danh sách */
  const kind = report?.sheet?.kind === 'lp' ? 'lp' : 'nb';
  const nb = SOPS_NB;
  const lp = SOPS_LP;
  const org = ORG;
  /* man: 'tong' | 'nb' | 'lp' — PKT31 (kind='lp') vào thẳng danh sách */
  const [man, setMan] = useState(kind === 'lp' ? 'lp' : 'tong');
  const [sopMo, setSopMo] = useState(null); /* {loai, i} */

  const BO = {
    nb: {
      tieuDe: 'SOP Nội bộ Phòng Kế toán',
      moTa: '9 quy trình do từng vị trí tự thực hiện — Doanh thu · Dòng tiền · Kho · Thuế · Tài chính — kèm chuỗi bàn giao giữa 5 vị trí và các chốt kiểm soát.',
      sops: nb || [],
    },
    lp: {
      tieuDe: 'SOP Liên phòng ban',
      moTa: '6 quy trình phối hợp với PKD, PCU, các BU và nhà cung cấp — chỉ rõ bên nào giao gì, khi nào, và hậu quả nếu trễ hạn.',
      sops: lp || [],
    },
  };

  /* Lớp 3 — chi tiết */
  if (sopMo) {
    const sop = BO[sopMo.loai].sops[sopMo.i];
    if (sop) return <ChiTiet sop={sop} onQuayLai={() => setSopMo(null)} />;
  }

  /* Lớp 2 — danh sách của loại đang chọn */
  if (man === 'nb' || man === 'lp') {
    return (
      <DanhSach
        {...BO[man]}
        onMoSop={(i) => setSopMo({ loai: man, i })}
        onVeTong={kind === 'lp' ? null : () => setMan('tong')}
      />
    );
  }

  /* Lớp 1 — trang tổng (chỉ PKT30) */
  const tkNb = thongKe(BO.nb.sops);
  const tkLp = thongKe(BO.lp.sops);
  return (
    <>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h3>{org?.title || 'SOP PHÒNG KẾ TOÁN'}</h3>
          <span className="tag">{org?.version || ''}</span>
        </div>
        <div className="panel-body">
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Quy trình kế toán, tách theo người cần đọc.
          </div>
          <div className="muted" style={{ marginBottom: 16, lineHeight: 1.6 }}>
            Cùng một bộ SOP nhưng hai đối tượng khác nhau. Bản nội bộ dành cho 5 vị trí trong
            Phòng Kế toán. Bản liên phòng ban dành cho PKD, PCU, các BU và nhà cung cấp —
            chỉ gồm phần họ cần biết để phối hợp.
          </div>
          <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap' }}>
            <OSo so={tkNb.soSop + tkLp.soSop} ten="Quy trình" />
            <OSo so={tkNb.buoc + tkLp.buoc} ten="Bước công việc" />
            <OSo so={5} ten="Vị trí kế toán" />
            {tkNb.cho + tkLp.cho ? <OSo so={tkNb.cho + tkLp.cho} ten="Chờ bổ sung" /> : null}
          </div>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 14,
        }}
      >
        {[
          {
            key: 'nb', nhan: 'BẢN 1 · DÙNG TRONG PHÒNG', tieuDe: BO.nb.tieuDe, moTa: BO.nb.moTa,
            diem: ['Kế toán Doanh thu · Dòng tiền · Kho · Thuế · Tài chính', 'Chuỗi bàn giao giữa 5 vị trí và các chốt kiểm soát', 'Vai trò & luồng phê duyệt chung'],
            nut: 'Mở bản nội bộ →',
          },
          {
            key: 'lp', nhan: 'BẢN 2 · GỬI PHÒNG BAN KHÁC', tieuDe: BO.lp.tieuDe, moTa: BO.lp.moTa,
            diem: ['Đối soát doanh thu & giá vốn HQS10000', 'Duyệt thanh toán hàng hoá / tạm ứng / Topup ví', 'Kiểm kê kho & đối chiếu công nợ nhà cung cấp'],
            nut: 'Mở bản liên phòng ban →',
          },
        ].map((b) => (
          <div key={b.key} className="panel" onClick={() => setMan(b.key)} style={{ cursor: 'pointer', margin: 0 }}>
            <div className="panel-body">
              <div className="eyebrow" style={{ marginBottom: 8 }}>{b.nhan}</div>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>{b.tieuDe}</div>
              <div className="muted" style={{ marginBottom: 10, lineHeight: 1.55 }}>{b.moTa}</div>
              <ul className="muted" style={{ margin: '0 0 12px', paddingLeft: 20, lineHeight: 1.7 }}>
                {b.diem.map((d) => <li key={d}>{d}</li>)}
              </ul>
              <b>{b.nut}</b>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
