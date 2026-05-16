import { DashboardShell } from "@/components/dashboard-shell";
import { getBackendHealth } from "@/lib/api";

export default async function Home() {
  const health = await getBackendHealth();

  return <DashboardShell health={health} />;
}
