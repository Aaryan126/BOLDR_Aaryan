import { DashboardShell } from "@/components/dashboard-shell";
import { getBackendHealth, getDatasetOverview } from "@/lib/api";

export default async function Home() {
  const [health, datasetOverview] = await Promise.all([
    getBackendHealth(),
    getDatasetOverview(),
  ]);

  return <DashboardShell health={health} datasetOverview={datasetOverview} />;
}
