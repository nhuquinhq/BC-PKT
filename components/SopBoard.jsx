'use client';

/* ============================================================
   Trang xem SOP Phòng Kế toán (PKT30) và SOP Liên phòng ban (PKT31).

   Dữ liệu chép từ repo nhuquinhq/sop-pkt (lib/sop/*). Sửa SOP thì sửa
   ở repo gốc rồi chép lại — đừng sửa tay hai nơi.

   Mỗi SOP gồm: thông tin vận hành · các bước theo lane · RACI ·
   điểm bàn giao · chốt kiểm soát. Chọn SOP bằng dải nút bên trên.
   ============================================================ */

import { useMemo, useState } from 'react';

/* Nhãn loại nút của sơ đồ, để đọc được luồng mà không cần vẽ BPMN */
const LOAI = {
  start: 'Bắt đầu',
  end: 'Kết thúc',
  task: 'Việc',
  decision: 'Quyết định',
  gateway: 'Rẽ nhánh',
  event: 'Sự kiện',
  sub: 'Việc con',
};

export default function SopBoard({ sops, org }) {
  const ds = useMemo(() => (Array.isArray(sops) ? sops : []), [sops]);
  const [chon, setChon] = useState(0);
  const sop = ds[chon] || null;

  /* Nhóm các bước theo lane để đọc "ai làm gì" thay vì một mớ node rời */
  const theoLane = useMemo(() => {
    if (!sop?.nodes?.length) return [];
    const lanes = sop.lanes || [];
    const nhom = lanes.map((l, i) => ({ lane: l, i, nodes: [] }));
    for (const n of sop.nodes) {
      const g = nhom[n.lane];
      if (g) g.nodes.push(n);
    }
    for (const g of nhom) g.nodes.sort((a, b) => (a.col ?? 0) - (b.col ?? 0));
    return nhom.filter((g) => g.nodes.length);
  }, [sop]);

  if (!ds.length) {
    return (
      <section className="panel">
        <div className="panel-body">
          <div className="empty-state"><b>Chưa có SOP nào trong bộ dữ liệu.</b></div>
        </div>
      </section>
    );
  }

  return (
    <>
      {org ? (
        <div className="notice-amber" style={{ marginBottom: 18 }}>
          <b>{org.title} — {org.version}.</b> {org.goal}
        </div>
      ) : null}

      <div className="src-toggle" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {ds.map((s, i) => (
          <button
            key={s.id || i}
            className={`qbtn${chon === i ? ' on' : ''}`}
            onClick={() => setChon(i)}
            title={s.name}
          >
            {s.code || s.name}
          </button>
        ))}
      </div>

      {sop ? (
        <>
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
                          {n.type && LOAI[n.type] && n.type !== 'task' ? (
                            <span className="tag" style={{ marginLeft: 8 }}>{LOAI[n.type]}</span>
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
      ) : null}
    </>
  );
}
