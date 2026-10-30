"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useTransition } from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Ellipsis, Eye, EyeOff, LogOut, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { dateTimeBr } from "@/lib/format";
import { usePrivacy } from "@/components/privacy";
import { Logo } from "./logo";
import { MOBILE_PRIMARY, MONTH_AWARE, NAV } from "./nav";
import { MonthSwitcher } from "./month-switcher";
import { CommandPalette, useCommandPalette } from "./command-palette";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({
  children,
  lastSyncAt,
  alerts,
  isMock,
  warnings = [],
  months,
  currentYm,
}: {
  children: React.ReactNode;
  lastSyncAt: string;
  alerts: number;
  isMock: boolean;
  warnings?: string[];
  months: string[];
  currentYm: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { hidden, toggle } = usePrivacy();
  const [syncing, startSync] = useTransition();
  const palette = useCommandPalette();
  const showMonth = MONTH_AWARE.includes(pathname);

  const sync = () =>
    startSync(async () => {
      if (isMock) {
        await new Promise((r) => setTimeout(r, 800));
        toast("Dados de exemplo", { description: "Nada para buscar no modo de exemplo." });
        return;
      }
      try {
        const res = await fetch("/api/sync", { method: "POST" });
        if (!res.ok) throw new Error(String(res.status));
        router.refresh();
        toast("Dados recarregados", { description: "A Pluggy atualiza com os bancos uma vez por dia." });
      } catch {
        toast.error("Não consegui sincronizar agora.");
      }
    });

  const logout = async () => {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col px-5 py-7 lg:flex">
        <Link href="/" className="px-3 pb-10">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Principal">
          {NAV.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex h-9 items-center gap-3 rounded-full px-3 text-[14px] transition-colors",
                  active ? "text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-all",
                    active ? "bg-rose" : "bg-transparent group-hover:bg-ink-4",
                  )}
                />
                <span className={cn(active && "display text-[19px] italic")}>{label}</span>
                {href === "/config" && alerts > 0 ? (
                  <span className="num ml-auto rounded-full bg-rose-soft px-1.5 text-[10px] text-rose-ink">{alerts}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => palette.setOpen(true)}
          className="mb-4 flex h-10 items-center gap-2.5 rounded-full border border-line px-4 text-[13px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
        >
          <Search className="size-4" strokeWidth={1.6} />
          Buscar
          <kbd className="ml-auto rounded border border-line-strong px-1.5 text-[10px]">Ctrl K</kbd>
        </button>
        <div className="flex items-center justify-between border-t border-line px-3 pt-4 text-[12px] text-ink-3">
          <span>Alice</span>
          <button onClick={logout} className="flex items-center gap-1.5 hover:text-ink" aria-label="Sair">
            <LogOut className="size-3.5" strokeWidth={1.6} /> sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Topo */}
        <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <Link href="/" className="lg:hidden">
              <Logo className="text-[22px]" />
            </Link>
            <p className="hidden items-center gap-2 text-xs text-ink-3 md:flex">
              <span className={cn("size-1.5 rounded-full", syncing ? "animate-pulse bg-rose" : "bg-pos")} />
              {syncing ? "Buscando dados…" : `Atualizado ${dateTimeBr(lastSyncAt)}`}
              {isMock ? <span className="text-ink-4">· dados de exemplo</span> : null}
            </p>
            <div className="ml-auto flex items-center gap-1">
              {showMonth ? (
                <Suspense fallback={null}>
                  <MonthSwitcher months={months} current={currentYm} />
                </Suspense>
              ) : null}
              <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
              <button
                onClick={() => palette.setOpen(true)}
                className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
                aria-label="Buscar"
              >
                <Search className="size-4" strokeWidth={1.6} />
              </button>
              <button
                onClick={toggle}
                className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
                title={hidden ? "Mostrar valores" : "Ocultar valores"}
              >
                {hidden ? <EyeOff className="size-4" strokeWidth={1.6} /> : <Eye className="size-4" strokeWidth={1.6} />}
              </button>
              <button
                onClick={sync}
                disabled={syncing}
                className="grid size-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
                aria-label="Sincronizar"
                title="Sincronizar"
              >
                <RefreshCw className={cn("size-4", syncing && "animate-spin")} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-8">
          {warnings.length ? (
            <div className="mb-6 rounded-[14px] bg-[rgba(226,178,102,0.07)] px-4 py-3 text-[13px] text-warn">
              {warnings.join(" · ")}
            </div>
          ) : null}
          {children}
        </main>
      </div>

      {/* Barra inferior (celular) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Principal"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.filter((n) => MOBILE_PRIMARY.includes(n.href)).map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[10.5px]", active ? "text-ink" : "text-ink-3")}
              >
                <Icon className={cn("size-[18px]", active && "text-rose")} strokeWidth={1.6} />
                {label}
              </Link>
            );
          })}
          <DM.Root>
            <DM.Trigger
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] focus:outline-none",
                NAV.some((n) => !MOBILE_PRIMARY.includes(n.href) && isActive(pathname, n.href)) ? "text-ink" : "text-ink-3",
              )}
            >
              <Ellipsis className="size-[18px]" strokeWidth={1.6} />
              Mais
            </DM.Trigger>
            <DM.Portal>
              <DM.Content side="top" align="end" sideOffset={8} className="card z-50 mr-3 min-w-52 bg-surface p-1.5 data-[state=open]:animate-in">
                {NAV.filter((n) => !MOBILE_PRIMARY.includes(n.href)).map(({ href, label, icon: Icon }) => (
                  <DM.Item key={href} asChild>
                    <Link
                      href={href}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13px] outline-none data-[highlighted]:bg-surface-2",
                        isActive(pathname, href) ? "text-ink" : "text-ink-2",
                      )}
                    >
                      <Icon className="size-4 text-ink-3" strokeWidth={1.6} />
                      {label}
                    </Link>
                  </DM.Item>
                ))}
                <DM.Item
                  onSelect={logout}
                  className="flex h-10 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[13px] text-ink-2 outline-none data-[highlighted]:bg-surface-2"
                >
                  <LogOut className="size-4 text-ink-3" strokeWidth={1.6} />
                  Sair
                </DM.Item>
              </DM.Content>
            </DM.Portal>
          </DM.Root>
        </div>
      </nav>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} onSync={sync} />
    </div>
  );
}
