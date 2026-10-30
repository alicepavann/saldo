import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { AiError, generateObject, resolveProvider } from "@/lib/ai/llm";
import { z } from "zod";
import { getData } from "@/lib/data";
import { getMarket } from "@/lib/market";
import { portfolio } from "@/lib/compute";
import {
  ASSET_CLASSES,
  PRODUCT_EXAMPLES,
  ProfileSchema,
  TARGETS,
  currentAllocation,
  nextContributionPlan,
  scoreProfile,
} from "@/lib/invest/profile";

/** Formato da resposta (o mesmo para IA e para o modo "só regras"). */
const Advice = z.object({
  resumo: z.string(),
  perfilExplicado: z.string(),
  cenario: z.string(),
  alocacaoSugerida: z.array(z.object({ classe: z.string(), percentual: z.number(), motivo: z.string() })),
  proximoAporte: z.array(z.object({ classe: z.string(), valor: z.number(), comoInvestir: z.string() })),
  alertas: z.array(z.string()),
});
export type AdviceResult = z.infer<typeof Advice> & {
  fonte: "ia" | "regras";
  modelo?: string;
  perfil: string;
  geradoEm: string;
};

const pct = (v: number | null) => (v == null ? "indisponível" : `${(v * 100).toFixed(2).replace(".", ",")}%`);
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function describeMarket(m: { cdi: number | null; selic: number | null; ipca12m: number | null }) {
  const parts = [
    m.selic != null ? `Selic em ${pct(m.selic)} ao ano` : null,
    m.cdi != null ? `CDI em ${pct(m.cdi)}` : null,
    m.ipca12m != null ? `IPCA de 12 meses em ${pct(m.ipca12m)}` : null,
  ].filter(Boolean);
  if (!parts.length) return "Não consegui buscar os indicadores do Banco Central agora; a análise usa só a sua carteira.";
  const real = m.cdi != null && m.ipca12m != null ? (1 + m.cdi) / (1 + m.ipca12m) - 1 : null;
  return `${parts.join(", ")}.${real != null ? ` O juro real do CDI está em torno de ${pct(real)} ao ano.` : ""}`;
}

const SYSTEM = `Você é um planejador financeiro educativo dentro de um painel pessoal de finanças, falando com a dona do painel em português do Brasil.
Regras:
- Use SOMENTE os números fornecidos (carteira, perfil, indicadores do Banco Central). Não invente cotações, rentabilidades, notícias ou projeções de mercado que não estejam nos dados.
- Não indique ativos, emissores, fundos ou tickers específicos. Fale de classes de ativos e de tipos de produto (ex.: "Tesouro IPCA+ com vencimento perto do objetivo").
- Parta da alocação de referência do perfil. Pode ajustar até 10 pontos percentuais por classe se os dados justificarem, explicando o motivo.
- Se a reserva de emergência não estiver completa, a prioridade é completá-la.
- Considere o prazo do objetivo, liquidez, IR regressivo da renda fixa e a isenção de LCI/LCA quando fizer sentido.
- Seja direta e concreta: frases curtas, com números. Sem jargão desnecessário.
- Isto é conteúdo educativo, não recomendação individual de investimento (CVM); não repita esse aviso no texto, a tela já mostra.`;

