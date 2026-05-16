import { DashboardShell } from "@/components/dashboard-shell";
import {
  getBackendHealth,
  getClassificationOverview,
  getDatasetOverview,
} from "@/lib/api";

export default async function Home() {
  const [health, datasetOverview, classificationOverview] = await Promise.all([
    getBackendHealth(),
    getDatasetOverview(),
    getClassificationOverview(),
  ]);

  return (
    <DashboardShell
      health={health}
      datasetOverview={datasetOverview}
      classificationOverview={classificationOverview}
    />
  );
}
