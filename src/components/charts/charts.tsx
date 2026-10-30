"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { usePrivacy } from "@/components/privacy";
import { money, monthLabel, monthShort, percent } from "@/lib/format";

const AXIS = { fill: "#85797b", fontSize: 11, fontFamily: "var(--font-geist-sans)" };
const GRID = "#221c1f";
const ROSE = "#f06a93";
const MUTED = "#4a3f43";

type TipRow = { name: string; value: number; color: string; fmt?: "money" | "pct" };

function Tip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: TipRow[];
}) {
  const { hidden } = usePrivacy();
  if (!active) return null;
  return (
    <div className="min-w-44 rounded-[10px] border border-line-strong bg-surface-2/95 px-3 py-2.5 text-xs shadow-2xl shadow-black/40 backdrop-blur">
      {label ? <p className="mb-1.5 text-ink-3 first-letter:uppercase">{label}</p> : null}
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2 text-ink-2">
            <span className="size-2 rounded-[3px]" style={{ background: r.color }} />
            {r.name}
          </span>
          <span className="num text-ink">
            {r.fmt === "pct" ? percent(r.value) : hidden ? "••••" : money(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function useTick() {
  const { hidden } = usePrivacy();
  return (v: number) => (hidden ? "" : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`);
}

export function NetWorthChart({
  data,
}: {
  data: { month: string; netWorth: number; investments: number }[];
}) {
  const tick = useTick();
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nw-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={ROSE} stopOpacity={0.18} />
            <stop offset="100%" stopColor={ROSE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthShort} tick={AXIS} axisLine={false} tickLine={false} dy={8} />
        <YAxis tickFormatter={tick} tick={AXIS} axisLine={false} tickLine={false} width={44} domain={["dataMin - 2000", "auto"]} />
        <Tooltip
          cursor={{ stroke: "#3a3a41", strokeDasharray: "3 3" }}
          content={({ active, payload, label }) => (
            <Tip
              active={active}
              label={label ? monthLabel(String(label)) : undefined}
              rows={
                payload?.length
                  ? [
                      { name: "Patrimônio", value: Number(payload[0].payload.netWorth), color: ROSE },
                      { name: "Investido", value: Number(payload[0].payload.investments), color: MUTED },
                    ]
                  : []
              }
            />
          )}
        />
        <Area type="monotone" dataKey="investments" stroke={MUTED} strokeWidth={1.25} fill="none" />
        <Area type="monotone" dataKey="netWorth" stroke={ROSE} strokeWidth={1.75} fill="url(#nw-fill)" activeDot={{ r: 3.5, fill: ROSE, stroke: "#0b0b0c", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FlowChart({
  data,
  height = 220,
  linkBase,
  selected,
}: {
  data: { ym: string; income: number; expense: number }[];
  height?: number;
  /** Ex.: "/?m=" — clicar na barra abre o mês. */
  linkBase?: string;
  selected?: string;
}) {
  const tick = useTick();
  const router = useRouter();
  const open = (ym?: string) => {
    if (linkBase && ym) router.push(`${linkBase}${ym}`, { scroll: false });
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        barGap={3}
        barCategoryGap="28%"
        onClick={(e) => open((e as { activeLabel?: string } | null)?.activeLabel)}
      >
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="ym" tickFormatter={monthShort} tick={AXIS} axisLine={false} tickLine={false} dy={8} />
        <YAxis tickFormatter={tick} tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.025)" }}
          content={({ active, payload, label }) => (
            <Tip
              active={active}
              label={label ? monthLabel(String(label)) : undefined}
              rows={
                payload?.length
                  ? [
                      { name: "Receitas", value: Number(payload[0].payload.income), color: MUTED },
                      { name: "Despesas", value: Number(payload[0].payload.expense), color: ROSE },
                    ]
                  : []
              }
            />
          )}
        />
        <Bar dataKey="income" radius={[3, 3, 0, 0]} maxBarSize={14}>
          {data.map((d) => (
            <Cell key={d.ym} fill={MUTED} fillOpacity={!selected || d.ym === selected ? 1 : 0.45} />
          ))}
        </Bar>
        <Bar dataKey="expense" radius={[3, 3, 0, 0]} maxBarSize={14}>
          {data.map((d) => (
            <Cell key={d.ym} fill={ROSE} fillOpacity={!selected || d.ym === selected ? 1 : 0.35} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CdiChart({
  data,
  height = 240,
}: {
  data: { month: string; carteira: number; cdi: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthShort} tick={AXIS} axisLine={false} tickLine={false} dy={8} />
        <YAxis
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: "#3a3a41", strokeDasharray: "3 3" }}
          content={({ active, payload, label }) => (
            <Tip
              active={active}
              label={label ? monthLabel(String(label)) : undefined}
              rows={
                payload?.length
                  ? [
                      { name: "Carteira", value: Number(payload[0].payload.carteira), color: ROSE, fmt: "pct" },
                      { name: "CDI", value: Number(payload[0].payload.cdi), color: "#8b8b93", fmt: "pct" },
                    ]
                  : []
              }
            />
          )}
        />
        <Line type="monotone" dataKey="cdi" stroke="#6b6b74" strokeWidth={1.25} strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="carteira" stroke={ROSE} strokeWidth={1.75} dot={false} activeDot={{ r: 3.5, fill: ROSE, stroke: "#0b0b0c", strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ values, height = 36 }: { values: number[]; height?: number }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={ROSE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={ROSE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Area type="monotone" dataKey="v" stroke={ROSE} strokeWidth={1.5} fill="url(#spark-fill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProjectionChart({
  data,
}: {
  data: { label: string; contributed: number; interest: number; real: number }[];
}) {
  const tick = useTick();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="proj-int" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={ROSE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ROSE} stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} dy={8} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tickFormatter={tick} tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          cursor={{ stroke: "#3a3a41", strokeDasharray: "3 3" }}
          content={({ active, payload, label }) => (
            <Tip
              active={active}
              label={label ? String(label) : undefined}
              rows={
                payload?.length
                  ? [
                      { name: "Total", value: Number(payload[0].payload.contributed) + Number(payload[0].payload.interest), color: "#ededef" },
                      { name: "Juros", value: Number(payload[0].payload.interest), color: ROSE },
                      { name: "Aportado", value: Number(payload[0].payload.contributed), color: MUTED },
                      { name: "Em reais de hoje", value: Number(payload[0].payload.real), color: "#6b6b74" },
                    ]
                  : []
              }
            />
          )}
        />
        <Area type="monotone" dataKey="contributed" stackId="1" stroke={MUTED} strokeWidth={1.25} fill="#241e21" isAnimationActive={false} />
        <Area type="monotone" dataKey="interest" stackId="1" stroke={ROSE} strokeWidth={1.75} fill="url(#proj-int)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
