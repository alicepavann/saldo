import {
  ArrowLeftRight,
  CreditCard,
  House,
  NotebookPen,
  PiggyBank,
  Settings,
  Target,
  TrendingUp,
} from "lucide-react";

export const NAV = [
  { href: "/", label: "Início", icon: House },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/orcamento", label: "Orçamento", icon: PiggyBank },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/analise", label: "Resumo do mês", icon: NotebookPen },
  { href: "/config", label: "Ajustes", icon: Settings },
] as const;

/** Itens que aparecem na barra inferior do celular (o resto vai em "Mais"). */
export const MOBILE_PRIMARY = ["/", "/transacoes", "/orcamento", "/investimentos"];

/** Telas que usam o seletor de mês do topo. */
export const MONTH_AWARE = ["/", "/transacoes", "/orcamento"];
