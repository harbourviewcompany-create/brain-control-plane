"use client";

import Link from "next/link";
import type { CognitiveScene, SceneNode } from "@/types/observatory";

function cleanPayload(payload: Record<string, unknown>) {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "");
  return Object.fromEntries(entries);
}

export function ThoughtInspector({
  node,
  scene,
  onClose,
}: {
  node: SceneNode | null;
  scene: CognitiveScene;
  onClose: () => void;
}) {
  if (!node) return null;
  const relations = scene.edges
    .filter((edge) => edge.source === node.id || edge.target === node.id)
    .map((edge) => {
      const otherId = edge.source === node.id ? edge.target : edge.source;
      const other = scene.nodes.find((candidate) => candidate.id === otherId);
      return { edge, other };
    });

  return (
    <aside className="thought-inspector" aria-live="polite" aria-label={`Inspect ${node.kind}`}>
      <div className="thought-inspector__header">
        <div>
          <span className={`kind-chip kind-${node.kind}`}>{node.kind}</span>
          <h2>{node.label}</h2>
          <p>{node.summary}</p>
        </div>
        <button type="button" className="inspector-close" onClick={onClose} aria-label="Close inspector">×</button>
      </div>

      <div className="thought-inspector__identity">
        <span>ID</span>
        <code>{node.objectId}</code>
        {node.timestamp && <time dateTime={node.timestamp}>{new Date(node.timestamp).toLocaleString()}</time>}
      </div>

      <dl className="thought-inspector__metrics">
        {node.metrics.map((item) => (
          <div key={`${item.label}:${item.value}`} className={item.tone ? `tone-${item.tone}` : undefined}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <section className="thought-inspector__relations">
        <div className="inspector-section-title">
          <span>RELATIONS</span>
          <strong>{relations.length}</strong>
        </div>
        {relations.length === 0 ? (
          <p className="inspector-empty">No explicit relation is exposed for this object in the current scene.</p>
        ) : (
          <ul>
            {relations.map(({ edge, other }) => (
              <li key={edge.id}>
                <span>{edge.relation}</span>
                <strong>{other?.label ?? "Unresolved object"}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="thought-inspector__raw">
        <summary>Raw live payload</summary>
        <pre>{JSON.stringify(cleanPayload(node.payload), null, 2)}</pre>
      </details>

      {node.route && (
        <Link href={node.route} className="inspector-action">
          Open detailed surface <span aria-hidden="true">↗</span>
        </Link>
      )}
    </aside>
  );
}
