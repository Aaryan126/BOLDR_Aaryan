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
  const answerTicketId =
    ticketList?.data.find((ticket) => ticket.ticket_id === "TKT-1048")?.ticket_id ??
    ticketList?.data.find(
      (ticket) => ticket.reply_type === "customer_reply" && ticket.evidence_count > 0,
    )?.ticket_id ??
    ticketList?.data[0]?.ticket_id ??
    "TKT-1048";
  const gapTicketId =
    ticketList?.data.find((ticket) => ticket.ticket_id === "TKT-1036")?.ticket_id ??
    ticketList?.data.find(
      (ticket) =>
        Boolean(ticket.gap_id) &&
        /vegan|sustain|carbon|eco/i.test(
          `${ticket.subject} ${ticket.persona} ${ticket.intent}`,
        ),
    )?.ticket_id ??
    ticketList?.data.find((ticket) => Boolean(ticket.gap_id))?.ticket_id ??
    answerTicketId;
  const initialTicketId = ticketList?.data[0]?.ticket_id ?? answerTicketId;
  const [initialTicketDetail, answerCaseDetail, gapCaseDetail] = await Promise.all([
    getTicketDetail(initialTicketId),
    getTicketDetail(answerTicketId),
    getTicketDetail(gapTicketId),
  ]);

  return (
    <DashboardShell
      answerCaseDetail={answerCaseDetail}
      gapCaseDetail={gapCaseDetail}
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
