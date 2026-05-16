import { DashboardShell } from "@/components/dashboard-shell";
import {
  getBackendHealth,
  getAIOverview,
  getClassificationOverview,
  getDatasetOverview,
  getDraftOverview,
  getRetrievalOverview,
} from "@/lib/api";

export default async function Home() {
  const [
    health,
    datasetOverview,
    classificationOverview,
    retrievalOverview,
    aiOverview,
    draftOverview,
  ] = await Promise.all([
    getBackendHealth(),
    getDatasetOverview(),
    getClassificationOverview(),
    getRetrievalOverview(),
    getAIOverview(),
    getDraftOverview(),
  ]);

  return (
    <DashboardShell
      health={health}
      datasetOverview={datasetOverview}
      classificationOverview={classificationOverview}
      retrievalOverview={retrievalOverview}
      aiOverview={aiOverview}
      draftOverview={draftOverview}
    />
  );
}
