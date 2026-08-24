"use client";

import { useEffect, useMemo, useState } from "react";
import { CognitiveField } from "@/components/observatory/CognitiveField";
import { CognitionTimeline } from "@/components/observatory/CognitionTimeline";
import { ObservatoryDock } from "@/components/observatory/ObservatoryDock";
import { SystemPulse } from "@/components/observatory/SystemPulse";
import { ThoughtInspector } from "@/components/observatory/ThoughtInspector";
import { useBrainObservatory } from "@/hooks/useBrainObservatory";
import { buildCognitiveScene } from "@/lib/observatory";
import type { CognitiveScene } from "@/types/observatory";

const EMPTY_SCENE: CognitiveScene = {
  nodes: [],
  edges: [],
  chronology: [],
  activity: 0,
  workingMemorySize: 0,
  memoryPressure: 0,
  counts: {
    organism: 0,
    signal: 0,
    belief: 0,
    prediction: 0,
    outcome: 0,
    contradiction: 0,
    curiosity: 0,
    source: 0,
    approval: 0,
    opportunity: 0,
    agency: 0,
    quarantine: 0,
  },
};

export function BrainObservatory() {
  const { snapshot, history, loading } = useBrainObservatory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const displayedSnapshot = scrubIndex === null ? snapshot : history[scrubIndex] ?? snapshot;
  const scene = useMemo(() => (displayedSnapshot ? buildCognitiveScene(displayedSnapshot) : EMPTY_SCENE), [displayedSnapshot]);
  const selectedNode = scene.nodes.find((node) => node.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !scene.nodes.some((node) => node.id === selectedId)) setSelectedId(null);
  }, [scene.nodes, selectedId]);

  return (
    <div className="observatory-root">
      <SystemPulse snapshot={displayedSnapshot} loading={loading} isLive={scrubIndex === null} />
      <ObservatoryDock />

      <main className="observatory-stage">
        <section className="observatory-field-shell" aria-label="Live cognitive field">
          <CognitiveField scene={scene} selectedId={selectedId} onSelect={setSelectedId} />
          <div className="field-readout field-readout--left" aria-hidden="true">
            <span>OBSERVED OBJECTS</span>
            <strong>{scene.nodes.length}</strong>
          </div>
          <div className="field-readout field-readout--right" aria-hidden="true">
            <span>EXPLICIT RELATIONS</span>
            <strong>{scene.edges.length}</strong>
          </div>
          {displayedSnapshot?.errors.length ? (
            <div className="read-degradation" role="status">
              <span>PARTIAL READ</span>
              <strong>{displayedSnapshot.errors.length} surface{displayedSnapshot.errors.length === 1 ? "" : "s"} degraded</strong>
            </div>
          ) : null}
        </section>

        <ThoughtInspector node={selectedNode} scene={scene} onClose={() => setSelectedId(null)} />
        <CognitionTimeline history={history} selectedIndex={scrubIndex} scene={scene} onScrub={setScrubIndex} />
      </main>
    </div>
  );
}
