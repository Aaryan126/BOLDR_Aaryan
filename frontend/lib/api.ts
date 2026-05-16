export type BackendHealth = {
  status: "ok" | "unavailable";
  app?: string;
  phase?: string;
  detail?: string;
};

export async function getBackendHealth(): Promise<BackendHealth> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        detail: `Health check returned ${response.status}`,
      };
    }

    return (await response.json()) as BackendHealth;
  } catch (error) {
    return {
      status: "unavailable",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
