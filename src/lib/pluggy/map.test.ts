import { describe, expect, it } from "vitest";
import type { Account, Category, Investment, Item, Transaction } from "pluggy-sdk";
import { asFraction, categoryFor, institutionNameFrom, isMeuPluggy, mapAccount, mapInvestment, mapItem, mapTransaction } from "./map";
import { rebuildNetWorth } from "./history";

const cats = new Map<string, Category>([
  ["05050000", { id: "05050000", description: "Same person transfer", parentId: "05000000", parentDescription: "Transfers" }],
  ["13010000", { id: "13010000", description: "Food delivery", parentDescription: "Food and drinks" }],
  ["01010000", { id: "01010000", description: "Salary", parentDescription: "Income" }],
  ["16010000", { id: "16010000", description: "Credit card payment", parentDescription: "Legal obligations" }],
]);

const tx = (p: Partial<Transaction>) =>
  ({
    id: "t1",
    accountId: "acc",
    date: new Date("2026-10-05T12:00:00Z"),
    description: "IFOOD *RESTAURANTE",
    descriptionRaw: null,
    type: "DEBIT",
    amount: -42.5,
    category: null,
    categoryId: null,
    creditCardMetadata: null,
    ...p,
  }) as unknown as Transaction;

describe("mapTransaction", () => {
  it("mantém o sinal em conta corrente e traduz a categoria", () => {
    const t = mapTransaction(tx({ categoryId: "13010000", category: "Food delivery" }), "BANK", cats);
    expect(t).toMatchObject({ amount: -42.5, categoryId: "alimentacao", isInternalTransfer: false, date: "2026-10-05" });
  });

  it("inverte o sinal no cartão (compra positiva vira saída)", () => {
    const t = mapTransaction(tx({ amount: 99.9, categoryId: "13010000" }), "CREDIT", cats);
    expect(t.amount).toBe(-99.9);
  });

  it("marca transferência entre contas próprias e pagamento de fatura como internas", () => {
    expect(mapTransaction(tx({ categoryId: "05050000" }), "BANK", cats).isInternalTransfer).toBe(true);
    expect(mapTransaction(tx({ categoryId: "16010000" }), "BANK", cats).isInternalTransfer).toBe(true);
  });

  it("salário vira receita; sem categoria cai em Outros/Renda extra", () => {
    expect(mapTransaction(tx({ amount: 5850, categoryId: "01010000" }), "BANK", cats).categoryId).toBe("salario");
    expect(mapTransaction(tx({ amount: -10 }), "BANK", cats).categoryId).toBe("outros");
    expect(mapTransaction(tx({ amount: 10 }), "BANK", cats).categoryId).toBe("renda-extra");
  });

  it("lê parcelas do cartão", () => {
    const t = mapTransaction(
      tx({ amount: 389.9, creditCardMetadata: { installmentNumber: 3, totalInstallments: 10 } as never }),
      "CREDIT",
      cats,
    );
    expect(t.installment).toEqual({ number: 3, total: 10 });
  });
});

describe("categoryFor", () => {
  it("cobre as categorias mais comuns da Pluggy", () => {
    expect(categoryFor("Groceries | Food and drinks")).toBe("mercado");
    expect(categoryFor("Taxi and ride-hailing | Transportation")).toBe("transporte");
    expect(categoryFor("Video streaming | Digital services")).toBe("assinaturas");
    expect(categoryFor("Rent | Housing")).toBe("moradia");
    expect(categoryFor("Pharmacy | Healthcare")).toBe("saude");
    expect(categoryFor("Fixed income | Investments")).toBe("investimento");
  });
});

