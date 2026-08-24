import type {
  CognitiveScene,
  ObservedGraphEdge,
  ObservatorySnapshot,
  SceneEdge,
  SceneKind,
  SceneMetric,
  SceneNode,
} from "@/types/observatory";

const TAU = Math.PI * 2;

function hash01(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function finite(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function short(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function metric(label: string, value: unknown, tone?: SceneMetric["tone"]): SceneMetric {
  return { label, value: String(value), tone };
}

function normalizedArc(
  id: string,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  start: number,
  span: number,
  radialVariance = 0.08
) {
  const angle = start + hash01(`${id}:angle`) * span;
  const variance = 1 + (hash01(`${id}:radius`) - 0.5) * radialVariance;
  return {
    x: clamp(centerX + Math.cos(angle) * radiusX * variance, 0.035, 0.965),
    y: clamp(centerY + Math.sin(angle) * radiusY * variance, 0.06, 0.94),
  };
}

function timestampOf(value: Record<string, unknown>): string | undefined {
  const candidate = value.updated_at ?? value.created_at ?? value.valid_from ?? value.known_at;
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

function predictionConfidence(payload: Record<string, unknown>): number {
  return clamp(finite(payload.confidence ?? payload.forecast_probability, 0.5));
}

function sceneId(kind: SceneKind, objectId: string): string {
  return `${kind}:${objectId}`;
}

function addNode(nodes: SceneNode[], counts: Record<SceneKind, number>, node: SceneNode) {
  nodes.push(node);
  counts[node.kind] += 1;
}

export function buildCognitiveScene(snapshot: ObservatorySnapshot): CognitiveScene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const counts: Record<SceneKind, number> = {
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
  };

  const heartbeat = snapshot.health?.heartbeat ?? snapshot.runner ?? {};
  const organismPayload = {
    ...(snapshot.organism ? record(snapshot.organism) : {}),
    ...(snapshot.selfState ? record(snapshot.selfState) : {}),
    health: snapshot.health,
    runner: snapshot.runner,
    persistence: snapshot.persistence,
  };
  const organismLabel = short(snapshot.selfState?.current_focus_summary, snapshot.organism ? "Cognitive organism" : "Runtime state");
  addNode(nodes, counts, {
    id: "organism:runtime",
    objectId: "runtime",
    kind: "organism",
    label: organismLabel,
    summary: snapshot.organism
      ? "Live organism state reported by Brain"
      : "Connected Brain runtime; organism detail is not currently exposed",
    x: 0.47,
    y: 0.5,
    size: 22 + Math.min(10, finite(heartbeat.working_memory_size, 0) * 1.5),
    importance: 1,
    state: snapshot.health?.status ?? "unknown",
    route: "/organism",
    metrics: [
      metric("beliefs", snapshot.health?.beliefs ?? snapshot.beliefs.length),
      metric("ticks", heartbeat.ticks ?? 0, "attention"),
      metric("working memory", heartbeat.working_memory_size ?? 0),
      metric("persistence", snapshot.health?.persistence ?? snapshot.persistence?.store ?? "unknown"),
    ],
    payload: organismPayload,
  });

  const sourceByName = new Map<string, string>();
  [...snapshot.sources]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((source) => {
      const payload = record(source);
      const pos = normalizedArc(source.id, 0.13, 0.5, 0.075, 0.36, Math.PI / 2, Math.PI);
      const trust = clamp(finite(source.trust_score, 0.5));
      const id = sceneId("source", source.id);
      sourceByName.set(source.name.toLowerCase(), id);
      addNode(nodes, counts, {
        id,
        objectId: source.id,
        kind: "source",
        label: source.name,
        summary: `${source.kind} source · ${source.status}`,
        ...pos,
        size: 7 + trust * 5,
        importance: 0.35 + trust * 0.35,
        timestamp: timestampOf(payload),
        state: source.status,
        route: "/sources",
        metrics: [metric("trust", trust.toFixed(2)), metric("status", source.status)],
        payload,
      });
    });

  const signalSceneByObjectId = new Map<string, string>();
  [...snapshot.signals]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((signal) => {
      const payload = record(signal);
      const metadata = record(signal.metadata);
      const pos = normalizedArc(signal.id, 0.26, 0.5, 0.155, 0.39, Math.PI / 2, Math.PI);
      const attention = clamp(finite(signal.attention_score));
      const urgency = clamp(finite(signal.urgency));
      const label = short(metadata.claim ?? metadata.content, signal.source_id || "Signal");
      const id = sceneId("signal", signal.id);
      signalSceneByObjectId.set(signal.id, id);
      addNode(nodes, counts, {
        id,
        objectId: signal.id,
        kind: "signal",
        label,
        summary: `Perception from ${signal.source_id}`,
        ...pos,
        size: 8 + attention * 12,
        importance: 0.45 + attention * 0.5,
        timestamp: timestampOf(payload),
        route: "/perception",
        metrics: [
          metric("attention", attention.toFixed(2), "attention"),
          metric("novelty", finite(signal.novelty).toFixed(2)),
          metric("urgency", urgency.toFixed(2), urgency > 0.65 ? "warning" : "neutral"),
          metric("source", signal.source_id),
        ],
        payload,
      });

      const sourceSceneId = sourceByName.get(signal.source_id.toLowerCase());
      if (sourceSceneId) {
        edges.push({
          id: `origin:${sourceSceneId}:${id}`,
          source: sourceSceneId,
          target: id,
          relation: "origin",
          strength: Math.max(0.3, attention),
        });
      }
    });

  const beliefSceneByObjectId = new Map<string, string>();
  [...snapshot.beliefs]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((belief) => {
      const payload = record(belief);
      const pos = normalizedArc(belief.id, 0.47, 0.5, 0.18, 0.245, 0, TAU, 0.22);
      const confidence = clamp(finite(belief.confidence, 0.5));
      const id = sceneId("belief", belief.id);
      beliefSceneByObjectId.set(belief.id, id);
      addNode(nodes, counts, {
        id,
        objectId: belief.id,
        kind: "belief",
        label: belief.statement,
        summary: `${belief.state} belief · version ${belief.version ?? 1}`,
        ...pos,
        size: 9 + confidence * 13,
        importance: 0.55 + confidence * 0.4,
        timestamp: timestampOf(payload),
        state: belief.state,
        route: `/beliefs/${belief.id}`,
        metrics: [
          metric("confidence", `${Math.round(confidence * 100)}%`, confidence > 0.75 ? "success" : "neutral"),
          metric("state", belief.state),
          metric("evidence", belief.evidence_ids?.length ?? 0),
          metric("contradictions", belief.contradiction_ids?.length ?? 0),
        ],
        payload,
      });
    });

  [...snapshot.contradictions]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((contradiction) => {
      const payload = record(contradiction);
      const linkedBelief = contradiction.belief_ids.map((id) => beliefSceneByObjectId.get(id)).find(Boolean);
      const base = linkedBelief ? nodes.find((node) => node.id === linkedBelief) : undefined;
      const pos = base
        ? {
            x: clamp(base.x + (hash01(`${contradiction.id}:x`) - 0.5) * 0.13, 0.06, 0.94),
            y: clamp(base.y + (hash01(`${contradiction.id}:y`) - 0.5) * 0.13, 0.08, 0.92),
          }
        : normalizedArc(contradiction.id, 0.47, 0.5, 0.27, 0.31, 0, TAU);
      const pressure = clamp(finite(contradiction.investigation_pressure, 0.6));
      const id = sceneId("contradiction", contradiction.id);
      addNode(nodes, counts, {
        id,
        objectId: contradiction.id,
        kind: "contradiction",
        label: "Contradiction",
        summary: `${contradiction.belief_ids.length} belief relation${contradiction.belief_ids.length === 1 ? "" : "s"} under tension`,
        ...pos,
        size: 9 + pressure * 8,
        importance: 0.72 + pressure * 0.25,
        timestamp: timestampOf(payload),
        state: contradiction.status,
        route: "/contradictions",
        metrics: [
          metric("status", contradiction.status, "danger"),
          metric("pressure", pressure.toFixed(2), "danger"),
          metric("supporting", contradiction.supporting_evidence_ids.length),
          metric("contradicting", contradiction.contradicting_evidence_ids.length),
        ],
        payload,
      });
      contradiction.belief_ids.forEach((beliefId) => {
        const target = beliefSceneByObjectId.get(beliefId);
        if (target) {
          edges.push({
            id: `tension:${id}:${target}`,
            source: id,
            target,
            relation: "contradicts",
            strength: Math.max(0.55, pressure),
            tension: true,
          });
        }
      });
    });

  const curiosityItems = [
    ...snapshot.curiosity.map((item) => ({ type: "runtime" as const, item })),
    ...snapshot.organismCuriosity.map((item, index) => ({ type: "organism" as const, item, index })),
  ];
  curiosityItems.forEach((entry) => {
    const rawId = "id" in entry.item && entry.item.id ? String(entry.item.id) : `${entry.type}:${entry.index ?? entry.item.linked_object_id ?? entry.item.title ?? "task"}`;
    const payload = record(entry.item);
    const priority = clamp(finite(payload.priority ?? payload.expected_value, 0.5));
    const pos = normalizedArc(rawId, 0.51, 0.12, 0.3, 0.08, Math.PI, Math.PI);
    const id = sceneId("curiosity", rawId);
    const title = short(payload.title ?? payload.question ?? payload.trigger_type, "Unresolved question");
    addNode(nodes, counts, {
      id,
      objectId: rawId,
      kind: "curiosity",
      label: title,
      summary: entry.type === "organism" ? "Organism curiosity" : "Curiosity task",
      ...pos,
      size: 7 + priority * 7,
      importance: 0.45 + priority * 0.45,
      timestamp: timestampOf(payload),
      state: typeof payload.status === "string" ? payload.status : undefined,
      route: "/curiosity",
      metrics: [
        metric("priority", priority.toFixed(2), "warning"),
        metric("status", payload.status ?? "open"),
        metric("uncertainty", finite(payload.uncertainty, 0).toFixed(2)),
      ],
      payload,
    });
    const linkedObjectId = typeof payload.linked_object_id === "string" ? payload.linked_object_id : undefined;
    const linked = linkedObjectId ? beliefSceneByObjectId.get(linkedObjectId) ?? signalSceneByObjectId.get(linkedObjectId) : undefined;
    if (linked) {
      edges.push({ id: `question:${id}:${linked}`, source: id, target: linked, relation: "questions", strength: priority });
    }
  });

  const predictionSceneByObjectId = new Map<string, string>();
  [...snapshot.predictions]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((prediction) => {
      const payload = record(prediction);
      const pos = normalizedArc(prediction.id, 0.78, 0.49, 0.17, 0.33, -Math.PI / 2, Math.PI);
      const confidence = predictionConfidence(payload);
      const id = sceneId("prediction", prediction.id);
      predictionSceneByObjectId.set(prediction.id, id);
      addNode(nodes, counts, {
        id,
        objectId: prediction.id,
        kind: "prediction",
        label: short(payload.statement, "Prediction"),
        summary: `${String(payload.status ?? "open")} prediction`,
        ...pos,
        size: 9 + confidence * 10,
        importance: 0.5 + confidence * 0.42,
        timestamp: timestampOf(payload),
        state: typeof payload.status === "string" ? payload.status : undefined,
        route: "/predictions",
        metrics: [
          metric("confidence", `${Math.round(confidence * 100)}%`, "future"),
          metric("expected value", payload.expected_value ?? "—"),
          metric("status", payload.status ?? "open"),
          metric("resolve by", payload.resolve_by ?? "—"),
        ],
        payload,
      });
      if (prediction.belief_id) {
        const source = beliefSceneByObjectId.get(prediction.belief_id);
        if (source) {
          edges.push({ id: `forecast:${source}:${id}`, source, target: id, relation: "forecasts", strength: confidence });
        }
      }
    });

  [...snapshot.outcomes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((outcome) => {
      const payload = record(outcome);
      const pos = normalizedArc(outcome.id, 0.73, 0.81, 0.18, 0.11, 0, Math.PI);
      const accuracy = clamp(finite(outcome.prediction_accuracy));
      const id = sceneId("outcome", outcome.id);
      addNode(nodes, counts, {
        id,
        objectId: outcome.id,
        kind: "outcome",
        label: `Outcome · ${Math.round(accuracy * 100)}% accuracy`,
        summary: `Value created ${finite(outcome.value_created).toFixed(2)}`,
        ...pos,
        size: 8 + accuracy * 9,
        importance: 0.5 + accuracy * 0.38,
        timestamp: timestampOf(payload),
        route: "/learning",
        metrics: [
          metric("accuracy", `${Math.round(accuracy * 100)}%`, accuracy > 0.7 ? "success" : "warning"),
          metric("value", finite(outcome.value_created).toFixed(2)),
          metric("trust impact", finite(outcome.trust_impact).toFixed(2)),
          metric("legal risk", finite(outcome.legal_risk).toFixed(2)),
        ],
        payload,
      });
      if (outcome.prediction_id) {
        const source = predictionSceneByObjectId.get(outcome.prediction_id);
        if (source) {
          edges.push({ id: `resolution:${source}:${id}`, source, target: id, relation: "resolved by", strength: Math.max(0.35, accuracy) });
        }
      }
      edges.push({ id: `learn:${id}:organism`, source: id, target: "organism:runtime", relation: "feeds learning", strength: Math.max(0.35, accuracy) });
    });

  [...snapshot.opportunities]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((opportunity) => {
      const payload = record(opportunity);
      const pos = normalizedArc(opportunity.id, 0.62, 0.7, 0.14, 0.14, 0, Math.PI);
      const expected = clamp(finite(opportunity.expected_value, 0.5));
      const id = sceneId("opportunity", opportunity.id);
      addNode(nodes, counts, {
        id,
        objectId: opportunity.id,
        kind: "opportunity",
        label: opportunity.title,
        summary: `${opportunity.status} opportunity`,
        ...pos,
        size: 8 + expected * 8,
        importance: 0.45 + expected * 0.4,
        timestamp: timestampOf(payload),
        state: opportunity.status,
        route: "/opportunities",
        metrics: [metric("expected value", opportunity.expected_value), metric("risk", opportunity.risk_score), metric("status", opportunity.status)],
        payload,
      });
      opportunity.belief_ids.forEach((beliefId) => {
        const source = beliefSceneByObjectId.get(beliefId);
        if (source) edges.push({ id: `opportunity:${source}:${id}`, source, target: id, relation: "supports", strength: expected });
      });
    });

  [...snapshot.approvals]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((approval) => {
      const payload = record(approval);
      const pos = normalizedArc(approval.id, 0.45, 0.88, 0.16, 0.045, 0, Math.PI);
      const id = sceneId("approval", approval.id);
      addNode(nodes, counts, {
        id,
        objectId: approval.id,
        kind: "approval",
        label: `Approval · ${approval.state}`,
        summary: approval.external_consequence ? "External consequence requires operator authority" : "Operator approval gate",
        ...pos,
        size: approval.state === "requested" ? 13 : 9,
        importance: approval.state === "requested" ? 0.92 : 0.5,
        timestamp: timestampOf(payload),
        state: approval.state,
        route: "/approvals",
        metrics: [metric("state", approval.state, approval.state === "requested" ? "warning" : "neutral"), metric("approver", approval.required_approver), metric("external", approval.external_consequence)],
        payload,
      });
      edges.push({ id: `approval:${id}:organism`, source: "organism:runtime", target: id, relation: "governed action", strength: approval.state === "requested" ? 0.9 : 0.4 });
    });

  snapshot.agencyActions.forEach((action, index) => {
    const payload = record(action);
    const rawId = action.id ? String(action.id) : `agency-${index}`;
    const pos = normalizedArc(rawId, 0.59, 0.87, 0.14, 0.05, 0, Math.PI);
    const risk = clamp(finite(action.risk_score));
    const id = sceneId("agency", rawId);
    addNode(nodes, counts, {
      id,
      objectId: rawId,
      kind: "agency",
      label: short(action.proposal ?? action.action_type, "Agency action"),
      summary: `${action.tier ?? "governed"} · ${action.status ?? "unknown"}`,
      ...pos,
      size: 9 + risk * 7,
      importance: 0.55 + risk * 0.3,
      state: action.status,
      route: "/organism",
      metrics: [metric("tier", action.tier ?? "—"), metric("status", action.status ?? "—"), metric("risk", risk.toFixed(2), risk > 0.6 ? "warning" : "neutral")],
      payload,
    });
    edges.push({ id: `agency:${id}:organism`, source: "organism:runtime", target: id, relation: "proposes", strength: 0.55 + risk * 0.3 });
  });

  snapshot.quarantine.forEach((item, index) => {
    const payload = record(item);
    const rawId = item.id ? String(item.id) : `quarantine-${index}`;
    const pos = normalizedArc(rawId, 0.12, 0.82, 0.07, 0.09, Math.PI, Math.PI);
    const id = sceneId("quarantine", rawId);
    addNode(nodes, counts, {
      id,
      objectId: rawId,
      kind: "quarantine",
      label: short(item.reason, "Quarantined item"),
      summary: `${item.item_type ?? "item"} · ${item.item_ref ?? "unknown"}`,
      ...pos,
      size: 11,
      importance: 0.85,
      route: "/organism",
      metrics: [metric("type", item.item_type ?? "—"), metric("reference", item.item_ref ?? "—"), metric("reason", item.reason ?? "—", "danger")],
      payload,
    });
  });

  const nodeByObjectId = new Map<string, string>();
  nodes.forEach((node) => {
    if (!nodeByObjectId.has(node.objectId)) nodeByObjectId.set(node.objectId, node.id);
  });
  snapshot.edges.forEach((graphEdge: ObservedGraphEdge, index) => {
    const sourceObject = String(graphEdge.source_node_id ?? graphEdge.source ?? "");
    const targetObject = String(graphEdge.target_node_id ?? graphEdge.target ?? "");
    const source = nodeByObjectId.get(sourceObject);
    const target = nodeByObjectId.get(targetObject);
    if (!source || !target || source === target) return;
    edges.push({
      id: `graph:${graphEdge.id ?? index}:${source}:${target}`,
      source,
      target,
      relation: String(graphEdge.relation ?? "related"),
      strength: clamp(finite(graphEdge.confidence ?? graphEdge.weight, 0.5), 0.15, 1),
    });
  });

  const chronology = [...nodes]
    .filter((node) => node.timestamp && Number.isFinite(Date.parse(node.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp as string) - Date.parse(a.timestamp as string));

  const recentSignalCount = snapshot.signals.filter((signal) => {
    const payload = record(signal);
    const stamp = timestampOf(payload);
    return Boolean(stamp && Date.now() - Date.parse(stamp) < 5 * 60 * 1000);
  }).length;
  const pressure =
    snapshot.contradictions.filter((item) => item.status !== "resolved_with_note").length +
    snapshot.curiosity.filter((item) => item.status === "open" || item.status === "in_progress").length +
    snapshot.approvals.filter((item) => item.state === "requested").length +
    snapshot.quarantine.length +
    finite(snapshot.runner?.inbox ?? snapshot.health?.heartbeat?.inbox, 0);

  return {
    nodes,
    edges,
    chronology,
    activity: clamp((recentSignalCount + pressure) / 6),
    workingMemorySize: Math.max(0, finite(snapshot.runner?.working_memory_size ?? snapshot.health?.heartbeat?.working_memory_size, 0)),
    memoryPressure: clamp(finite(snapshot.selfState?.memory_pressure, 0)),
    counts,
  };
}
