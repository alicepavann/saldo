"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AdviceResult } from "@/app/api/ai/invest/route";
import type { Profile } from "@/lib/invest/profile";
import { Money } from "@/components/privacy";
import { Badge, Button, Card, CardHeader, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const KEY = "saldo:investor-profile";

type Opt<T extends string> = { v: T; l: string };

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.v}
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              value === o.v ? "border-rose-line bg-rose-soft text-rose-ink" : "border-line-strong text-ink-3 hover:text-ink",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Advisor({
  current,
  suggestedMonthly,
}: {
  current: { cls: string; share: number }[];
  suggestedMonthly: number;
}) {
  const [p, setP] = useState<Profile>({
    objetivo: "longo",
    prazoAnos: 10,
    reacaoQueda: "esperar",
    tolerancia: "media",
    experiencia: "iniciante",
    aporteMensal: Math.max(100, Math.round(suggestedMonthly / 50) * 50),
  });
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AdviceResult | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restaurar preferência salva no navegador
      if (saved) setP((x) => ({ ...x, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));

  const run = async () => {
    setLoading(true);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {}
    try {
      const r = await fetch("/api/ai/invest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro");
      setRes(data as AdviceResult);
    } catch (e) {
      toast.error("Não consegui gerar a análise", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const currentShare = (cls: string) => current.find((c) => c.cls === cls)?.share ?? 0;

  return (
    <Card className="animate-in mt-3">
      <CardHeader
        title="Para onde vai o próximo aporte"
        hint="Responda cinco perguntas e compare sua carteira com a de referência para o seu perfil"
        action={res ? <Badge tone="rose">{res.perfil}</Badge> : null}
      />
      <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Choice
            label="Objetivo principal"
            value={p.objetivo}
            onChange={(v) => set("objetivo", v)}
            options={[
              { v: "reserva", l: "Reserva" },
              { v: "curto", l: "Curto prazo" },
              { v: "medio", l: "Médio prazo" },
              { v: "longo", l: "Longo prazo" },
              { v: "aposentadoria", l: "Aposentadoria" },
            ]}
          />
          <label className="block">
            <span className="label">Em quantos anos vai precisar do dinheiro</span>
            <Input
              type="number"
              min={0}
              max={60}
              value={p.prazoAnos}
              onChange={(e) => set("prazoAnos", Number(e.target.value))}
              className="num mt-1.5"
            />
          </label>
          <Choice
            label="Se a carteira caísse 15% em um mês"
            value={p.reacaoQueda}
            onChange={(v) => set("reacaoQueda", v)}
            options={[
              { v: "vender", l: "Vendo" },
              { v: "esperar", l: "Espero" },
              { v: "comprar", l: "Compro mais" },
            ]}
          />
          <Choice
            label="Tolerância a oscilação"
            value={p.tolerancia}
            onChange={(v) => set("tolerancia", v)}
            options={[
              { v: "baixa", l: "Baixa" },
              { v: "media", l: "Média" },
              { v: "alta", l: "Alta" },
            ]}
          />
          <Choice
            label="Experiência com investimentos"
            value={p.experiencia}
            onChange={(v) => set("experiencia", v)}
            options={[
              { v: "iniciante", l: "Iniciante" },
              { v: "intermediaria", l: "Intermediária" },
              { v: "avancada", l: "Avançada" },
            ]}
          />
          <label className="block">
            <span className="label">Quanto pretende aportar por mês</span>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">R$</span>
              <Input
                type="number"
                min={0}
                step={50}
                value={p.aporteMensal}
                onChange={(e) => set("aporteMensal", Number(e.target.value))}
                className="num pl-9"
              />
            </div>
          </label>
          <Button variant="primary" className="w-full" onClick={run} disabled={loading}>
            {loading ? "Montando…" : res ? "Refazer" : "Montar sugestão"}
          </Button>
          <p className="text-[11px] leading-5 text-ink-3">
            O perfil fica salvo só neste navegador. Para a IA vão apenas totais e percentuais da carteira, nunca contas
            ou descrições.
          </p>
        </div>

        <div className="min-w-0">
          {loading ? (
            <div className="space-y-3" aria-live="polite">
              <p className="text-[13px] text-ink-3">Lendo carteira, reserva e indicadores…</p>
              {[90, 75, 82, 60, 70].map((w, i) => (
                <div key={i} className="h-3 animate-pulse rounded bg-surface-3" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : !res ? (
            <div className="flex h-full min-h-60 flex-col items-center justify-center rounded-[12px] border border-dashed border-line-strong px-6 text-center">
              <span className="display mb-2 text-[40px] italic leading-none text-rose">?</span>
              <p className="text-[13px] text-ink-2">Responda ao lado e monte a sugestão.</p>
              <p className="mt-1 max-w-sm text-xs text-ink-3">
                Você recebe uma alocação de referência para o seu perfil, como dividir o próximo aporte e alertas sobre a
                carteira atual.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-[15px] leading-7 text-ink">{res.resumo}</p>
                <p className="mt-2 text-[13px] leading-6 text-ink-3">{res.perfilExplicado}</p>
              </div>

              <section>
                <h3 className="mb-1.5 text-[13px] font-medium text-ink">Cenário</h3>
                <p className="text-[13px] leading-6 text-ink-2">{res.cenario}</p>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[13px] font-medium text-ink">Alocação sugerida × atual</h3>
                  <div className="flex items-center gap-3 text-[11px] text-ink-3">
                    <span className="flex items-center gap-1.5"><span className="h-1 w-3 rounded bg-[#4a4a52]" />Hoje</span>
                    <span className="flex items-center gap-1.5"><span className="h-1 w-3 rounded bg-rose" />Sugerido</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {res.alocacaoSugerida.map((a) => {
                    const now = currentShare(a.classe);
                    return (
                      <li key={a.classe}>
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                          <span className="text-ink-2">{a.classe}</span>
                          <span className="num text-xs text-ink-3">
                            hoje {Math.round(now * 100)}% → <span className="text-ink">{a.percentual}%</span>
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1 overflow-hidden rounded-full bg-surface-3" title="Hoje">
                            <div className="h-full rounded-full bg-[#4a4a52]" style={{ width: `${Math.min(100, now * 100)}%` }} />
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-surface-3" title="Sugerido">
                            <div className="h-full rounded-full bg-rose" style={{ width: `${Math.min(100, a.percentual)}%` }} />
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-ink-3">{a.motivo}</p>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <h3 className="mb-3 text-[13px] font-medium text-ink">Próximo aporte</h3>
                <ol className="space-y-2">
                  {res.proximoAporte.map((a, i) => (
                    <li key={a.classe} className="flex gap-3 rounded-[12px] border border-line bg-surface-2/60 p-3.5">
                      <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-rose-soft text-[11px] text-rose-ink">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[13px] text-ink">{a.classe}</p>
                          <Money value={a.valor} className="text-[13px] text-ink" />
                        </div>
                        <p className="mt-0.5 text-xs leading-5 text-ink-3">{a.comoInvestir}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {res.alertas.length ? (
                <section>
                  <h3 className="mb-2 text-[13px] font-medium text-ink">Atenção</h3>
                  <ul className="space-y-1.5">
                    {res.alertas.map((a) => (
                      <li key={a} className="flex gap-2 text-[13px] leading-6 text-ink-2">
                        <span className="mt-2.5 size-1 shrink-0 rounded-full bg-rose" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <p className="border-t border-line pt-4 text-[11px] leading-5 text-ink-3">
                {res.fonte === "ia"
                  ? `Gerado por IA (${res.modelo}) a partir dos seus dados. Confira os números antes de agir.`
                  : "Gerado por regras fixas (sem IA): adicione GROQ_API_KEY no .env.local para a análise com IA."}{" "}
                Conteúdo educativo, não é recomendação individual de investimento. Antes de decisões maiores, fale com um
                profissional certificado (CFP ou CEA).
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
