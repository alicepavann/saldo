import {
  ArrowLeftRight,
  Bus,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Sparkle,
  UtensilsCrossed,
  Wallet,
  Circle,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  moradia: House,
  mercado: ShoppingCart,
  alimentacao: UtensilsCrossed,
  transporte: Bus,
  saude: HeartPulse,
  educacao: GraduationCap,
  lazer: Clapperboard,
  assinaturas: Repeat,
  compras: ShoppingBag,
  pessoal: Sparkle,
  outros: Circle,
  salario: Briefcase,
  "renda-extra": Wallet,
  transferencia: ArrowLeftRight,
  investimento: Landmark,
};

export function CategoryIcon({
  id,
  className,
  accent,
}: {
  id: string;
  className?: string;
  accent?: boolean;
}) {
  const Icon = ICONS[id] ?? Circle;
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[9px] border",
        accent ? "border-rose-line bg-rose-soft text-rose" : "border-line bg-surface-2 text-ink-3",
        className,
      )}
    >
      <Icon className="size-[15px]" strokeWidth={1.6} />
    </span>
  );
}
