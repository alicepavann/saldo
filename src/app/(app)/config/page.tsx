import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { ConfigView } from "./view";

export const metadata: Metadata = { title: "Configurações" };

export default async function Page() {
  const d = await getData();
  return (
    <ConfigView
      today={d.today}
      connections={d.connections}
      accounts={d.accounts}
      categories={d.categories}
      rules={d.rules}
      syncRuns={d.syncRuns}
      emergencyMonths={d.emergencyMonths}
      isMock={d.source === "mock"}
    />
  );
}
