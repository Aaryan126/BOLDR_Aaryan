import { DashboardShell } from "@/components/dashboard-shell";
import {
  getBackendHealth,
  getAIOverview,
  getClassificationOverview,
  getDatasetOverview,
  getDraftOverview,
  getGapList,
  getGapMetrics,
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
      initialTickets={ticketList?.data ?? []}
      initialGaps={gapList?.data ?? []}
      initialGapMetrics={gapMetrics?.data ?? null}
      initialTicketDetail={initialTicketDetail}
    />
  );
}
