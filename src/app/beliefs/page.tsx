import Link from "next/link";
import { Panel } from "@/components/Panel";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { BitemporalStamp } from "@/components/BitemporalStamp";
import { MOCK_BELIEFS } from "@/lib/mock";

export default function BeliefsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Belief Ledger</h1>
        <p className="text-xs text-cockpit-muted">
          Evidence-backed claims with explicit uncertainty. Contradictions are preserved.
        </p>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-cockpit-border text-[10px] uppercase text-cockpit-muted">
                <th className="pb-2 pr-3 font-medium">Statement</th>
                <th className="pb-2 pr-3 font-medium">State</th>
                <th className="pb-2 pr-3 font-medium">Confidence</th>
                <th className="pb-2 pr-3 font-medium">Evidence</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BELIEFS.map((b) => (
                <tr key={b.id} className="border-b border-cockpit-border/50 hover:bg-cockpit-border/20">
                  <td className="py-2.5 pr-3">
                    <Link href={`/beliefs/${b.id}`} className="text-cockpit-text hover:text-cockpit-accent">
                      <div className="line-clamp-2 max-w-md">{b.statement}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-cockpit-muted">{b.id}</div>
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={b.state} />
                  </td>
                  <td className="py-2.5 pr-3 w-32">
                    <ConfidenceBar value={b.confidence} />
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[10px] text-cockpit-muted">
                    +{b.evidence_ids?.length || 0}
                    {(b.contradiction_ids?.length || 0) > 0 && (
                      <span className="ml-1 text-red-400">
                        / {b.contradiction_ids!.length} contra
                      </span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <BitemporalStamp
                      validFrom={b.valid_from}
                      knownAt={b.known_at}
                      createdAt={b.created_at}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
