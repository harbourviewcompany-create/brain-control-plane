import type { ObservatorySnapshot } from "@/types/observatory";

function modeFor(snapshot: ObservatorySnapshot | null, loading: boolean): "OBSERVING" | "DEGRADED" | "ACTIVE" | "QUIET" {
  if (loading || !snapshot) return "OBSERVING";
  if (!snapshot.health || snapshot.health.status !== "ok" || snapshot.errors.length > 0) return "DEGRADED";
  const pressure =
    snapshot.contradictions.filter((item) => item.status !== "resolved_with_note").length +
    snapshot.curiosity.filter((item) => item.status === "open" || item.status === "in_progress").length +
    snapshot.approvals.filter((item) => item.state === "requested").length +
    snapshot.quarantine.length +
    Number(snapshot.runner?.inbox ?? snapshot.health.heartbeat?.inbox ?? 0);
  const newestSignal = snapshot.signals
    .map((signal) => Date.parse(signal.updated_at ?? signal.created_at ?? ""))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const recentSignal = newestSignal ? Date.now() - newestSignal < 5 * 60 * 1000 : false;
  return pressure > 0 || recentSignal ? "ACTIVE" : "QUIET";
}

export function SystemPulse({
  snapshot,
  loading,
  isLive,
}: {
  snapshot: ObservatorySnapshot | null;
  loading: boolean;
  isLive: boolean;
}) {
  const mode = modeFor(snapshot, loading);
  const heartbeat = snapshot?.health?.heartbeat ?? snapshot?.runner ?? {};
  const focus = snapshot?.selfState?.current_focus_summary?.trim();

  return (
    <header className="system-pulse" aria-label="Brain system pulse">
      <div className="system-pulse__brand">
        <span className="system-pulse__eyebrow">BRAIN</span>
        <strong>OBSERVATORY</strong>
      </div>
      <div className={`system-pulse__mode mode-${mode.toLowerCase()}`}>
        <span className="system-pulse__dot" aria-hidden="true" />
        <span>{mode}</span>
      </div>
      <div className="system-pulse__focus">
        <span>FOCUS</span>
        <strong>{focus || "No declared focus"}</strong>
      </div>
      <dl className="system-pulse__metrics">
        <div>
          <dt>CYCLE</dt>
          <dd>{String(heartbeat.ticks ?? 0)}</dd>
        </div>
        <div>
          <dt>INBOX</dt>
          <dd>{String(heartbeat.inbox ?? 0)}</dd>
        </div>
        <div>
          <dt>WORKING</dt>
          <dd>{String(heartbeat.working_memory_size ?? 0)}</dd>
        </div>
        <div className="system-pulse__desktop-metric">
          <dt>STORE</dt>
          <dd>{snapshot?.health?.persistence ?? snapshot?.persistence?.store ?? "—"}</dd>
        </div>
        <div className="system-pulse__desktop-metric">
          <dt>VERSION</dt>
          <dd>{snapshot?.health?.version ?? "—"}</dd>
        </div>
      </dl>
      <div className={`system-pulse__timeline ${isLive ? "is-live" : "is-replay"}`}>{isLive ? "LIVE" : "REPLAY"}</div>
    </header>
  );
}
