"use client";

import type { CognitiveScene, ObservatorySnapshot } from "@/types/observatory";

export function CognitionTimeline({
  history,
  selectedIndex,
  scene,
  onScrub,
}: {
  history: ObservatorySnapshot[];
  selectedIndex: number | null;
  scene: CognitiveScene;
  onScrub: (index: number | null) => void;
}) {
  const effectiveIndex = selectedIndex ?? Math.max(0, history.length - 1);
  const current = history[effectiveIndex];

  return (
    <section className="cognition-timeline" aria-label="Observed session timeline">
      <div className="cognition-timeline__head">
        <div>
          <span>SESSION RECORD</span>
          <strong>{history.length} distinct state{history.length === 1 ? "" : "s"}</strong>
        </div>
        <div className="cognition-timeline__time">
          {current ? new Date(current.capturedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
        </div>
        <button type="button" className={selectedIndex === null ? "is-live" : ""} onClick={() => onScrub(null)}>
          LIVE
        </button>
      </div>

      <div className="cognition-timeline__scrub">
        <input
          type="range"
          min={0}
          max={Math.max(0, history.length - 1)}
          value={effectiveIndex}
          disabled={history.length < 2}
          onChange={(event) => onScrub(Number(event.target.value))}
          aria-label="Replay observed session state"
        />
        <div className="cognition-timeline__markers" aria-hidden="true">
          {history.map((item, index) => (
            <span key={`${item.signature}:${item.capturedAt}`} className={index === effectiveIndex ? "is-current" : ""} />
          ))}
        </div>
      </div>

      <div className="cognition-timeline__chronology" aria-label="Live object chronology">
        {scene.chronology.length === 0 ? (
          <span>NO TIMESTAMPED COGNITIVE OBJECTS EXPOSED</span>
        ) : (
          scene.chronology.map((node) => (
            <span key={node.id} title={node.label}>
              <time>{new Date(node.timestamp as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              <b>{node.kind}</b>
              <em>{node.label}</em>
            </span>
          ))
        )}
      </div>
    </section>
  );
}