describe("mapItem / mapAccount", () => {
  it("traduz status e datas", () => {
    const c = mapItem({
      id: "item-1",
      connector: { name: "Nubank" },
      status: "WAITING_USER_INPUT",
      lastUpdatedAt: new Date("2026-10-28T09:00:00Z"),
      updatedAt: new Date("2026-10-28T09:00:00Z"),
      consentExpiresAt: new Date("2027-08-10T00:00:00Z"),
    } as unknown as Item);
    expect(c).toMatchObject({ institution: "Nubank", status: "OUTDATED", consentExpiresAt: "2027-08-10" });
  });

  it("lê limite e datas do cartão", () => {
    const a = mapAccount(
      {
        id: "c1",
        itemId: "item-1",
        type: "CREDIT",
        name: "Cartão",
        marketingName: "Ultravioleta",
        number: "5555 **** **** 7710",
        balance: 1702.19,
        creditData: {
          creditLimit: 6500,
          balanceCloseDate: new Date("2026-11-03T00:00:00Z"),
          balanceDueDate: new Date("2026-11-10T00:00:00Z"),
        },
      } as unknown as Account,
      "Nubank",
    );
    expect(a).toMatchObject({ type: "CREDIT", name: "Ultravioleta", last4: "7710", creditLimit: 6500, closingDay: 3, dueDay: 10 });
  });
});

describe("mapInvestment", () => {
  const base = { id: "i1", itemId: "item", name: "CDB", balance: 1100, status: "ACTIVE" };
  it("usa amountOriginal ou deduz pelo lucro", () => {
    const a = mapInvestment({ ...base, type: "FIXED_INCOME", subtype: "CDB", amountOriginal: 1000 } as unknown as Investment, "XP");
    expect(a).toMatchObject({ type: "Renda fixa", amountOriginal: 1000, institution: "XP" });
    const b = mapInvestment({ ...base, type: "FIXED_INCOME", subtype: "TREASURY", amountOriginal: null, amountProfit: 150 } as unknown as Investment, "XP");
    expect(b).toMatchObject({ type: "Tesouro Direto", amountOriginal: 950 });
  });
  it("ignora resgatados e zerados", () => {
    expect(mapInvestment({ ...base, type: "ETF", status: "TOTAL_WITHDRAWAL" } as unknown as Investment, "XP")).toBeNull();
    expect(mapInvestment({ ...base, type: "ETF", balance: 0 } as unknown as Investment, "XP")).toBeNull();
  });
  it("normaliza taxa em % ou fração", () => {
    expect(asFraction(12.4)).toBeCloseTo(0.124);
    expect(asFraction(0.124)).toBeCloseTo(0.124);
    expect(asFraction(null)).toBeNull();
  });
});

describe("rebuildNetWorth", () => {
  it("reconstrói o caixa de trás para frente e termina no saldo atual", () => {
    const { series } = rebuildNetWorth({
      months: ["2026-08", "2026-09", "2026-10"],
      accounts: [{ id: "b", itemId: "i", type: "BANK", name: "", institution: "", last4: "", balance: 1000 }],
      transactions: [
        { id: "1", accountId: "b", date: "2026-10-05", description: "", amount: 300, categoryId: "salario", categoryLocked: false, isInternalTransfer: false },
        { id: "2", accountId: "b", date: "2026-09-05", description: "", amount: -200, categoryId: "outros", categoryLocked: false, isInternalTransfer: false },
      ],
      investments: [],
      cdiMonthly: new Map([["2026-09", 1.01], ["2026-10", 1.01]]),
    });
    expect(series.map((p) => p.cash)).toEqual([900, 700, 1000]);
    expect(series.at(-1)!.cdiIndex).toBeCloseTo(1.0201);
  });
});

describe("conexões do Meu Pluggy", () => {
  it("reconhece o conector 200 e dá um nome melhor", () => {
    expect(isMeuPluggy(200, "MeuPluggy")).toBe(true);
    expect(isMeuPluggy(612, "Nubank")).toBe(false);
    expect(institutionNameFrom(["Conta Nubank"], [], 1)).toBe("Conta Nubank");
    expect(institutionNameFrom([], ["XP INVESTIMENTOS CCTVM"], 2)).toBe("XP INVESTIMENTOS CCTVM");
    expect(institutionNameFrom([], [], 3)).toBe("Meu Pluggy 3");
  });
});
