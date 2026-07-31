'use client';

import { useMemo, useState } from 'react';
import { fmtCell, isNumericType, toNumber } from '@/lib/format';

const TOTAL_HINT = /^(tổng|TỔNG|PL7|TA|TL|EQ|RE|= )/;

export default function DataTable({ table, rows = [], live = false, onExport }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(null); // { key, dir: 1 | -1 }

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(s)));
    }
    if (sort) {
      const col = table.columns.find((c) => c.key === sort.key);
      const num = col && isNumericType(col.type);
      out = [...out].sort((a, b) => {
        const va = a[sort.key];
        const vb = b[sort.key];
        if (va == null || va === '') return 1;
        if (vb == null || vb === '') return -1;
        if (num) {
          const na = toNumber(va);
          const nb = toNumber(vb);
          return ((na ?? -Infinity) - (nb ?? -Infinity)) * sort.dir;
        }
        return String(va).localeCompare(String(vb), 'vi', { numeric: true }) * sort.dir;
      });
    }
    return out;
  }, [rows, q, sort, table.columns]);

  /* Bấm tiêu đề cột: lần 1 giảm dần, lần 2 tăng dần, lần 3 bỏ sắp xếp */
  const toggleSort = (key) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: -1 };
      if (s.dir === -1) return { key, dir: 1 };
      return null;
    });
  };

  const hasData = rows.length > 0;

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{table.title}{live ? <span className="tag live-tag">● LIVE</span> : null}</h2>
          {table.hint ? <div className="hint">{table.hint}</div> : null}
        </div>
        <div className="stack">
          <span className="tag">{rows.length} dòng</span>
          {hasData ? (
            <input
              className="input"
              placeholder="Lọc nhanh…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 160 }}
            />
          ) : null}
          {hasData && onExport ? (
            <button className="btn ghost" onClick={() => onExport(table)}>Tải CSV</button>
          ) : null}
        </div>
      </div>

      <div className="panel-body" style={{ padding: hasData ? 0 : 18 }}>
        {hasData ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  {table.columns.map((c) => (
                    <th
                      key={c.key}
                      className={`sortable${isNumericType(c.type) ? ' num' : ''}${sort?.key === c.key ? ' sorted' : ''}`}
                      title="Bấm để sắp xếp"
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.label}
                      {sort?.key === c.key ? <span className="sort-arrow">{sort.dir === -1 ? ' ▼' : ' ▲'}</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const first = String(r[table.columns[0].key] ?? '') + String(r[table.columns[1]?.key] ?? '');
                  const isTotal = TOTAL_HINT.test(first.trim()) || /TỔNG|LỢI NHUẬN SAU CÙNG|DOANH THU NET|LÃI SAU/.test(first);
                  return (
                    <tr key={i} className={isTotal ? 'total' : ''}>
                      {table.columns.map((c) => {
                        const v = r[c.key];
                        const num = isNumericType(c.type);
                        const n = num ? toNumber(v) : null;
                        const cls = [num ? 'num' : '', num && n !== null && n < 0 ? 'down' : ''].filter(Boolean).join(' ');
                        return <td key={c.key} className={cls}>{fmtCell(v, c.type)}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <b>Bảng chưa có dữ liệu.</b>
            <div style={{ marginTop: 6 }}>
              Nạp bằng khối <b>Nguồn dữ liệu</b> ở đầu trang (dán CSV / kết nối sheet nguồn).
            </div>
            <div className="mono" style={{ marginTop: 10, fontSize: 11 }}>
              Cột cần chuẩn bị: {table.columns.map((c) => c.key).join(' · ')}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
