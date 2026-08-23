/**
 * Brain Runtime API client.
 * Set NEXT_PUBLIC_BRAIN_API_URL (no trailing slash).
 * Optional NEXT_PUBLIC_BRAIN_API_KEY for production API auth.
 * With no base URL, callers should fall back to mock data.
 */

import type {
  Belief,
  HealthResponse,
  ListResponse,
  Prediction,
  ApprovalRequest,
  Contradiction,
  CuriosityTask,
  FormulaRun,
  Opportunity,
  Signal,
  Outcome,
  AcceptanceReport,
} from "@/types/brain";

const BASE = (process.env.NEXT_PUBLIC_BRAIN_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.NEXT_PUBLIC_BRAIN_API_KEY || "";

export function isApiConfigured(): boolean {
  return Boolean(BASE);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) {
    throw new Error("Brain API not configured (set NEXT_PUBLIC_BRAIN_API_URL)");
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (API_KEY) {
    headers["X-Brain-Api-Key"] = API_KEY;
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brain API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function createBelief(statement: string, confidence = 0.5) {
  return request<{ id: string; statement: string; confidence: number; state: string }>(
    "/beliefs",
    { method: "POST", body: JSON.stringify({ statement, confidence }) }
  );
}

export async function learn(
  beliefId: string,
  claim: string,
  sourceId: string,
  reliability: number,
  supports: boolean
) {
  return request<{
    id: string;
    statement: string;
    confidence: number;
    state: string;
    version: number;
  }>("/learn", {
    method: "POST",
    body: JSON.stringify({
      belief_id: beliefId,
      claim,
      source_id: sourceId,
      reliability,
      supports,
    }),
  });
}

export async function getPrediction(id: string) {
  return request<Prediction>(`/predictions/${id}`);
}

export async function createPrediction(body: {
  statement: string;
  expected_value: number;
  confidence?: number;
  horizon_seconds?: number;
  belief_id?: string;
  action_id?: string;
}) {
  return request<Prediction>("/predictions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listBeliefs(): Promise<ListResponse<Belief> & { source?: string }> {
  return request<ListResponse<Belief> & { source?: string }>("/beliefs");
}

export async function getBelief(id: string): Promise<Belief> {
  return request<Belief>(`/beliefs/${id}`);
}

export async function listPredictions(): Promise<ListResponse<Prediction>> {
  return request<ListResponse<Prediction>>("/predictions");
}

export async function listSignals(): Promise<ListResponse<Signal>> {
  return { items: [], total: 0 };
}

export async function listOpportunities(): Promise<ListResponse<Opportunity>> {
  return { items: [], total: 0 };
}

export async function listApprovals(): Promise<ListResponse<ApprovalRequest>> {
  return { items: [], total: 0 };
}

export async function listContradictions(): Promise<ListResponse<Contradiction>> {
  return { items: [], total: 0 };
}

export async function listCuriosityTasks(): Promise<ListResponse<CuriosityTask>> {
  return { items: [], total: 0 };
}

export async function listOutcomes(): Promise<ListResponse<Outcome>> {
  return { items: [], total: 0 };
}

export async function listFormulaRuns(): Promise<ListResponse<FormulaRun>> {
  return { items: [], total: 0 };
}

export async function listAcceptanceReports(): Promise<ListResponse<AcceptanceReport>> {
  return { items: [], total: 0 };
}

export function apiBase(): string {
  return BASE || "(not configured)";
}
