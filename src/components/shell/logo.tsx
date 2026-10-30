import { cn } from "@/lib/cn";

/** Marca "saldo." — serifa itálica com o ponto final em rosa. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("display inline-flex items-baseline text-[26px] italic text-ink", className)}>
      saldo
      <span className="ml-[2px] inline-block size-[6px] translate-y-[-2px] rounded-full bg-rose" />
    </span>
  );
}
