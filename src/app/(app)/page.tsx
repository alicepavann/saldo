import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getData } from "@/lib/data";
import { avgExpense, budgetProgress, monthSummary, monthlySeries, spendByCategory } from "@/lib/compute";
import { dayShort, monthLabel, percent } from "@/lib/format";
import { pickMonth, withMonth, type SearchParams } from "@/lib/period";
import { Money } from "@/components/privacy";
import { Delta, EmptyState, Meter } from "@/components/ui/primitives";
import { FlowChart, NetWorthChart } from "@/components/charts/charts";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/cn";

function greeting() {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function SectionTitle({ children, href, cta }: { children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="display text-[26px] text-ink">{children}</h2>
      {href ? (
        <Link href={href} className="text-xs text-ink-3 transition-colors hover:text-rose">
          {cta ?? "ver tudo"} →
        </Link>
      ) : null}
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const d = await getData();
  const sp = await searchParams;
  const ym = pickMonth(sp.m, d.months, d.currentYm);
  const isCurrent = ym === d.currentYm;
  const link = (path: string, extra: Record<string, string> = {}) => withMonth(path, ym, d.currentYm, extra);

  const sum = monthSummary(d.transactions, ym);
  const avg3 = avgExpense(d.transactions, ym, 3);
  const dayOfMonth = Number(d.today.slice(8, 10));
  const daysInMonth = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
  const expected = isCurrent ? avg3 * (dayOfMonth / daysInMonth) : avg3;
  const paceDelta = expected ? sum.expense / expected - 1 : 0;

  const nw = d.netWorth;
  const nwNow = nw.at(-1)!;
  const nwDelta = nw[0].netWorth > 0 ? nwNow.netWorth / nw[0].netWorth - 1 : 0;

  const cats = spendByCategory(d.transactions, ym, d.categories).slice(0, 7);
  const budgets = budgetProgress(d.transactions, ym, d.budgets, d.categories).slice(0, 4);
  const flow = monthlySeries(d.transactions, d.months.slice(-7));
  const recent = d.transactions.filter((t) => !t.isInternalTransfer && t.date.startsWith(ym)).slice(0, 6);
  const catName = (id: string) => d.categories.find((c) => c.id === id)?.name ?? id;
  const acc = (id: string) => d.accounts.find((a) => a.id === id);

  const expiring = d.connections.filter((c) => (Date.parse(c.consentExpiresAt) - Date.parse(d.today)) / 864e5 <= 30);
  const monthName = monthLabel(ym).split(" de ")[0];

  return (
    <div className="space-y-14">
      {/* Abertura */}
      <section className="stagger">
        <p className="text-[13px] text-ink-3">
          {greeting()}, Alice. {isCurrent ? "Este é o seu mês até agora." : `Olhando para ${monthLabel(ym)}.`}
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <p className="label">Patrimônio líquido</p>
            <Money
              value={nwNow.netWorth}
              animate
              cents={false}
              className="display mt-2 block text-[56px] leading-[0.95] text-ink sm:text-[76px]"
            />
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
              <Delta value={nwDelta} /> nos últimos 12 meses
            </p>
          </div>

          <p className="max-w-xl text-[17px] leading-[1.65] text-ink-2 sm:text-[19px]">
            Em {monthName} você gastou{" "}
            <Link href={link("/transacoes")} className="ink-link text-ink">
              <Money value={sum.expense} />
            </Link>
            {expected ? (
              <>
                , {Math.abs(paceDelta) < 0.03 ? "no seu ritmo de sempre" : paceDelta > 0 ? (
                  <span className="text-neg">{percent(paceDelta)} acima do seu ritmo</span>
                ) : (
                  <span className="text-pos">{percent(-paceDelta)} abaixo do seu ritmo</span>
                )}
              </>
            ) : null}
            , e {sum.net >= 0 ? "guardou" : "ficou devendo"}{" "}
            <span className={cn("text-ink", sum.net < 0 && "text-neg")}>
              <Money value={Math.abs(sum.net)} />
            </span>
            .{cats[0] ? (
              <>
                {" "}O que mais pesou foi{" "}
                <Link href={link("/transacoes", { cat: cats[0].categoryId })} className="ink-link text-ink">
                  {cats[0].name.toLowerCase()}
                </Link>
                .
              </>
            ) : null}
          </p>
        </div>

        {expiring.length ? (
          <Link
            href="/config"
            className="mt-8 flex items-center gap-3 border-t border-line pt-4 text-[13px] text-rose-ink transition-colors hover:text-rose"
          >
            <span className="size-1.5 rounded-full bg-rose" />
            A autorização do {expiring[0].institution} vence em{" "}
            {Math.round((Date.parse(expiring[0].consentExpiresAt) - Date.parse(d.today)) / 864e5)} dias. Renovar
            <ArrowUpRight className="size-3.5" />
          </Link>
        ) : null}
      </section>

      {/* Evolução + números do mês */}
      <section className="animate-in">
        <div className="-mx-2">
          <NetWorthChart data={nw} />
        </div>
        <div className="mt-6 grid grid-cols-1 divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Link href={link("/transacoes")} className="explore group rounded-none px-1 py-5 sm:px-6 sm:first:pl-0">
            <p className="label">Gastos em {monthName}</p>
            <Money value={sum.expense} animate cents={false} className="display mt-1 block text-[38px] text-ink" />
            <div className="mt-3">
              <Meter value={avg3 ? sum.expense / avg3 : 0} tone="auto" />
              <p className="mt-1.5 text-[11px] text-ink-3">
                média de 3 meses: <Money value={avg3} compact className="text-ink-2" />
              </p>
            </div>
          </Link>
          <div className="px-1 py-5 sm:px-6">
            <p className="label">Sobrou</p>
            <Money
              value={sum.net}
              animate
              cents={false}
              className={cn("display mt-1 block text-[38px]", sum.net >= 0 ? "text-ink" : "text-neg")}
            />
            <p className="mt-3 text-[12px] text-ink-3">
              <span className="num text-ink-2">{percent(Math.max(0, sum.savingsRate))}</span> da renda · entrou{" "}
              <Money value={sum.income} compact className="text-ink-2" />
            </p>
          </div>
          <Link href="/metas" className="explore group rounded-none px-1 py-5 sm:px-6">
            <p className="label">Reserva de emergência</p>
            <p className="display mt-1 text-[38px] text-ink">
              <span className="num">{d.emergency.monthsCovered.toFixed(1).replace(".", ",")}</span>
              <span className="ml-2 font-sans text-sm text-ink-3">de {d.emergencyMonths} meses</span>
            </p>
            <div className="mt-3">
              <Meter value={d.emergency.ratio} tone="rose" />
            </div>
          </Link>
        </div>
      </section>

      {/* Para onde foi + entradas e saídas */}
      <section className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
        <div className="animate-in">
          <SectionTitle href={link("/orcamento")} cta="orçamento">
            Para onde foi
          </SectionTitle>
          {cats.length === 0 ? <EmptyState title="Nenhum gasto neste mês." /> : null}
          <ul className="-mx-3">
            {cats.map((c, i) => (
              <li key={c.categoryId}>
                <Link
                  href={link("/transacoes", { cat: c.categoryId })}
                  className="explore group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-3 py-2.5"
                >
                  <span className="flex items-center gap-2 text-[14px] text-ink-2 group-hover:text-ink">
                    {c.name}
                    <span className="text-xs text-ink-4 opacity-0 transition-opacity group-hover:opacity-100">ver →</span>
                  </span>
                  <span className="flex items-baseline gap-3">
                    <Money value={c.value} className="text-[14px] text-ink" />
                    <span className="num w-11 text-right text-[11px] text-ink-3">{percent(c.share)}</span>
                  </span>
                  <span className="col-span-2 h-[3px] overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${(c.value / cats[0].value) * 100}%`, background: i === 0 ? "var(--rose)" : "var(--ink-4)" }}
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-in">
          <SectionTitle>Entradas e saídas</SectionTitle>
          <p className="-mt-2 mb-3 text-xs text-ink-3">Clique num mês para ver os detalhes dele.</p>
          <div className="-mx-2">
            <FlowChart data={flow} height={260} linkBase="/?m=" selected={ym} />
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-ink-3">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-[#4a3f43]" />entrou</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-rose" />saiu</span>
          </div>
        </div>
      </section>

      {/* Orçamentos + últimas */}
      <section className="grid gap-12 lg:grid-cols-2">
        <div className="animate-in">
          <SectionTitle href={link("/orcamento")}>Perto do limite</SectionTitle>
          <ul className="space-y-5">
            {budgets.map((b) => (
              <li key={b.categoryId}>
                <Link href={link("/transacoes", { cat: b.categoryId })} className="explore -mx-3 block px-3 py-1.5">
                  <div className="mb-2 flex items-baseline justify-between text-[14px]">
                    <span className="text-ink-2">{b.name}</span>
                    <span className="text-xs text-ink-3">
                      <Money value={b.spent} className="text-[14px] text-ink" /> de <Money value={b.budget} />
                    </span>
                  </div>
                  <Meter value={b.ratio} tone="auto" />
                  <p className={cn("mt-1.5 text-[11px]", b.remaining < 0 ? "text-neg" : "text-ink-3")}>
                    {b.remaining >= 0 ? (
                      <>
                        restam <Money value={b.remaining} />
                      </>
                    ) : (
                      <>
                        passou <Money value={-b.remaining} />
                      </>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-in">
          <SectionTitle href={link("/transacoes", { tipo: "tudo" })}>Últimas do mês</SectionTitle>
          {recent.length === 0 ? <EmptyState title="Nenhuma transação neste mês." /> : null}
          <ul className="-mx-3">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={link("/transacoes", { q: t.description, tipo: "tudo" })}
                  className="explore flex items-center gap-3 px-3 py-2.5"
                >
                  <CategoryIcon id={t.categoryId} accent={t.amount > 0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-ink">{t.description}</p>
                    <p className="truncate text-[11px] text-ink-3">
                      {catName(t.categoryId)} · {acc(t.accountId)?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Money value={t.amount} signed className={cn("text-[14px]", t.amount > 0 ? "text-pos" : "text-ink")} />
                    <p className="text-[11px] text-ink-3">{dayShort(t.date)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {!isCurrent ? (
        <p className="text-center text-xs text-ink-3">
          <Link href="/" className="ink-link">
            voltar para {monthLabel(d.currentYm)}
          </Link>
          {" "}· ou use ← → no teclado
        </p>
      ) : null}
    </div>
  );
}

