import { DashboardShell } from "@/components/dashboard-shell";
import {
  getBackendHealth,
  getClassificationOverview,
  getDatasetOverview,
  getRetrievalOverview,
} from "@/lib/api";

export default async function Home() {
  const [health, datasetOverview, classificationOverview, retrievalOverview] = await Promise.all([
    getBackendHealth(),
    getDatasetOverview(),
    getClassificationOverview(),
    getRetrievalOverview(),
  ]);

  return (
    <DashboardShell
      health={health}
      datasetOverview={datasetOverview}
      classificationOverview={classificationOverview}
      retrievalOverview={retrievalOverview}
    />
  );
}
