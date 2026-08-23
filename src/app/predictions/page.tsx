import { Panel } from "@/components/Panel";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { MOCK_PREDICTIONS } from "@/lib/mock";
import Link from "next/link";

export default function PredictionsPage() {
  const items = MOCK_PREDICTIONS;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Prediction & Calibration</h1>
        <p className="text-xs text-cockpit-muted">
          Open forecasts, resolved outcomes, and calibration (Brier / error).
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No predictions"
          description="Create predictions via POST /predictions."
          schemaHint="Prediction"
        />
      ) : (
        <Panel title="Open & recent">
          <ul className="divide-y divide-cockpit-border">
            {items.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-cockpit-muted">{p.id}</span>
                      <StatusBadge status={p.status || "open"} />
                    </div>
                    <div className="mt-1 text-sm text-cockpit-text">
                      {p.statement || "—"}
                    </div>
                    {p.belief_id && (
                      <Link
                        href={`/beliefs/${p.belief_id}`}
                        className="mt-1 inline-block font-mono text-[11px] text-cockpit-accent hover:underline"
                      >
                        belief {p.belief_id}
                      </Link>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-cockpit-muted">Forecast</div>
                    <div className="font-mono text-sm text-cockpit-accent">
                      {(p.forecast_probability * 100).toFixed(0)}%
                    </div>
                    {p.resolve_by && (
                      <div className="mt-0.5 font-mono text-[10px] text-cockpit-muted">
                        by {new Date(p.resolve_by).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Calibration">
        <p className="text-xs text-cockpit-muted">
          Reliability diagram and bucketed accuracy will appear when resolved predictions exist.
          Brier score is stored on each resolved Prediction.
        </p>
      </Panel>
    </div>
  );
}
