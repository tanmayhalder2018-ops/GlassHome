import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Series colours come from CSS variables (validated categorical palette, own dark steps).
export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];
const axis = { stroke: 'var(--text-3)', fontSize: 11.5, tickLine: false, axisLine: false } as const;

function Tip({ active, payload, label, fmt }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; fmt: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12.5px] shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p) => <p key={p.name} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: p.color }} /><span className="muted">{p.name}</span><span className="num ml-auto pl-3 font-medium">{fmt(p.value)}</span></p>)}
    </div>
  );
}

export function ChartFrame({ height = 220, children, label }: { height?: number; children: ReactNode; label: string }) {
  return <div role="img" aria-label={label} style={{ height }} className="-ml-2">{children}</div>;
}

export function Bars({ data, xKey, series, fmt, yFmt, height, stacked, label }: { data: Record<string, unknown>[]; xKey: string; series: { key: string; name: string }[]; fmt: (v: number) => string; yFmt?: (v: number) => string; height?: number; stacked?: boolean; label: string }) {
  return (
    <ChartFrame height={height} label={label}>
      <ResponsiveContainer>
        <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey={xKey} {...axis} interval="preserveStartEnd" minTickGap={8} />
          <YAxis {...axis} width={48} tickFormatter={yFmt || fmt} allowDecimals={false} />
          <Tooltip isAnimationActive={false} cursor={{ fill: 'var(--surface-2)' }} content={<Tip fmt={fmt} />} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }} />}
          {series.map((s, i) => (
            <Bar isAnimationActive={false} key={s.key} dataKey={s.key} name={s.name} fill={SERIES[i]} maxBarSize={26} stackId={stacked ? 'a' : undefined}
              radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]} stroke={stacked ? 'var(--surface)' : undefined} strokeWidth={stacked ? 2 : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function HBars({ data, fmt, label }: { data: { name: string; value: number }[]; fmt: (v: number) => string; label: string }) {
  const h = Math.max(120, data.length * 34 + 16);
  return (
    <ChartFrame height={h} label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap="30%">
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" {...axis} width={128} tick={{ fill: 'var(--text-2)', fontSize: 12.5 }} />
          <Tooltip isAnimationActive={false} cursor={{ fill: 'var(--surface-2)' }} content={<Tip fmt={fmt} />} />
          <Bar isAnimationActive={false} dataKey="value" name="Students" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: 'right', fill: 'var(--text-2)', fontSize: 12, formatter: (v: unknown) => fmt(Number(v)) }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function Lines({ data, xKey, series, fmt, height, label }: { data: Record<string, unknown>[]; xKey: string; series: { key: string; name: string }[]; fmt: (v: number) => string; height?: number; label: string }) {
  return (
    <ChartFrame height={height} label={label}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey={xKey} {...axis} interval="preserveStartEnd" minTickGap={8} />
          <YAxis {...axis} width={36} allowDecimals={false} tickFormatter={fmt} />
          <Tooltip isAnimationActive={false} cursor={{ stroke: 'var(--border-strong)' }} content={<Tip fmt={fmt} />} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }} />}
          {series.map((s, i) => <Line isAnimationActive={false} key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={SERIES[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} />)}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
