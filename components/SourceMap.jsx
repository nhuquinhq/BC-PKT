'use client';

/* Bản đồ nguồn dữ liệu: liệt kê mọi FILE hệ thống đang đọc và báo cáo
   nào dùng file đó. Tự gom từ khai báo sheet/sheetVi/mains/api trong
   lib/reports.js — đổi nguồn ở đó là bảng này tự cập nhật theo,
   cộng thêm các tháng đã chốt nằm trong datalake tĩnh. */

import { REPORTS } from '@/lib/reports';

/* Các tháng đã chốt đọc từ datalake trong repo (không gọi Google) */
const DATALAKE_ROWS = [
  {
    label: 'CPV BE các tháng đã chốt (kèm đối soát API + danh sách trùng)',
    file: 'lib/data/cpv-2026-01.json → cpv-2026-06.json',
    kind: 'DATALAKE',
    reps: ['PKT8', 'Tầng 3 (team)', 'Tầng 3B (sàn)', 'PKT9'],
  },
  {
    label: 'Lịch sử ví HQS các tháng đã chốt',
    file: 'lib/data/vi-2026-04.json → vi-2026-06.json',
    kind: 'DATALAKE',
    reps: ['PKT6', 'chế độ "CPV theo LS Ví" trang team/sàn'],
  },
];

function buildRows() {
  const map = new Map();
  const add = (url, gid, label, rep) => {
    if (!url) return;
    const key = `${url}|${gid || '0'}`;
    if (!map.has(key)) map.set(key, { url, gid: gid || '0', label, reps: [] });
    const row = map.get(key);
    if (!row.reps.includes(rep)) row.reps.push(rep);
  };
  for (const r of REPORTS) {
    const s = r.sheet;
    if (s?.url) {
      add(s.url, s.gid, s.label || r.source || r.name, r.code);
      for (const m of s.mains || []) add(m.url, m.gid, `${s.label || r.code} — file tháng trước (live)`, r.code);
      for (const a of Array.isArray(s.api) ? s.api : s.api?.url ? [s.api] : []) {
        add(a.url, a.gid, 'File API sàn (Doanh thu Auto API G2G)', r.code);
      }
    }
    if (r.sheetVi?.url) {
      add(r.sheetVi.url, r.sheetVi.gid, r.sheetVi.label || 'Lịch sử ví HQS', r.code);
      /* Mỗi tháng ví là một file riêng — liệt kê đủ, đừng chỉ hiện file đầu */
      for (const m of r.sheetVi.mains || []) {
        add(m.url, m.gid, `Lịch sử ví HQS — tháng ${m.qs?.month || '?'}/${m.qs?.year || ''}`, r.code);
      }
    }
    /* PKT20 còn đọc thêm file Ritokey và file QLTT để gộp số toàn tập đoàn */
    if (r.sheetQltt?.url) add(r.sheetQltt.url, '', 'Báo cáo kinh doanh QLTT (C100 + C200)', r.code);
    /* PKT20 còn đọc thêm file Ritokey để gộp số toàn tập đoàn */
    if (r.sheetRitokey?.url) add(r.sheetRitokey.url, r.sheetRitokey.qs?.gids, 'Báo cáo kinh doanh Ritokey · Daily.Report', r.code);
  }
  return [...map.values()];
}

/* Danh sách báo cáo dùng chung 1 file có thể rất dài (24 trang sàn…) — rút gọn */
const repsText = (reps) => (reps.length > 5 ? `${reps.slice(0, 4).join(' · ')} +${reps.length - 4} báo cáo khác` : reps.join(' · '));

export default function SourceMap() {
  const rows = buildRows();
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Hệ thống báo cáo &amp; file nguồn đang đọc</h2>
        <span className="tag">{rows.length} file live · {DATALAKE_ROWS.length} bộ datalake</span>
      </div>
      <div className="panel-body" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nguồn dữ liệu</th>
                <th>GID</th>
                <th>Chế độ</th>
                <th>Dùng cho báo cáo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.url}|${r.gid}`}>
                  <td>{r.label}</td>
                  <td className="mono dim">{r.gid}</td>
                  <td><span className="src-badge">LIVE</span></td>
                  <td className="dim">{repsText(r.reps)}</td>
                  <td>
                    <a className="mono" href={r.url} target="_blank" rel="noreferrer">Mở file ↗</a>
                  </td>
                </tr>
              ))}
              {DATALAKE_ROWS.map((r) => (
                <tr key={r.file}>
                  <td>{r.label}</td>
                  <td className="mono dim">—</td>
                  <td><span className="src-badge idle">DATALAKE</span></td>
                  <td className="dim">{repsText(r.reps)}</td>
                  <td className="mono dim">{r.file}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
