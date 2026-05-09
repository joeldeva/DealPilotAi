import type { DealReportListResponse, FullRunRequest, FullRunResponse, HostedStatus, SuperplaneCanvas } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function runFullDemo(request: FullRunRequest): Promise<FullRunResponse> {
  const response = await fetch(`${API_BASE_URL}/api/demo/full-run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_goal: request.user_goal,
      mode: "mock",
      use_live_apify: request.use_live_apify,
      confirm_live_run: request.confirm_live_run,
      apify_source: request.apify_source ?? "olx",
      max_items: request.max_items,
      use_live_llm: request.use_live_llm,
      confirm_live_llm: request.confirm_live_llm,
      save_report: request.save_report ?? true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json();
}

export async function fetchReports(limit = 6): Promise<DealReportListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/reports?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json();
}

export async function fetchSuperplaneCanvas(): Promise<SuperplaneCanvas> {
  const response = await fetch(`${API_BASE_URL}/api/superplane/canvas`);

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json();
}

export async function fetchHostedStatus(): Promise<HostedStatus> {
  const [health, apify, gemini, zynd, superplane, canvas] = await Promise.all([
    fetch(`${API_BASE_URL}/health`),
    fetch(`${API_BASE_URL}/api/apify/status`),
    fetch(`${API_BASE_URL}/api/gemini/status`),
    fetch(`${API_BASE_URL}/api/zynd/status`),
    fetch(`${API_BASE_URL}/api/superplane/status`),
    fetch(`${API_BASE_URL}/api/superplane/canvas`),
  ]);

  const responses = [health, apify, gemini, zynd, superplane, canvas];
  const failed = responses.find((response) => !response.ok);
  if (failed) {
    throw new Error(`Backend returned ${failed.status}`);
  }

  return {
    health: await health.json(),
    apify: await apify.json(),
    gemini: await gemini.json(),
    zynd: await zynd.json(),
    superplane: await superplane.json(),
    canvas: await canvas.json(),
  };
}
