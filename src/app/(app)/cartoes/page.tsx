import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { addMonths, dateBr, monthLabel, monthShort, percent } from "@/lib/format";
import { Money } from "@/components/privacy";
import { Badge, Card, CardHeader, EmptyState, Meter, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Cartões" };

function nextDate(today: string, day: number) {
  const [y, m, d] = today.split("-").map(Number);
  const date = d <= day ? new Date(y, m - 1, day) : new Date(y, m, day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function Page() {
  const d = await getData();
  const cards = d.accounts.filter((a) => a.type === "CREDIT");
  const history = d.months.slice(-7, -1);

  return (
    <div>
      <PageHeader
        title="Cartões"
        description="Fatura em aberto, limite e o que já está comprometido nos próximos meses."
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {cards.length === 0 ? (
          <Card className="xl:col-span-2">
            <EmptyState title="Nenhum cartão de crédito nas conexões" hint="Conecte o banco do cartão no Meu Pluggy para ver faturas e parcelas." />
          </Card>
        ) : null}
        {cards.map((c, idx) => {
          const used = c.creditLimit ? c.balance / c.creditLimit : 0;
          const closing = c.closingDay ? nextDate(d.today, c.closingDay) : null;
          const due = c.dueDay ? nextDate(d.today, c.dueDay) : null;
          const installments = d.transactions.filter((t) => t.accountId === c.id && t.installment && t.date.startsWith(d.currentYm));
          const future = installments.flatMap((t) =>
            Array.from({ length: t.installment!.total - t.installment!.number }, (_, k) => ({
              ym: addMonths(d.currentYm, k + 1),
              description: t.description.replace(/\s\d+\/\d+$/, ""),
              n: t.installment!.number + k + 1,
              total: t.installment!.total,
              amount: -t.amount,
            })),
          );
          const bills = history.map((ym) => ({
            ym,
            total: -d.transactions
              .filter((t) => t.accountId === c.id && t.date.startsWith(ym))
              .reduce((s, t) => s + t.amount, 0),
          }));
          const maxBill = Math.max(1, ...bills.map((b) => b.total));

          return (
            <Card key={c.id} className="animate-in overflow-hidden" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="grid gap-5 p-5 sm:grid-cols-[260px_1fr]">
                {/* Cartão */}
                <div className="relative aspect-[1.586] overflow-hidden rounded-[14px] border border-line-strong bg-[#131316] p-4">
                  <div
                    aria-hidden
                    className="absolute -right-10 -top-16 size-48 rounded-full border border-rose-line"
                  />
                  <div
                    aria-hidden
                    className="absolute -right-2 -top-24 size-48 rounded-full border border-line-strong"
                  />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <p className="text-[13px] font-medium text-ink">{c.institution}</p>
                      <span className="size-1.5 rounded-full bg-rose" />
                    </div>
                    <div>
                      <p className="num text-[13px] tracking-[0.2em] text-ink-2">•••• {c.last4}</p>
                      <p className="mt-1 text-[11px] text-ink-3">{c.name}</p>
                    </div>
                  </div>
                </div>

                {/* Fatura */}
                <div className="flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="label">Fatura aberta</p>
                      {closing ? <Badge tone="rose">fecha {dateBr(closing).slice(0, 5)}</Badge> : null}
                    </div>
                    <Money value={c.balance} className="mt-1.5 block text-[28px] font-medium tracking-[-0.03em] text-ink" />
                    <p className="text-xs text-ink-3">{due ? `Vence em ${dateBr(due)}` : "Vencimento não informado"}</p>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-[11px] text-ink-3">
                      <span>Limite usado {percent(used)}</span>
                      <span>
                        Disponível <Money value={(c.creditLimit ?? 0) - c.balance} className="text-ink-2" />
                      </span>
                    </div>
                    <Meter value={used} tone="auto" />
                  </div>
                </div>
              </div>

              <div className="grid border-t border-line sm:grid-cols-2">
                <div className="p-5 sm:border-r sm:border-line">
                  <p className="label mb-4">Faturas anteriores</p>
                  <div className="flex h-28 items-end gap-2">
                    {bills.map((b) => (
                      <div key={b.ym} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-[4px] bg-[#3a3a41] transition-colors hover:bg-rose"
                          style={{ height: `${Math.max(3, (b.total / maxBill) * 80)}px` }}
                          title={`${monthLabel(b.ym)}`}
                        />
                        <span className="text-[10px] text-ink-3">{monthShort(b.ym)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <p className="label mb-3">Parcelas futuras</p>
                  {future.length ? (
                    <ul className="space-y-2">
                      {future.slice(0, 4).map((f) => (
                        <li key={`${f.ym}-${f.description}`} className="flex items-center justify-between text-[13px]">
                          <span className="text-ink-2">
                            <span className="num text-ink-3">{monthShort(f.ym)}</span> · {f.description}{" "}
                            <span className="num text-[11px] text-ink-3">
                              {f.n}/{f.total}
                            </span>
                          </span>
                          <Money value={f.amount} className="text-ink" />
                        </li>
                      ))}
                      {future.length > 4 ? (
                        <li className="pt-1 text-xs text-ink-3">
                          + {future.length - 4} parcelas ·{" "}
                          <Money value={future.slice(4).reduce((s, f) => s + f.amount, 0)} className="text-ink-2" />
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-ink-3">Nenhuma compra parcelada.</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="animate-in mt-3">
        <CardHeader
          title="Comprometido nos próximos meses"
          hint="Soma das parcelas já lançadas em todos os cartões"
        />
        <div className="grid grid-cols-3 gap-px border-t border-line bg-line sm:grid-cols-6">
          {Array.from({ length: 6 }, (_, k) => addMonths(d.currentYm, k + 1)).map((ym) => {
            const total = d.transactions
              .filter((t) => t.installment && t.date.startsWith(d.currentYm))
              .filter((t) => {
                const left = t.installment!.total - t.installment!.number;
                const ahead = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - (Number(d.currentYm.slice(0, 4)) * 12 + Number(d.currentYm.slice(5, 7)));
                return ahead <= left;
              })
              .reduce((s, t) => s - t.amount, 0);
            return (
              <div key={ym} className="bg-surface px-5 py-4">
                <p className="text-[11px] text-ink-3 first-letter:uppercase">{monthLabel(ym)}</p>
                <Money value={total} className="mt-1 block text-[15px] text-ink" />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
