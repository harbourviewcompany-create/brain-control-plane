"use client";

import { useEffect, useState } from "react";
import { apiBase, getHealth } from "@/lib/api";
import { MOCK_HEALTH } from "@/lib/mock";

export function TopBar() {
  const [health, setHealth] = useState(MOCK_HEALTH);
  const [live, setLive] = useState(false);
  const operator = process.env.NEXT_PUBLIC_OPERATOR_ID || "tyler";

  useEffect(() => {
    getHealth()
      .then((h) => {
        setHealth(h);
        setLive(true);
      })
      .catch(() => {
        setLive(false);
      });
  }, []);

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-cockpit-border bg-cockpit-panel px-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-wide text-cockpit-text">
          Brain Control Plane
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
            live ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"
          }`}
        >
          {live ? "API live" : "mock mode"}
        </span>
        <span className="hidden font-mono text-[10px] text-cockpit-muted sm:inline">
          {apiBase()}
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-cockpit-muted">
        <span title="Beliefs">B {health.beliefs}</span>
        <span title="Events">E {health.events}</span>
        <span title="Predictions">P {health.predictions}</span>
        <span className="hidden rounded border border-cockpit-border px-2 py-0.5 font-mono sm:inline">
          op:{operator}
        </span>
      </div>
    </header>
  );
}
