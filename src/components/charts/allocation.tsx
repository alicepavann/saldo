import { Money } from "@/components/privacy";
import { percent } from "@/lib/format";

/** Tons de rosa → cinza: sóbrio, sem arco-íris. */
export const SHADES = ["#f2689c", "#c9547f", "#9a4466", "#6e344d", "#4a4a52", "#35353b", "#2a2a2f"];

export function AllocationBar({
  items,
}: {
  items: { name: string; value: number; share: number }[];
}) {
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full">
        {items.map((it, i) => (
          <div
            key={it.name}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${it.share * 100}%`, background: SHADES[i % SHADES.length] }}
            title={`${it.name}: ${percent(it.share)}`}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((it, i) => (
          <li key={it.name} className="flex items-center gap-3 text-[13px]">
            <span className="size-2 shrink-0 rounded-[3px]" style={{ background: SHADES[i % SHADES.length] }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{it.name}</span>
            <Money value={it.value} className="text-ink-3 text-xs" />
            <span className="num w-12 text-right text-ink">{percent(it.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