export async function POST(req: Request) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "Entre de novo." }, { status: 401 });
  const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Perfil incompleto." }, { status: 400 });
  const profile = parsed.data;

  const [d, market] = await Promise.all([getData(), getMarket()]);
  const { profile: risk, score } = scoreProfile(profile);
  const pf = portfolio(d.investments);
  const alloc = currentAllocation(d.investments);
  const plan = nextContributionPlan({
    profile: risk,
    investments: d.investments,
    monthly: profile.aporteMensal,
    reserveMissing: d.emergency.missing,
  });
  const target = TARGETS[risk];

  // Regras puras: base para a IA e resposta quando não há chave.
  const rulesAdvice: z.infer<typeof Advice> = {
    resumo:
      d.emergency.missing > 0
        ? `Antes de diversificar, complete a reserva de emergência: faltam ${brl(d.emergency.missing)} para ${d.emergencyMonths} meses de custo.`
        : `Sua reserva está completa. Os próximos aportes podem seguir a alocação de perfil ${risk.toLowerCase()}.`,
    perfilExplicado: `Pelas respostas (pontuação ${score}), seu perfil é ${risk}. Objetivo: ${profile.objetivo}, prazo de ${profile.prazoAnos} anos.`,
    cenario: describeMarket(market),
    alocacaoSugerida: ASSET_CLASSES.filter((c) => target[c]).map((c) => ({
      classe: c,
      percentual: Math.round(target[c]! * 100),
      motivo: PRODUCT_EXAMPLES[c],
    })),
    proximoAporte: plan.map((p) => ({ classe: p.cls, valor: p.amount, comoInvestir: PRODUCT_EXAMPLES[p.cls] })),
    alertas: [
      ...(alloc.filter((a) => a.share > 0.6).map((a) => `${Math.round(a.share * 100)}% da carteira está em ${a.cls.toLowerCase()}.`)),
    ],
  };

  const meta = { perfil: risk, geradoEm: new Date().toISOString() };
  const provider = resolveProvider();
  if (!provider) {
    return NextResponse.json({ ...rulesAdvice, ...meta, fonte: "regras" } satisfies AdviceResult);
  }

  // Só agregados vão para a IA: nada de descrições, contas ou CPF.
  const payload = {
    perfil: { ...profile, classificacao: risk, pontuacao: score },
    carteira: {
      total: pf.total,
      ganho_sobre_aportes_pct: Math.round(pf.profitPct * 1000) / 10,
      por_classe: alloc.filter((a) => a.value > 0).map((a) => ({ classe: a.cls, valor: a.value, pct: Math.round(a.share * 1000) / 10 })),
      vencimentos: d.investments.filter((i) => i.dueDate).map((i) => ({ tipo: i.type, vencimento: i.dueDate, valor: i.balance })),
    },
    reserva: {
      custo_mensal_medio: d.avg6,
      alvo: d.emergency.target,
      atual: d.emergency.current,
      meses_cobertos: Math.round(d.emergency.monthsCovered * 10) / 10,
    },
    indicadores_bcb: { cdi_aa: market.cdi, selic_meta_aa: market.selic, ipca_12m: market.ipca12m, data: market.asOf },
    alocacao_referencia_perfil: target,
    plano_por_regras: rulesAdvice.proximoAporte,
  };

  const userMsg = `Dados do painel (JSON):\n${JSON.stringify(payload)}\n\nMonte a análise: resumo (2-3 frases), explicação do perfil, leitura do cenário com os indicadores, alocação sugerida (soma 100%, use os nomes de classe da alocação de referência), divisão do próximo aporte de ${brl(profile.aporteMensal)} (a soma dos valores deve ser igual ao aporte) com como investir em cada classe, e alertas. Escreva em português do Brasil.`;

  try {
    const out = await generateObject(Advice, SYSTEM, userMsg, provider);
    if (!out) throw new AiError("Sem provedor");
    return NextResponse.json({
      ...out.data,
      ...meta,
      fonte: "ia",
      modelo: `${out.provider} · ${out.model}`,
    } satisfies AdviceResult);
  } catch (err) {
    const status = err instanceof AiError ? err.status : undefined;
    const why =
      status === 401 || status === 403
        ? `chave da ${provider.name} inválida`
        : status === 429
          ? `limite grátis da ${provider.name} atingido, tente em alguns minutos`
          : status === 404
            ? `modelo não encontrado na ${provider.name}`
            : `a IA (${provider.name}) não respondeu direito`;
    console.error("[ai/invest]", provider.name, status, (err as Error).message);
    return NextResponse.json({
      ...rulesAdvice,
      alertas: [`Mostrando a análise por regras: ${why}.`, ...rulesAdvice.alertas],
      ...meta,
      fonte: "regras",
    } satisfies AdviceResult);
  }
}
