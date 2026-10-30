"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AiReport } from "@/lib/types";
import { dateTimeBr, monthLabel } from "@/lib/format";
import { usePrivacy } from "@/components/privacy";
import { Badge, Button, Card, PageHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/** Esconde valores em R$ dentro do texto quando o modo privado está ligado. */
function Txt({ children }: { children: string }) {
  const { hidden } = usePrivacy();
  return <>{hidden ? children.replace(/R\$\s?[\d.,]+/g, "R$ ••••") : children}</>;
}

function Report({ report, revealed }: { report: AiReport; revealed: number }) {
  const blocks = [
    <p key="s" className="text-[15px] leading-7 text-ink">
      <Txt>{report.summary}</Txt>
    </p>,
    <div key="h" className="grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line">
      {report.highlights.map((h) => (
        <div key={h.label} className="bg-surface-2 px-4 py-3">
          <p className="label">{h.label}</p>
          <p
            className={cn(
              "num mt-1 text-[15px]",
              h.tone === "pos" ? "text-pos" : h.tone === "neg" ? "text-neg" : "text-ink",
            )}
          >
            <Txt>{h.value}</Txt>
          </p>
        </div>
      ))}
    </div>,
    ...report.sections.map((s) => (
      <section key={s.heading}>
        <h3 className="mb-1.5 text-[13px] font-medium text-ink">{s.heading}</h3>
        <p className="text-[13px] leading-6 text-ink-2">
          <Txt>{s.body}</Txt>
        </p>
      </section>
    )),
    <section key="sug">
      <h3 className="mb-3 text-[13px] font-medium text-ink">Sugestões</h3>
      <ol className="space-y-2.5">
        {report.suggestions.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-[12px] border border-line bg-surface-2/60 p-3.5">
            <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-rose-soft text-[11px] text-rose-ink">
              {i + 1}
            </span>
            <div>
              <p className="text-[13px] text-ink">{s.title}</p>
              <p className="mt-0.5 text-[13px] leading-6 text-ink-3">
                <Txt>{s.reason}</Txt>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>,
  ];
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => (
        <div
          key={i}
          className={cn("transition-all duration-500", i < revealed ? "opacity-100" : "translate-y-1 opacity-0")}
        >
          {b}
        </div>
      ))}
    </div>
  );
}

export function AnalysisView({
  reports,
  live,
  payload,
}: {
  reports: AiReport[];
  live: AiReport;
  payload: unknown;
}) {
  const [all, setAll] = useState(reports);
  const [selected, setSelected] = useState(reports[0]?.id);
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(99);
  const [showPayload, setShowPayload] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const report = all.find((r) => r.id === selected) ?? all[0];

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const analyze = () => {
    setRunning(true);
    setTimeout(() => {
      setAll((a) => [live, ...a.filter((r) => r.id !== live.id)]);
      setSelected(live.id);
      setRevealed(0);
      setRunning(false);
      timer.current = setInterval(() => {
        setRevealed((v) => {
          if (v >= 8 && timer.current) clearInterval(timer.current);
          return v + 1;
        });
      }, 260);
    }, 1600);
  };

  return (
    <div>
      <PageHeader
        title="Resumo do mês"
        description="Todo dia 1 sai o resumo do mês que fechou. Quer ver como está o mês atual? Peça um agora."
        actions={
          <Button variant="primary" onClick={analyze} disabled={running}>
            {running ? "Escrevendo…" : "Resumir o mês atual"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[240px_1fr]">
        <Card className="animate-in self-start p-2">
          <p className="label px-3 pb-2 pt-2">Histórico</p>
          <ul>
            {all.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setSelected(r.id);
                    setRevealed(99);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left transition-colors",
                    r.id === report?.id ? "bg-surface-2" : "hover:bg-surface-2/60",
                  )}
                >
                  <span>
                    <span className="block text-[13px] text-ink first-letter:uppercase">{monthLabel(r.period)}</span>
                    <span className="text-[11px] text-ink-3">{dateTimeBr(r.createdAt)}</span>
                  </span>
                  {r.trigger === "manual" ? <Badge tone="rose">agora</Badge> : null}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-3">
          <Card className="animate-in p-6 sm:p-8">
            {running ? (
              <div className="space-y-3" aria-live="polite">
                <p className="text-[13px] text-ink-3">Lendo os números do mês…</p>
                {[92, 78, 85, 60].map((w, i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-surface-3" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : report ? (
              <>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="label">{report.trigger === "auto" ? "Fechamento do mês" : "Parcial, pedido agora"}</p>
                    <h2 className="display mt-1 text-[34px] text-ink">{report.title}</h2>
                  </div>
                </div>
                <Report report={report} revealed={revealed} />
              </>
            ) : null}
          </Card>

          <Card className="animate-in">
            <button
              onClick={() => setShowPayload((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
              aria-expanded={showPayload}
            >
              <span>
                <span className="block text-[13px] text-ink">O que é enviado para a IA</span>
                <span className="text-xs text-ink-3">
                  Só totais e percentuais. Nunca descrições, números de conta ou CPF.
                </span>
              </span>
              <ChevronDown className={cn("size-4 text-ink-3 transition-transform", showPayload && "rotate-180")} />
            </button>
            {showPayload ? (
              <pre className="mono scrollbar-thin max-h-80 overflow-auto border-t border-line px-5 py-4 text-[11.5px] leading-5 text-ink-2">
                {JSON.stringify(payload, null, 2)}
              </pre>
            ) : null}
          </Card>

          <p className="px-1 text-xs text-ink-3">
            Análise gerada automaticamente a partir dos seus dados. Não é recomendação de investimento.
          </p>
        </div>
      </div>
    </div>
  );
}
