"use client";

import { useState } from "react";
import { Money } from "@/components/privacy";
import { Card, CardHeader, Input } from "@/components/ui/primitives";
import { ProjectionChart } from "@/components/charts/charts";
import { fixedIncomeTaxRate, monthlyNeeded, project } from "@/lib/projection";
import { cn } from "@/lib/cn";

const fmtPct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative mt-1.5">
        {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">{prefix}</span> : null}
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn("num", prefix && "pl-9", suffix && "pr-14")}
        />
        {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-3">{suffix}</span> : null}
      </div>
    </label>
  );
}

export function Simulator({
  initial,
  suggestedMonthly,
  cdi,
  ipca,
  marketIsReal,
}: {
  initial: number;
  suggestedMonthly: number;
  cdi: number;
  ipca: number;
  marketIsReal: boolean;
}) {
  const presets = [
    { id: "cdi", label: "100% do CDI", rate: cdi },
    { id: "ipca", label: "IPCA + 6%", rate: (1 + ipca) * 1.06 - 1 },
    { id: "custom", label: "Outra taxa", rate: null },
  ] as const;

  const [start, setStart] = useState(Math.round(initial));
  const [monthly, setMonthly] = useState(Math.max(100, Math.round(suggestedMonthly / 50) * 50));
  const [years, setYears] = useState(10);
  const [preset, setPreset] = useState<(typeof presets)[number]["id"]>("cdi");
  const [custom, setCustom] = useState(Math.round(cdi * 1000) / 10);
  const [raise, setRaise] = useState(0);
  const [target, setTarget] = useState(500000);

  const rate = preset === "custom" ? custom / 100 : presets.find((p) => p.id === preset)!.rate!;

  const points = project({ initial: start || 0, monthly: monthly || 0, annualRate: rate, years, annualRaise: raise / 100, inflation: ipca });
  const last = points.at(-1)!;
  const tax = fixedIncomeTaxRate(years * 12);
  const net = last.balance - Math.max(0, last.interest) * tax;
  const need = monthlyNeeded(target, start || 0, rate, years);

  const chart = points
    .filter((p) => p.month % 12 === 0 || p.month === points.length - 1)
    .map((p) => ({
      label: p.month === 0 ? "hoje" : `${Math.round(p.year)} ${Math.round(p.year) === 1 ? "ano" : "anos"}`,
      contributed: p.contributed,
      interest: Math.max(0, p.interest),
      real: p.real,
    }));

  return (
    <Card className="animate-in mt-3">
      <CardHeader
        title="E se eu investir todo mês?"
        hint="Mexa nos valores e veja quanto o dinheiro vira"
      />
      <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <NumberField label="Já tenho investido" prefix="R$" value={start} onChange={setStart} step={100} />
          <NumberField label="Aporte mensal" prefix="R$" value={monthly} onChange={setMonthly} step={50} />
          <label className="block">
            <span className="label">Prazo</span>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={40}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--rose)]"
                aria-label="Prazo em anos"
              />
              <span className="num w-16 text-right text-[13px] text-ink">{years} {years === 1 ? "ano" : "anos"}</span>
            </div>
          </label>
          <div>
            <span className="label">Rentabilidade</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    preset === p.id ? "border-rose-line bg-rose-soft text-rose-ink" : "border-line-strong text-ink-3 hover:text-ink",
                  )}
                >
                  {p.label}
                  {p.rate != null ? <span className="num ml-1 text-ink-3">{fmtPct(p.rate)}</span> : null}
                </button>
              ))}
            </div>
            {preset === "custom" ? (
              <div className="mt-2">
                <NumberField label="Taxa anual" suffix="% a.a." value={custom} onChange={setCustom} step={0.5} />
              </div>
            ) : null}
          </div>
          <NumberField label="Aumento do aporte por ano" suffix="%" value={raise} onChange={setRaise} step={1} />
        </div>

        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line sm:grid-cols-4">
            <div className="bg-surface-2 px-4 py-3">
              <p className="label">Em {years} {years === 1 ? "ano" : "anos"}</p>
              <Money value={last.balance} className="mt-1 block text-[17px] font-medium text-ink" />
            </div>
            <div className="bg-surface-2 px-4 py-3">
              <p className="label">Você aportou</p>
              <Money value={last.contributed} className="mt-1 block text-[17px] text-ink-2" />
            </div>
            <div className="bg-surface-2 px-4 py-3">
              <p className="label">Juros</p>
              <Money value={last.interest} className="mt-1 block text-[17px] text-rose" />
            </div>
            <div className="bg-surface-2 px-4 py-3">
              <p className="label">Em reais de hoje</p>
              <Money value={last.real} className="mt-1 block text-[17px] text-ink-2" />
            </div>
          </div>
          <div className="-mx-2 mt-4">
            <ProjectionChart data={chart} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-ink-3">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-[#3a3a41]" />Aportado</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-rose" />Juros</span>
            <span>
              Líquido de IR (renda fixa, {fmtPct(tax)} sobre o ganho): <Money value={net} className="text-ink-2" />
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-[12px] border border-line bg-surface-2/60 p-4 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <NumberField label="Quero chegar em" prefix="R$" value={target} onChange={setTarget} step={10000} />
            </div>
            <p className="text-[13px] text-ink-2 sm:pb-2">
              Precisa aportar <Money value={need} className="font-medium text-rose" /> por mês durante {years}{" "}
              {years === 1 ? "ano" : "anos"}.
            </p>
          </div>
          <p className="mt-3 text-[11px] text-ink-3">
            Simulação com taxa constante, aporte no fim de cada mês e inflação de {fmtPct(ipca)} ao ano
            {marketIsReal ? " (CDI e IPCA atuais do Banco Central)" : " (valores padrão: não consegui acessar o Banco Central)"}. Rentabilidade passada não garante a futura.
          </p>
        </div>
      </div>
    </Card>
  );
}
