'use client';

import { useState } from 'react';
import { parseDelimited, mapRows, fetchSheet } from '@/lib/data';

export default function SourcePanel({ report, onApply, onApplyKpis, onReset }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('sheet');
  const [tableId, setTableId] = useState(report.tables[0].id);
  const [sheetUrl, setSheetUrl] = useState('');
  const [gid, setGid] = useState('');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const table = report.tables.find((t) => t.id === tableId);

  function apply(rows) {
    const mapped = mapRows(rows, table.columns);
    const matched = mapped.filter((r) => Object.keys(r).length > 0);
    if (matched.length === 0) {
      setMsg({ type: 'no', text: 'Không có cột nào khớp. Kiểm tra dòng tiêu đề — tên cột phải trùng key hoặc nhãn cột bên dưới.' });
      return;
    }
    onApply(tableId, matched);
    setMsg({ type: 'ok', text: `Đã nạp ${matched.length} dòng vào bảng “${table.title}”. Dữ liệu lưu trên trình duyệt này.` });
  }

  async function handleSheet() {
    setBusy(true);
    setMsg(null);
    try {
      const rows = await fetchSheet(sheetUrl, gid);
      apply(rows);
    } catch (e) {
      setMsg({ type: 'no', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  function handlePaste() {
    setMsg(null);
    const rows = parseDelimited(text);
    if (!rows.length) {
      setMsg({ type: 'no', text: 'Chưa đọc được dòng nào. Dán kèm cả dòng tiêu đề.' });
      return;
    }
    apply(rows);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Nguồn dữ liệu</h2>
          <div className="hint">Nguồn gốc: {report.source}</div>
        </div>
        <div className="stack">
          <button className="btn ghost" onClick={onReset}>Xoá dữ liệu đã nạp</button>
          <button className="btn" onClick={() => setOpen(!open)}>{open ? 'Thu gọn' : 'Nạp dữ liệu'}</button>
        </div>
      </div>

      {open ? (
        <div className="panel-body">
          <div className="stack" style={{ marginBottom: 16 }}>
            <div className="field">
              <label>Nạp vào bảng</label>
              <select className="input" value={tableId} onChange={(e) => { setTableId(e.target.value); setMsg(null); }} style={{ minWidth: 300 }}>
                {report.tables.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Cách nạp</label>
              <div className="seg">
                <button className={mode === 'sheet' ? 'on' : ''} onClick={() => setMode('sheet')}>Google Sheet</button>
                <button className={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')}>Dán CSV / TSV</button>
                <button className={mode === 'json' ? 'on' : ''} onClick={() => setMode('json')}>File JSON</button>
              </div>
            </div>
          </div>

          {mode === 'sheet' ? (
            <div className="stack">
              <div className="field" style={{ flex: 1, minWidth: 340 }}>
                <label>Link Google Sheet (quyền xem: Anyone with the link)</label>
                <input className="input" style={{ width: '100%' }} placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
              </div>
              <div className="field">
                <label>GID tab (tuỳ chọn)</label>
                <input className="input" placeholder="0" value={gid} onChange={(e) => setGid(e.target.value)} style={{ minWidth: 90 }} />
              </div>
              <button className="btn" onClick={handleSheet} disabled={busy || !sheetUrl}>{busy ? 'Đang đọc…' : 'Đọc sheet'}</button>
            </div>
          ) : mode === 'paste' ? (
            <div>
              <div className="field">
                <label>Dán trực tiếp từ Google Sheet hoặc Excel (giữ dòng tiêu đề)</label>
                <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={table.columns.map((c) => c.key).join('\t')} />
              </div>
              <button className="btn" style={{ marginTop: 10 }} onClick={handlePaste}>Nạp vào bảng</button>
            </div>
          ) : (
            <div className="muted" style={{ lineHeight: 1.7 }}>
              Mở file <code className="mono">public/data/{report.slug}.json</code> trong dự án, điền vào nhánh{' '}
              <code className="mono">tables.{tableId}</code> rồi commit. Đây là cách dùng cho số liệu đã chốt, đi theo Git và deploy cùng Vercel.
              Dữ liệu nạp bằng 2 cách trên chỉ nằm trên trình duyệt đang mở.
            </div>
          )}

          <div className="mono" style={{ marginTop: 14, fontSize: 11, color: 'var(--ink-3)' }}>
            Cột bảng này: {table.columns.map((c) => `${c.key} (${c.label})`).join('  ·  ')}
          </div>

          {msg ? (
            <div style={{ marginTop: 12 }}>
              <span className={`tag ${msg.type}`}>{msg.type === 'ok' ? 'ĐÃ NẠP' : 'LỖI'}</span>{' '}
              <span style={{ fontSize: 12.5 }}>{msg.text}</span>
            </div>
          ) : null}

          <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <KpiEditor report={report} onApplyKpis={onApplyKpis} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function KpiEditor({ report, onApplyKpis }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);

  function apply() {
    const out = {};
    text.split('\n').forEach((line) => {
      const [k, v] = line.split(/[\t=,;]/);
      if (!k) return;
      const key = k.trim();
      if (report.kpis.some((x) => x.key === key)) out[key] = (v ?? '').trim();
    });
    const n = Object.keys(out).length;
    if (!n) { setMsg('Không khớp mã KPI nào. Mỗi dòng viết: mã_kpi<TAB>giá trị'); return; }
    onApplyKpis(out);
    setMsg(`Đã cập nhật ${n} chỉ số.`);
  }

  return (
    <div>
      <div className="field">
        <label>Cập nhật nhanh KPI — mỗi dòng: mã kpi &lt;TAB hoặc =&gt; giá trị</label>
        <textarea className="input" style={{ minHeight: 92 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={report.kpis.slice(0, 3).map((k) => `${k.key}=`).join('\n')} />
      </div>
      <div className="stack" style={{ marginTop: 10 }}>
        <button className="btn ghost" onClick={apply}>Cập nhật KPI</button>
        {msg ? <span className="muted">{msg}</span> : null}
      </div>
      <div className="mono" style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)' }}>
        Mã KPI: {report.kpis.map((k) => k.key).join(' · ')}
      </div>
    </div>
  );
}
