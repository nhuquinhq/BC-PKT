'use client';

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toNumber, fmtCompact, fmtRate, fmtCell } from '@/lib/format';

/* HQ COLOR CODE — các bậc màu thương hiệu đã chỉnh sáng cho nền navy tối
   (kiểm định độ tương phản + phân biệt được với người mù màu). Thứ tự cố định. */
const COLORS = ['#189BD8', '#7E9C00', '#1B75BB', '#00A99D', '#D96F00', '#00A651'];

/* Màu theo ý nghĩa tài chính: doanh thu xanh HQ · giá vốn/chi cam HQ · lợi nhuận xanh lá HQ */
const SERIES_COLORS = {
  thanh_tien: '#189BD8',
  gmv: '#189BD8',
  re: '#189BD8',
  doanh_thu_usd: '#189BD8',
  du_kien_thu: '#189BD8',
  gia_von: '#D96F00',
  cogs: '#D96F00',
  tong_chi: '#D96F00',
  loi_nhuan: '#00A651',
  pl1: '#00A651',
  pl2: '#00A651',
  /* PL2A/PL7 (lãi sau thêm một lớp chi phí) dùng xanh thép để đứng cạnh PL1/PL2 xanh lá vẫn phân biệt rõ */
  pl2a: '#1B75BB',
  pl7: '#1B75BB',
  /* Đường % cùng màu với cột tương ứng — nhận diện theo cặp cột/đường */
  pct_pl1: '#00A651',
  pct_pl2a: '#1B75BB',
};

const colorOf = (key, i) => SERIES_COLORS[key] || COLORS[i % COLORS.length];

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
                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colorOf(s.key, i)} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            ) : chart.type === 'bar' ? (
              /* Cột (thang tiền, trục trái); series kind:'line' vẽ đường % theo trục phải */
              (() => {
                const bars = chart.series.filter((s) => s.kind !== 'line');
                const lines = chart.series.filter((s) => s.kind === 'line');
                const pctKeys = new Set(lines.map((s) => s.key));
                const fmtVal = (v, _n, item) => (pctKeys.has(item?.dataKey) ? fmtCell(v, 'pct') : fmtY(v));
                return (
                  <ComposedChart data={data} margin={{ top: 6, right: 8, left: 4, bottom: 4 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey={chart.x} tick={axisStyle} tickLine={false} />
                    <YAxis yAxisId="l" tick={axisStyle} tickLine={false} tickFormatter={fmtY} width={72} />
                    {lines.length ? (
                      <YAxis yAxisId="r" orientation="right" tick={axisStyle} tickLine={false} tickFormatter={(v) => `${v}%`} width={46} />
                    ) : null}
                    <Tooltip contentStyle={TIP} itemStyle={{ color: "#eaf0ff" }} labelStyle={{ color: "#a6b3d4" }} formatter={fmtVal} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#a6b3d4' }} />
                    {bars.map((s, i) => (
                      <Bar key={s.key} yAxisId="l" dataKey={s.key} name={s.label} fill={colorOf(s.key, i)} radius={[2, 2, 0, 0]} />
                    ))}
                    {lines.map((s, i) => (
                      <Line key={s.key} yAxisId="r" type="monotone" dataKey={s.key} name={s.label} stroke={colorOf(s.key, bars.length + i)} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </ComposedChart>
                );
              })()
            ) : chart.type === 'pie' ? (
              <PieChart>
                <Tooltip contentStyle={TIP} itemStyle={{ color: "#eaf0ff" }} labelStyle={{ color: "#a6b3d4" }} formatter={(v) => fmtY(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a6b3d4' }} />
                <Pie data={data} dataKey={chart.series[0].key} nameKey={chart.x} outerRadius={100} innerRadius={54} stroke="#081426" strokeWidth={2}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            ) : (
              <ScatterChart margin={{ top: 6, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis type="number" dataKey={chart.x} name="Doanh thu" tick={axisStyle} tickFormatter={fmtCompact} />
                <YAxis type="number" dataKey={chart.y} name="Biên LN" tick={axisStyle} width={64} />
                <Tooltip contentStyle={TIP} itemStyle={{ color: "#eaf0ff" }} labelStyle={{ color: "#a6b3d4" }} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={data} fill="#189BD8" />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
