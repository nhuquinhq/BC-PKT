import Link from 'next/link';
import { REPORTS } from '@/lib/reports';

export default function Home() {
  return (
    <>
      <div className="hero">
        <div className="mark">PHÒNG KẾ TOÁN · HQ GROUP</div>
        <h1>Bảy báo cáo, một nguồn số duy nhất</h1>
        <p>
          Mỗi báo cáo dưới đây trả lời một nhóm câu hỏi cố định của Ban điều hành, có hạn nộp riêng và
          nguồn dữ liệu riêng. Số liệu đi theo đúng từ điển khái niệm tài chính HQS: GMV → RR → RE → COGS → PL1 → PL2A → PL2 → PL7.
        </p>
      </div>

      <div className="content">
        <div className="home-grid">
          {REPORTS.map((r) => (
            <Link key={r.slug} href={`/bao-cao/${r.slug}`} className="home-card">
              <div className="stack" style={{ justifyContent: 'space-between' }}>
                <span className="tag">{r.code}</span>
                <span className="tag sla">Hạn: {r.sla}</span>
              </div>
              <h3>{r.name}</h3>
              <div className="muted" style={{ marginBottom: 10 }}>{r.source}</div>
              <ul className="purpose">
                {r.purpose.slice(0, 2).map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <div className="mono" style={{ marginTop: 12, fontSize: 10.5, color: 'var(--ink-3)' }}>
                {r.kpis.length} chỉ số · {r.tables.length} bảng · {r.charts.length} biểu đồ
              </div>
            </Link>
          ))}
        </div>

        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head"><h2>Lịch phát hành trong tháng</h2></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Mã</th><th>Báo cáo</th><th>Hạn nộp</th><th>Kỳ hiển thị</th><th>Nguồn dữ liệu</th>
                  </tr>
                </thead>
                <tbody>
                  {REPORTS.map((r) => (
                    <tr key={r.slug}>
                      <td className="mono">{r.code}</td>
                      <td><Link href={`/bao-cao/${r.slug}`}>{r.name}</Link></td>
                      <td>{r.sla}</td>
                      <td className="mono">{r.periods.join(' · ')}</td>
                      <td>{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
