'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import KpiStrip from './KpiStrip';
import DataTable from './DataTable';
import ChartBlock from './ChartBlock';
import SourcePanel from './SourcePanel';
import WeeklyRateBoard from './WeeklyRateBoard';
import CpvBoard from './CpvBoard';
import TienBoard from './TienBoard';
import RitokeyBoard from './RitokeyBoard';
import HoldingsBoard from './HoldingsBoard';
import TimDonBoard from './TimDonBoard';
import FilterBar from './FilterBar';
import { useAuth } from './AuthGate';
import { filterRowsByRange, fmtRangeDate } from '@/lib/timeFilter';
import { fetchJson, loadOverride, saveOverride, clearOverride, emptyData } from '@/lib/data';

export default function ReportView({ report }) {
  const { enabled, canView, user } = useAuth();
  const [data, setData] = useState(() => emptyData(report));
  const [live, setLive] = useState({ kpis: {}, tables: {} });
  const [range, setRange] = useState({ from: null, to: null, preset: 'all' });
  const [loaded, setLoaded] = useState(false);
  /* Trang team có 2 kiểu xem: CPV theo BE (mặc định) / CPV theo lịch sử ví */
  const [srcView, setSrcView] = useState('be');
  const activeSheet = report.sheetVi && srcView === 'vi' ? report.sheetVi : report.sheet;
  const [exporting, setExporting] = useState(false);
  /* Trang team / trang lead sàn có nút xuất dữ liệu thô từng đơn */
  const canExportRaw = Boolean(report.sheet?.teamFilter || report.sheet?.sanFilter);

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

  /* Xuất Excel (CSV mở thẳng bằng Excel) dữ liệu THÔ TỪNG ĐƠN của team/sàn —
     luôn lấy từ nguồn BE (module đơn hàng), tôn trọng bộ lọc thời gian đang chọn.
     Lưu ý: chỉ gồm các tháng đang đọc live; tháng đã chốt datalake không lưu từng đơn. */
  async function exportRaw() {
    const cfgBe = report.sheet;
    setExporting(true);
    try {
      const qs = new URLSearchParams();
      qs.append('url', cfgBe.url);
      qs.append('gid', cfgBe.gid || '0');
      for (const m of cfgBe.mains || []) {
        qs.append('url', m.url);
        qs.append('gid', m.gid || '0');
      }
      for (const a of Array.isArray(cfgBe.api) ? cfgBe.api : cfgBe.api?.url ? [cfgBe.api] : []) {
        qs.append('url2', a.url);
        qs.append('gid2', a.gid || '0');
      }
      qs.set('raw', '1');
      if (cfgBe.teamFilter) qs.set('team', cfgBe.teamFilter);
      if (cfgBe.sanFilter) qs.set('san', cfgBe.sanFilter);
      const res = await fetch(`/api/cpv?${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Không đọc được dữ liệu');
      const rows = filterRowsByRange(json.raw || [], range.from, range.to);
      if (!rows.length) {
        alert('Không có đơn nào trong phạm vi đang lọc. Lưu ý: xuất thô chỉ gồm các tháng đang đọc trực tiếp từ file; tháng đã chốt (datalake) không lưu chi tiết từng đơn.');
        return;
      }
      const SC = { ok: 'Hoàn tất', fail: 'Thất bại', huy: 'Hoàn hủy' };
      const cols = [
        ['ngay', 'Ngày'], ['id', 'Mã đơn'], ['san', 'Sàn'], ['bu', 'BU'], ['spdv', 'SPDV'],
        ['nguon', 'Nguồn'], ['sc', 'Trạng thái'], ['doanh_thu_usd', 'Doanh thu (USD)'],
        ['thanh_tien', 'GMV (VND)'], ['gia_von', 'Giá vốn (VND)'], ['loi_nhuan', 'Lợi nhuận (VND)'],
      ];
      const head = cols.map(([, l]) => l).join(',');
      const body = rows
        .map((r) =>
          cols
            .map(([k]) => {
              let v = r[k];
              if (k === 'nguon') v = v === 'api' ? 'API sàn' : 'Quản lý đơn hàng';
              else if (k === 'sc') v = SC[v] || v;
              else if (typeof v === 'number') v = String(Math.round(v * 100) / 100);
              return `"${String(v ?? '').replace(/"/g, '""')}"`;
            })
            .join(',')
        )
        .join('\n');
      const blob = new Blob(['\uFEFF' + head + '\n' + body], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `don-hang-${(cfgBe.teamFilter || cfgBe.sanFilter || report.code).toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(`Xuất Excel lỗi: ${e.message}`);
    } finally {
      setExporting(false);
    }
  }

  const liveTables = new Set(Object.keys(live.tables));

  /* Người dùng không được cấp quyền xem báo cáo này */
  if (enabled && !canView(report.code)) {
    return (
      <div className="content" style={{ paddingTop: 40 }}>
        <section className="panel">
          <div className="panel-head"><h2>Không có quyền xem báo cáo {report.code}</h2></div>
          <div className="panel-body">
            Tài khoản <b className="mono">{user?.email}</b> chưa được cấp quyền xem <b>{report.name}</b>.
            Liên hệ Admin để được mở thêm quyền trong <b>Nguồn &amp; Cấu hình → Quản lý đăng nhập</b>.
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-row">
          <div>
            <div className="eyebrow">{report.code} · SLA {report.sla}</div>
            <h1>{report.name}</h1>
            <div className="range-line">
              {report.sheetVi ? (
                <span className="src-toggle">
                  <button className={`qbtn${srcView === 'be' ? ' on' : ''}`} onClick={() => setSrcView('be')}>{report.srcLabel?.be || 'CPV theo BE'}</button>
                  <button className={`qbtn${srcView === 'vi' ? ' on' : ''}`} onClick={() => setSrcView('vi')}>{report.srcLabel?.vi || 'CPV theo LS Ví'}</button>
                </span>
              ) : (
                <span className="range-pill">
                  Phạm vi: {range.from || range.to
                    ? `${fmtRangeDate(range.from) || '…'} → ${fmtRangeDate(range.to) || '…'}`
                    : 'Cả kỳ — toàn bộ dữ liệu'}
                </span>
              )}
              {canExportRaw ? (
                <button className="btn ghost" onClick={exportRaw} disabled={exporting} style={{ marginLeft: 8 }}>
                  {exporting ? '⏳ Đang xuất…' : '⬇ Xuất Excel đơn hàng'}
                </button>
              ) : null}
            </div>
          </div>
          <FilterBar range={range} onChange={setRange} />
        </div>
      </div>

      <div className="content">
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
          /* Báo cáo có bảng LIVE: biểu đồ → bảng tỉ giá tuần → nguồn → các bảng còn lại */
          return isMatrix ? (
            <>
              {charts}
              <WeeklyRateBoard report={report} onLive={applyLive} range={range} />
              {source}
              {tables}
            </>
          ) : report.sheet?.mode === 'tim_don' ? (
            /* PKT15 — tra cứu mã đơn, chỉ chạy khi kế toán dán mã vào */
            <>
              <TimDonBoard report={report} onLive={applyLive} />
              {tables}
            </>
          ) : report.sheet?.mode === 'holdings' ? (
            /* PKT20 — CPV toàn tập đoàn, xem theo BE hoặc theo ví */
            <>
              <HoldingsBoard key={srcView} report={report} sheet={activeSheet} onLive={applyLive} range={range} />
              {tables}
              {charts}
            </>
          ) : report.sheet?.mode === 'ritokey' ? (
            /* PKT12 — CPV Ritokey (C300) */
            <>
              <RitokeyBoard report={report} onLive={applyLive} range={range} />
              {charts}
              {tables}
            </>
          ) : report.sheet?.mode === 'cash_flow' ? (
            /* PKT3 / PKT4 — đọc file Báo cáo TIỀN, kèm cảnh báo đối soát */
            <>
              <TienBoard report={report} onLive={applyLive} range={range} />
              {tables}
              {charts}
              {source}
            </>
          ) : report.sheet?.mode === 'order_cpv' ? (
            /* Trang CPV chạy LIVE hoàn toàn — không cần khối nạp tay */
            <>
              <CpvBoard key={srcView} report={report} sheet={activeSheet} onLive={applyLive} range={range} />
              {charts}
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

        {!['order_cpv', 'holdings', 'tim_don'].includes(report.sheet?.mode) ? (
          <div className="muted" style={{ marginTop: 8 }}>
            {loaded ? `Cập nhật: ${data.meta.cap_nhat || '—'} · Người lập: ${data.meta.nguoi_lap || '—'}` : 'Đang tải dữ liệu…'}
          </div>
        ) : null}
      </div>
    </>
  );
}
