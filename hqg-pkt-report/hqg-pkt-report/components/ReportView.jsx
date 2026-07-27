'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import KpiStrip from './KpiStrip';
import DataTable from './DataTable';
import ChartBlock from './ChartBlock';
import SourcePanel from './SourcePanel';
import WeeklyRateBoard from './WeeklyRateBoard';
import { PERIOD_LABEL } from '@/lib/reports';
import { fetchJson, loadOverride, saveOverride, clearOverride, emptyData } from '@/lib/data';

export default function ReportView({ report }) {
  const [data, setData] = useState(() => emptyData(report));
  const [live, setLive] = useState({ kpis: {}, tables: {} });
  const [period, setPeriod] = useState(report.defaultPeriod);
  const [ky, setKy] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const base = emptyData(report);
      let json = null;
      try { json = await fetchJson(report.slug); } catch { /* dùng khung rỗng */ }
      const over = loadOverride(report.slug);
      const merged = {
        meta: { ...base.meta, ...(json?.meta || {}), ...(over?.meta || {}) },
        kpis: { ...base.kpis, ...(json?.kpis || {}), ...(over?.kpis || {}) },
        tables: { ...base.tables, ...(json?.tables || {}), ...(over?.tables || {}) },
      };
      if (alive) {
        setData(merged);
        setKy(merged.meta.ky || '');
        setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [report]);

  /* Dữ liệu đọc trực tiếp từ Google Sheet đè lên JSON và dữ liệu nạp tay */
  const view = useMemo(() => ({
    meta: data.meta,
    kpis: { ...data.kpis, ...live.kpis },
    tables: { ...data.tables, ...live.tables },
  }), [data, live]);

  const applyLive = useCallback((patch) => {
    setLive({ kpis: patch.kpis || {}, tables: patch.tables || {} });
  }, []);

  function applyTable(tableId, rows) {
    setData((d) => {
      const next = { ...d, tables: { ...d.tables, [tableId]: rows } };
      saveOverride(report.slug, next);
      return next;
    });
  }

  function applyKpis(patch) {
    setData((d) => {
      const next = { ...d, kpis: { ...d.kpis, ...patch } };
      saveOverride(report.slug, next);
      return next;
    });
  }

  function reset() {
    clearOverride(report.slug);
    window.location.reload();
  }

  function exportCsv(table) {
    const rows = view.tables[table.id] || [];
    const head = table.columns.map((c) => c.label).join(',');
    const body = rows
      .map((r) => table.columns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + head + '\n' + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${report.code}_${table.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const liveTables = new Set(Object.keys(live.tables));

  return (
    <>
      <div className="topbar">
        <div className="topbar-row">
          <div>
            <div className="eyebrow">{report.code} · SLA {report.sla} · Nguồn: {report.source}</div>
            <h1>{report.name}</h1>
          </div>
          <div className="stack">
            <div className="field">
              <label>Kỳ báo cáo</label>
              <div className="seg">
                {report.periods.map((p) => (
                  <button key={p} className={period === p ? 'on' : ''} onClick={() => setPeriod(p)}>{PERIOD_LABEL[p]}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Giá trị kỳ</label>
              <input className="input" value={ky} onChange={(e) => setKy(e.target.value)} placeholder={period === 'day' ? '24/07/2026' : period === 'week' ? 'Tuần 30' : period === 'month' ? 'Tháng 07/2026' : period === 'quarter' ? 'Quý 3/2026' : '2026'} />
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <section className="panel">
          <div className="panel-head">
            <h2>Báo cáo này trả lời câu hỏi gì</h2>
            <span className="tag sla">Hạn nộp: {report.sla}</span>
          </div>
          <div className="panel-body">
            <ul className="purpose">
              {report.purpose.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </section>

        <KpiStrip kpis={report.kpis} values={view.kpis} />

        {report.sheet?.mode === 'weekly_matrix' ? (
          <WeeklyRateBoard report={report} onLive={applyLive} />
        ) : null}

        <SourcePanel report={report} onApply={applyTable} onApplyKpis={applyKpis} onReset={reset} />

        {report.tables.map((t) => (
          <DataTable
            key={t.id}
            table={t}
            rows={view.tables[t.id] || []}
            live={liveTables.has(t.id)}
            onExport={exportCsv}
          />
        ))}

        <div className="grid-2">
          {report.charts.map((c) => (
            <ChartBlock key={c.id} chart={c} rows={view.tables[c.table] || []} />
          ))}
        </div>

        <div className="muted" style={{ marginTop: 8 }}>
          {loaded ? `Cập nhật: ${data.meta.cap_nhat || '—'} · Người lập: ${data.meta.nguoi_lap || '—'}` : 'Đang tải dữ liệu…'}
        </div>
      </div>
    </>
  );
}
