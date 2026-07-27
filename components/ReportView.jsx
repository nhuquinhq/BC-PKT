'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import KpiStrip from './KpiStrip';
import DataTable from './DataTable';
import ChartBlock from './ChartBlock';
import SourcePanel from './SourcePanel';
import WeeklyRateBoard from './WeeklyRateBoard';
import FilterBar from './FilterBar';
import { filterRowsByRange, fmtRangeDate } from '@/lib/timeFilter';
import { fetchJson, loadOverride, saveOverride, clearOverride, emptyData } from '@/lib/data';

export default function ReportView({ report }) {
  const [data, setData] = useState(() => emptyData(report));
  const [live, setLive] = useState({ kpis: {}, tables: {} });
  const [range, setRange] = useState({ from: null, to: null, preset: 'all' });
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

  /* Bảng & biểu đồ nhìn qua bộ lọc thời gian */
  const shown = useMemo(() => {
    const out = {};
    for (const [id, rows] of Object.entries(view.tables)) {
      out[id] = filterRowsByRange(rows, range.from, range.to);
    }
    return out;
  }, [view.tables, range]);

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
    const rows = shown[table.id] || [];
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
            <div className="range-line">
              <span className="range-pill">
                Phạm vi: {range.from || range.to
                  ? `${fmtRangeDate(range.from) || '…'} → ${fmtRangeDate(range.to) || '…'}`
                  : 'Cả kỳ — toàn bộ dữ liệu'}
              </span>
            </div>
          </div>
          <FilterBar range={range} onChange={setRange} />
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

        {(() => {
          const isMatrix = report.sheet?.mode === 'weekly_matrix';
          const tables = report.tables
            .filter((t) => !t.hidden)
            .map((t) => (
              <DataTable key={t.id} table={t} rows={shown[t.id] || []} live={liveTables.has(t.id)} onExport={exportCsv} />
            ));
          const charts = report.charts.length ? (
            <div className="grid-2">
              {report.charts.map((c) => (
                <ChartBlock key={c.id} chart={c} rows={shown[c.table] || []} />
              ))}
            </div>
          ) : null;
          const source = <SourcePanel report={report} onApply={applyTable} onApplyKpis={applyKpis} onReset={reset} />;
          /* Báo cáo có bảng LIVE: tỉ giá → biểu đồ ngay bên dưới → nguồn → các bảng còn lại */
          return isMatrix ? (
            <>
              <WeeklyRateBoard report={report} onLive={applyLive} range={range} />
              {charts}
              {source}
              {tables}
            </>
          ) : (
            <>
              {source}
              {tables}
              {charts}
            </>
          );
        })()}

        <div className="muted" style={{ marginTop: 8 }}>
          {loaded ? `Cập nhật: ${data.meta.cap_nhat || '—'} · Người lập: ${data.meta.nguoi_lap || '—'}` : 'Đang tải dữ liệu…'}
        </div>
      </div>
    </>
  );
}
