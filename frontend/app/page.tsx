import { DashboardShell } from "@/components/dashboard-shell";
import {
  getBackendHealth,
  getAIOverview,
  getClassificationOverview,
  getDatasetOverview,
  getDraftOverview,
  getExternalBenchmarkOverview,
  getGapList,
  getGapMetrics,
  getInsightsOverview,
  getQualityOverview,
  getRetrievalOverview,
  getTicketDetail,
  getTicketList,
  getWorkflowOverview,
} from "@/lib/api";

export default async function Home() {
  const [
    health,
    datasetOverview,
    classificationOverview,
    retrievalOverview,
    aiOverview,
    draftOverview,
    workflowOverview,
    ticketList,
    gapList,
    gapMetrics,
    insightsOverview,
    qualityOverview,
    externalBenchmarkOverview,
  ] = await Promise.all([
    getBackendHealth(),
    getDatasetOverview(),
    getClassificationOverview(),
    getRetrievalOverview(),
    getAIOverview(),
    getDraftOverview(),
    getWorkflowOverview(),
    getTicketList(),
    getGapList(),
    getGapMetrics(),
    getInsightsOverview(),
    getQualityOverview(),
    getExternalBenchmarkOverview(),
  ]);
  const initialTicketId = ticketList?.data[0]?.ticket_id ?? "TKT-1048";
  const initialTicketDetail = await getTicketDetail(initialTicketId);

  return (
    <DashboardShell
      health={health}
      datasetOverview={datasetOverview}
      classificationOverview={classificationOverview}
      retrievalOverview={retrievalOverview}
      aiOverview={aiOverview}
      draftOverview={draftOverview}
      workflowOverview={workflowOverview}
      insightsOverview={insightsOverview}
      qualityOverview={qualityOverview}
      externalBenchmarkOverview={externalBenchmarkOverview}
      initialTickets={ticketList?.data ?? []}
      initialGaps={gapList?.data ?? []}
      initialGapMetrics={gapMetrics?.data ?? null}
      initialTicketDetail={initialTicketDetail}
    />
  );
}
