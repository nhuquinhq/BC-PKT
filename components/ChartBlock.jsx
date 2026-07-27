'use client';

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toNumber, fmtCompact, fmtRate } from '@/lib/format';

const COLORS = ['#7c5cff', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#4b8dff'];

const axisStyle = { fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', fill: '#6c7ba3' };
const GRID = 'rgba(255,255,255,.07)';
const TIP = { background: '#0b1020', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, fontSize: 12, color: '#eaf0ff' };

export default function ChartBlock({ chart, rows = [] }) {
  const data = rows
    .map((r) => {
      const o = { ...r };
      (chart.series || []).forEach((s) => { o[s.key] = toNumber(r[s.key]); });
      if (chart.y) o[chart.y] = toNumber(r[chart.y]);
      if (chart.type === 'scatter') o[chart.x] = toNumber(r[chart.x]);
      return o;
    })
    .filter((r) => {
      if (chart.type === 'scatter') return r[chart.x] !== null && r[chart.y] !== null;
      return (chart.series || []).some((s) => r[s.key] !== null);
    });

  const isRate = chart.table === 'daily_rate';
  const fmtY = (v) => (isRate ? fmtRate(v) : fmtCompact(v));

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{chart.title}</h2>
        <span className="tag">{chart.table}</span>
      </div>
      <div className="panel-body">
        {data.length === 0 ? (
          <div className="empty-state">Biểu đồ sẽ hiện khi bảng nguồn có dữ liệu.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            {chart.type === 'line' ? (
              <LineChart data={data} margin={{ top: 6, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis dataKey={chart.x} tick={axisStyle} tickLine={false} />
                <YAxis tick={axisStyle} tickLine={false} tickFormatter={fmtY} width={72} domain={['auto', 'auto']} />
                <Tooltip contentStyle={TIP} itemStyle={{ color: "#eaf0ff" }} labelStyle={{ color: "#a6b3d4" }} formatter={(v) => fmtY(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a6b3d4' }} />
                {chart.series.map((s, i) => (
                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            ) : chart.type === 'bar' ? (
              <BarChart data={data} margin={{ top: 6, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey={chart.x} tick={axisStyle} tickLine={false} />
                <YAxis tick={axisStyle} tickLine={false} tickFormatter={fmtY} width={72} />
                <Tooltip contentStyle={TIP} itemStyle={{ color: "#eaf0ff" }} labelStyle={{ color: "#a6b3d4" }} formatter={(v) => fmtY(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a6b3d4' }} />
                {chart.series.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            ) : chart.type === 'pie' ? (
              <PieChart>
                <Tooltip contentStyle={TIP} itemStyle={{ color: "#eaf0ff" }} labelStyle={{ color: "#a6b3d4" }} formatter={(v) => fmtY(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a6b3d4' }} />
                <Pie data={data} dataKey={chart.series[0].key} nameKey={chart.x} outerRadius={100} innerRadius={54}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            ) : (
              <ScatterChart margin={{ top: 6, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis type="number" dataKey={chart.x} name="Doanh thu" tick={axisStyle} tickFormatter={fmtCompact} />
                <YAxis type="number" dataKey={chart.y} name="Biên LN" tick={axisStyle} width={64} />
                <Tooltip contentStyle={TIP} itemStyle={{ color: "#eaf0ff" }} labelStyle={{ color: "#a6b3d4" }} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={data} fill="#22d3ee" />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
