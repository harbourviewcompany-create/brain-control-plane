import { Panel } from "@/components/Panel";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import {
  MOCK_BELIEFS,
  MOCK_SIGNALS,
  MOCK_CONTRADICTIONS,
  MOCK_CURIOSITY,
  MOCK_APPROVALS,
  MOCK_SOURCES,
} from "@/lib/mock";
import Link from "next/link";

export default function CockpitPage() {
  const quarantined = MOCK_SOURCES.filter((s) => s.status === "quarantined").length;
  const openContradictions = MOCK_CONTRADICTIONS.filter(
    (c) => c.status !== "resolved_with_note"
  ).length;
  const pendingApprovals = MOCK_APPROVALS.filter((a) => a.state === "requested").length;
  const openCuriosity = MOCK_CURIOSITY.filter(
    (c) => c.status === "open" || c.status === "in_progress"
  ).length;

  const beliefCounts = MOCK_BELIEFS.reduce(
    (acc, b) => {
      acc[b.state] = (acc[b.state] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-cockpit-text">Brain Cockpit</h1>
          <p className="text-xs text-cockpit-muted">
            Attention market · cognitive state · learning & risk
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Attention Market">
          <ul className="space-y-2">
            {MOCK_SIGNALS.sort((a, b) => b.attention_score - a.attention_score).map((s) => (
              <li
                key={s.id}
                className="rounded border border-cockpit-border/80 bg-cockpit-bg/50 px-2 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-cockpit-muted">{s.id}</span>
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
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(beliefCounts).map(([state, n]) => (
                  <span key={state} className="flex items-center gap-1">
                    <StatusBadge status={state} />
                    <span className="font-mono text-cockpit-text">{n}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Contradictions" value={openContradictions} href="/contradictions" alert />
              <Stat label="Curiosity tasks" value={openCuriosity} href="/curiosity" />
              <Stat label="Pending approvals" value={pendingApprovals} href="/approvals" alert={pendingApprovals > 0} />
              <Stat label="Quarantined sources" value={quarantined} href="/sources" alert={quarantined > 0} />
            </div>
            <div className="rounded border border-cockpit-border bg-cockpit-bg/40 px-2 py-2">
              <div className="text-[10px] uppercase text-cockpit-muted">Cognitive budget</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cockpit-border">
                <div className="h-full w-2/3 rounded-full bg-cockpit-accent" />
              </div>
              <div className="mt-1 font-mono text-[10px] text-cockpit-muted">~67% remaining (mock)</div>
            </div>
          </div>
        </Panel>

        <Panel title="Learning & Risk">
          <div className="space-y-3 text-xs">
            <div>
              <div className="mb-1 text-[10px] uppercase text-cockpit-muted">Top beliefs</div>
              <ul className="space-y-2">
                {MOCK_BELIEFS.slice(0, 3).map((b) => (
                  <li key={b.id}>
                    <Link href={`/beliefs/${b.id}`} className="block hover:text-cockpit-accent">
                      <div className="line-clamp-2 text-[11px] text-cockpit-text">{b.statement}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={b.state} />
                        <ConfidenceBar value={b.confidence} className="max-w-[100px]" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
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
