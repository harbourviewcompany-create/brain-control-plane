"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/Panel";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import {
  getHealth,
  isApiConfigured,
  listApprovals,
  listBeliefs,
  listContradictions,
  listCuriosityTasks,
  listSignals,
  listSources,
} from "@/lib/api";
import type {
  ApprovalRequest,
  Belief,
  Contradiction,
  CuriosityTask,
  HealthResponse,
  ListResponse,
  Signal,
  Source,
} from "@/types/brain";

function normalizeBelief(b: Partial<Belief> & { id: string; statement: string }): Belief {
  return {
    id: b.id,
    statement: b.statement,
    confidence: b.confidence ?? 0.5,
    state: (b.state as Belief["state"]) || "hypothesis",
    version: b.version ?? 1,
    valid_from: b.valid_from || new Date().toISOString(),
    created_at: b.created_at || new Date().toISOString(),
    updated_at: b.updated_at,
    evidence_ids: b.evidence_ids || [],
    contradiction_ids: b.contradiction_ids || [],
  };
}

function fulfilledItems<T>(
  result: PromiseSettledResult<ListResponse<T>>,
  label: string,
  errors: string[]
): T[] {
  if (result.status === "fulfilled") {
    return result.value.items || [];
  }
  errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
  return [];
}

function fulfilledHealth(
  result: PromiseSettledResult<HealthResponse>,
  errors: string[]
): HealthResponse | null {
  if (result.status === "fulfilled") {
    return result.value;
  }
  errors.push(`health: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
  return null;
}

export default function CockpitPage() {
  const [beliefs, setBeliefs] = useState<Belief[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [curiosityTasks, setCuriosityTasks] = useState<CuriosityTask[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCockpit() {
      if (!isApiConfigured()) {
        setErrors(["Brain API not configured: set NEXT_PUBLIC_BRAIN_API_URL"]);
        setLoading(false);
        return;
      }

      const [
        healthResult,
        beliefResult,
        signalResult,
        contradictionResult,
        curiosityResult,
        approvalResult,
        sourceResult,
      ] = await Promise.allSettled([
        getHealth(),
        listBeliefs(),
        listSignals(),
        listContradictions(),
        listCuriosityTasks(),
        listApprovals(),
        listSources(),
      ]);

      if (cancelled) return;

      const nextErrors: string[] = [];
      setHealth(fulfilledHealth(healthResult, nextErrors));
      setBeliefs(
        fulfilledItems(beliefResult, "beliefs", nextErrors).map((belief) => normalizeBelief(belief))
      );
      setSignals(fulfilledItems(signalResult, "signals", nextErrors));
      setContradictions(fulfilledItems(contradictionResult, "contradictions", nextErrors));
      setCuriosityTasks(fulfilledItems(curiosityResult, "curiosity", nextErrors));
      setApprovals(fulfilledItems(approvalResult, "approvals", nextErrors));
      setSources(fulfilledItems(sourceResult, "sources", nextErrors));
      setErrors(nextErrors);
      setLoading(false);
    }

    loadCockpit();

    return () => {
      cancelled = true;
    };
  }, []);

  const quarantined = sources.filter((s) => s.status === "quarantined").length;
  const openContradictions = contradictions.filter((c) => c.status !== "resolved_with_note").length;
  const pendingApprovals = approvals.filter((a) => a.state === "requested").length;
  const openCuriosity = curiosityTasks.filter(
    (c) => c.status === "open" || c.status === "in_progress"
  ).length;

  const beliefCounts = beliefs.reduce(
    (acc, b) => {
      acc[b.state] = (acc[b.state] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const cognitivePressure = Math.min(
    100,
    openContradictions * 25 + pendingApprovals * 15 + quarantined * 10 + openCuriosity * 5
  );
  const cognitiveBudget = Math.max(0, 100 - cognitivePressure);
  const sortedSignals = [...signals].sort((a, b) => b.attention_score - a.attention_score);
  const topBeliefs = [...beliefs].sort((a, b) => b.confidence - a.confidence).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-cockpit-text">Brain Cockpit</h1>
          <p className="text-xs text-cockpit-muted">
            Live attention market · cognitive state · learning & risk
          </p>
        </div>
        {openContradictions > 0 && (
          <Link
            href="/contradictions"
            className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300"
          >
            {openContradictions} contradiction{openContradictions > 1 ? "s" : ""} need review
          </Link>
        )}
      </div>

      {errors.length > 0 && (
        <Panel title="API Read Errors">
          <ul className="space-y-1 text-xs text-amber-300">
            {errors.map((error) => (
              <li key={error} className="font-mono">
                {error}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Attention Market">
          {loading ? (
            <EmptyState label="Loading live signals..." />
          ) : sortedSignals.length === 0 ? (
            <EmptyState label="No live attention signals yet." />
          ) : (
            <ul className="space-y-2">
              {sortedSignals.map((s) => (
                <li
                  key={s.id}
                  className="rounded border border-cockpit-border/80 bg-cockpit-bg/50 px-2 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-cockpit-muted">
                      {s.id.slice(0, 8)}
                    </span>
                    <span className="font-mono text-xs text-cockpit-accent">
                      {s.attention_score.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-cockpit-muted">
                    <span>nov {s.novelty.toFixed(2)}</span>
                    <span>urg {s.urgency.toFixed(2)}</span>
                    <span>src {s.source_id}</span>
                  </div>
                  {s.formula_run_id && (
                    <div className="mt-1 font-mono text-[9px] text-cockpit-muted/70">
                      formula {s.formula_run_id}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/perception"
            className="mt-3 block text-center text-[11px] text-cockpit-accent hover:underline"
          >
            Open Perception Inbox →
          </Link>
        </Panel>

        <Panel title="Cognitive State">
          <div className="space-y-3 text-xs">
            <div>
              <div className="mb-1 text-[10px] uppercase text-cockpit-muted">Beliefs by state</div>
              {Object.keys(beliefCounts).length === 0 ? (
                <EmptyState label="No live beliefs yet." />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(beliefCounts).map(([state, n]) => (
                    <span key={state} className="flex items-center gap-1">
                      <StatusBadge status={state} />
                      <span className="font-mono text-cockpit-text">{n}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Contradictions" value={openContradictions} href="/contradictions" alert />
              <Stat label="Curiosity tasks" value={openCuriosity} href="/curiosity" />
              <Stat label="Pending approvals" value={pendingApprovals} href="/approvals" alert />
              <Stat label="Quarantined sources" value={quarantined} href="/sources" alert />
            </div>
            <div className="rounded border border-cockpit-border bg-cockpit-bg/40 px-2 py-2">
              <div className="text-[10px] uppercase text-cockpit-muted">Cognitive budget</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cockpit-border">
                <div
                  className="h-full rounded-full bg-cockpit-accent"
                  style={{ width: `${cognitiveBudget}%` }}
                />
              </div>
              <div className="mt-1 font-mono text-[10px] text-cockpit-muted">
                {cognitiveBudget}% remaining · live pressure model
              </div>
              <div className="mt-1 font-mono text-[10px] text-cockpit-muted/80">
                {health
                  ? `${health.beliefs} beliefs · ${health.events} events · ${health.predictions} predictions`
                  : "health unavailable"}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Learning & Risk">
          <div className="space-y-3 text-xs">
            <div>
              <div className="mb-1 text-[10px] uppercase text-cockpit-muted">Top beliefs</div>
              {loading ? (
                <EmptyState label="Loading live beliefs..." />
              ) : topBeliefs.length === 0 ? (
                <EmptyState label="No live beliefs available." />
              ) : (
                <ul className="space-y-2">
                  {topBeliefs.map((b) => (
                    <li key={b.id}>
                      <Link href={`/beliefs/${b.id}`} className="block hover:text-cockpit-accent">
                        <div className="line-clamp-2 text-[11px] text-cockpit-text">
                          {b.statement}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={b.state} />
                          <ConfidenceBar value={b.confidence} className="max-w-[100px]" />
                          <span className="font-mono text-[10px] text-cockpit-muted">
                            {Math.round(b.confidence * 100)}%
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link
              href="/learning"
              className="block text-center text-[11px] text-cockpit-accent hover:underline"
            >
              Open Learning Console →
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded border border-cockpit-border bg-cockpit-bg/40 px-2 py-3 text-center text-[11px] text-cockpit-muted">
      {label}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  alert,
}: {
  label: string;
  value: number;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded border px-2 py-2 ${
        alert && value > 0
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-cockpit-border bg-cockpit-bg/40"
      }`}
    >
      <div className="text-[10px] text-cockpit-muted">{label}</div>
      <div className={`font-mono text-lg ${alert && value > 0 ? "text-amber-300" : "text-cockpit-text"}`}>
        {value}
      </div>
    </Link>
  );
}
