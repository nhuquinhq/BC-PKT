import { REPORTS } from '@/lib/reports';

export const metadata = { title: 'Nguồn dữ liệu & kiến trúc | HQ Group' };

export default function DataSourcePage() {
  return (
    <>
      <div className="topbar">
        <div className="topbar-row">
          <div>
            <div className="eyebrow">SRC · Thiết lập hệ thống</div>
            <h1>Nguồn dữ liệu &amp; kiến trúc luồng số</h1>
          </div>
        </div>
      </div>

      <div className="content">
        <section className="panel">
          <div className="panel-head">
            <h2>Luồng dữ liệu từ file gốc đến báo cáo</h2>
            <span className="tag">3 cách nạp · 1 lớp chuẩn hoá</span>
          </div>
          <div className="panel-body">
            <FlowDiagram />
          </div>
        </section>

        <div className="grid-2">
          <section className="panel">
            <div className="panel-head"><h2>1 · Google Sheet (ưu tiên)</h2></div>
            <div className="panel-body" style={{ lineHeight: 1.75, fontSize: 13 }}>
              Mở sheet nguồn → <b>Share</b> → <b>Anyone with the link · Viewer</b>. Copy link, dán vào ô
              “Link Google Sheet” trong khối <b>Nguồn dữ liệu</b> của từng báo cáo, chọn đúng tab bằng GID.
              <div className="muted" style={{ marginTop: 10 }}>
                Dòng đầu của tab phải là dòng tiêu đề, tên cột trùng <span className="mono">key</span> hoặc nhãn cột đã khai báo.
                Server đọc qua <span className="mono">/api/sheet</span> nên không vướng CORS.
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>2 · Dán CSV / TSV</h2></div>
            <div className="panel-body" style={{ lineHeight: 1.75, fontSize: 13 }}>
              Bôi đen vùng dữ liệu trong Google Sheet hoặc Excel (kèm dòng tiêu đề) → Ctrl+C → dán vào ô
              “Dán CSV / TSV”. Dùng khi cần xem nhanh một kỳ mà chưa muốn chia sẻ sheet.
              <div className="muted" style={{ marginTop: 10 }}>Dữ liệu chỉ nằm trên trình duyệt đang mở.</div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>3 · File JSON trong dự án</h2></div>
            <div className="panel-body" style={{ lineHeight: 1.75, fontSize: 13 }}>
              Số đã chốt thì ghi vào <span className="mono">public/data/pkt1.json … pkt7.json</span> rồi commit.
              Đây là bản chính thức, đi cùng lịch sử Git và tự deploy khi push lên Vercel.
              <div className="mono muted" style={{ marginTop: 10, fontSize: 11.5 }}>
                {'{ meta: {…}, kpis: { mã_kpi: giá trị }, tables: { mã_bảng: [ {…} ] } }'}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Thứ tự ưu tiên khi hiển thị</h2></div>
            <div className="panel-body" style={{ lineHeight: 1.75, fontSize: 13 }}>
              Dữ liệu nạp trên trình duyệt <b>đè lên</b> file JSON; file JSON <b>đè lên</b> khung rỗng.
              Bấm <b>Xoá dữ liệu đã nạp</b> để quay về đúng số trong file JSON.
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-head"><h2>Bảng khai báo cột — chuẩn bị dữ liệu theo đúng tên này</h2></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Báo cáo</th><th>Mã bảng</th><th>Tên bảng</th><th>Cột cần có (tên key)</th></tr>
                </thead>
                <tbody>
                  {REPORTS.flatMap((r) =>
                    r.tables.map((t) => (
                      <tr key={r.slug + t.id}>
                        <td className="mono">{r.code}</td>
                        <td className="mono">{t.id}</td>
                        <td>{t.title}</td>
                        <td className="mono" style={{ whiteSpace: 'normal', fontSize: 11.5 }}>
                          {t.columns.map((c) => c.key).join(' · ')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function FlowDiagram() {
  const box = (x, y, w, h, fill, stroke) => ({ x, y, width: w, height: h, rx: 4, fill, stroke, strokeWidth: 1 });
  return (
    <svg viewBox="0 0 980 430" style={{ width: '100%', height: 'auto' }} role="img" aria-label="Sơ đồ luồng dữ liệu">
      <defs>
        <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L7,3 z" fill="#6c7ba3" />
        </marker>
      </defs>

      {/* lanes */}
      {[
        { y: 30, h: 90, label: 'NGUỒN' },
        { y: 145, h: 80, label: 'CHUẨN HOÁ' },
        { y: 250, h: 70, label: 'LƯU' },
        { y: 345, h: 70, label: 'TRÌNH BÀY' },
      ].map((l) => (
        <g key={l.label}>
          <rect x="0" y={l.y} width="980" height={l.h} fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.10)" />
          <text x="10" y={l.y + l.h / 2 + 3} fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="#6c7ba3" letterSpacing="1.5">{l.label}</text>
        </g>
      ))}

      {/* Lane 1 - sources */}
      {[
        { x: 110, t: 'Google Sheet', s: 'Tỉ giá · P&L · MISA export' },
        { x: 400, t: 'Excel / CSV', s: 'Dán trực tiếp vùng dữ liệu' },
        { x: 690, t: 'public/data/*.json', s: 'Số đã chốt, đi theo Git' },
      ].map((n) => (
        <g key={n.t}>
          <rect {...box(n.x, 50, 220, 50, 'rgba(255,255,255,.05)', 'rgba(255,255,255,.18)')} />
          <text x={n.x + 14} y={70} fontSize="13" fontFamily="IBM Plex Sans, sans-serif" fill="#eaf0ff" fontWeight="600">{n.t}</text>
          <text x={n.x + 14} y={87} fontSize="10.5" fontFamily="IBM Plex Sans, sans-serif" fill="#6c7ba3">{n.s}</text>
          <line x1={n.x + 110} y1="100" x2={n.x + 110} y2="163" stroke="#6c7ba3" markerEnd="url(#ar)" />
        </g>
      ))}

      {/* Lane 2 - normalize */}
      {[
        { x: 110, t: '/api/sheet', s: 'Proxy CSV, tránh CORS' },
        { x: 400, t: 'parseDelimited()', s: 'Papaparse đọc CSV/TSV' },
        { x: 690, t: 'fetchJson()', s: 'Đọc file tĩnh' },
      ].map((n) => (
        <g key={n.t}>
          <rect {...box(n.x, 163, 220, 46, 'rgba(34,211,238,.08)', 'rgba(34,211,238,.55)')} />
          <text x={n.x + 14} y={181} fontSize="12.5" fontFamily="IBM Plex Mono, monospace" fill="#7ee7f5">{n.t}</text>
          <text x={n.x + 14} y={198} fontSize="10.5" fontFamily="IBM Plex Sans, sans-serif" fill="#6c7ba3">{n.s}</text>
        </g>
      ))}

      {/* converge */}
      <path d="M220,209 L220,232 L490,232" fill="none" stroke="#6c7ba3" />
      <path d="M800,209 L800,232 L510,232" fill="none" stroke="#6c7ba3" />
      <line x1="510" y1="209" x2="510" y2="268" stroke="#6c7ba3" markerEnd="url(#ar)" />

      {/* Lane 3 - store */}
      <rect {...box(330, 268, 360, 44, 'rgba(124,92,255,.22)', 'rgba(124,92,255,.6)')} />
      <text x="348" y="288" fontSize="12.5" fontFamily="IBM Plex Mono, monospace" fill="#eaf0ff">mapRows(rows, columns)</text>
      <text x="348" y="304" fontSize="10.5" fontFamily="IBM Plex Sans, sans-serif" fill="#a6b3d4">Khớp tên cột → lưu localStorage theo từng báo cáo</text>
      <line x1="510" y1="312" x2="510" y2="363" stroke="#6c7ba3" markerEnd="url(#ar)" />

      {/* Lane 4 - render */}
      {[
        { x: 110, t: 'KPI cards', s: 'Mã chỉ số HQS' },
        { x: 400, t: 'Bảng chi tiết', s: 'Lọc · Tải CSV' },
        { x: 690, t: 'Biểu đồ', s: 'Line · Bar · Pie · Scatter' },
      ].map((n) => (
        <g key={n.t}>
          <rect {...box(n.x, 363, 220, 44, 'rgba(255,255,255,.05)', 'rgba(255,255,255,.18)')} />
          <text x={n.x + 14} y={382} fontSize="12.5" fontFamily="IBM Plex Sans, sans-serif" fill="#eaf0ff" fontWeight="600">{n.t}</text>
          <text x={n.x + 14} y={398} fontSize="10.5" fontFamily="IBM Plex Sans, sans-serif" fill="#6c7ba3">{n.s}</text>
        </g>
      ))}
      <line x1="330" y1="385" x2="392" y2="385" stroke="#6c7ba3" markerEnd="url(#ar)" />
      <line x1="620" y1="385" x2="682" y2="385" stroke="#6c7ba3" markerEnd="url(#ar)" />
    </svg>
  );
}
