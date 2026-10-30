import { AppShell } from "@/components/shell/app-shell";
import { getData } from "@/lib/data";
import { SetupError } from "@/lib/pluggy/fetch";
import { SetupScreen } from "@/components/setup-screen";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let d;
  try {
    d = await getData();
  } catch (err) {
    if (err instanceof SetupError) return <SetupScreen title={err.message} hint={err.hint} />;
    throw err;
  }
  const soon = d.connections.filter((c) => {
    const days = (Date.parse(c.consentExpiresAt) - Date.parse(d.today)) / 864e5;
    return days <= 30 || c.status !== "UPDATED";
  }).length;
  return (
    <AppShell
      lastSyncAt={d.lastSyncAt}
      alerts={soon}
      isMock={d.source === "mock"}
      warnings={d.warnings}
      months={d.months.slice(-12)}
      currentYm={d.currentYm}
    >
      {children}
    </AppShell>
  );
}
