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

type Point = { x: number; y: number };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function timestamp(value: Record<string, unknown>): string | undefined {
  const candidate = value.updated_at ?? value.created_at ?? value.valid_from ?? value.known_at;
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

function hash01(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function arc(
  id: string,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  start = 0,
  span = TAU
): Point {
  const angle = start + hash01(`${id}:angle`) * span;
  const variance = 0.94 + hash01(`${id}:radius`) * 0.12;
  return {
    x: clamp(centerX + Math.cos(angle) * radiusX * variance, 0.035, 0.965),
    y: clamp(centerY + Math.sin(angle) * radiusY * variance, 0.055, 0.945),
  };
}

function metric(label: string, value: unknown, tone?: SceneMetric["tone"]): SceneMetric {
  return { label, value: String(value), tone };
}

function idFor(kind: SceneKind, objectId: string): string {
  return `${kind}:${objectId}`;
}

function initialCounts(): Record<SceneKind, number> {
  return {
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
}

export function buildCognitiveScene(snapshot: ObservatorySnapshot): CognitiveScene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const counts = initialCounts();
  const sceneByObject = new Map<string, string>();

  const addNode = (node: SceneNode) => {
    nodes.push(node);
    counts[node.kind] += 1;
    if (!sceneByObject.has(node.objectId)) sceneByObject.set(node.objectId, node.id);
  };

  const addEdge = (
    source: string | undefined,
    target: string | undefined,
    relation: string,
    strength = 0.5,
    tension = false
  ) => {
    if (!source || !target || source === target) return;
    edges.push({
      id: `${relation}:${source}:${target}:${edges.length}`,
      source,
      target,
      relation,
      strength: clamp(strength, 0.12, 1),
      tension,
    });
  };

  const heartbeat = snapshot.health?.heartbeat ?? snapshot.runner ?? {};
  const self = record(snapshot.selfState);
  const organismPayload: Record<string, unknown> = {
    ...record(snapshot.organism),
    ...self,
    health: snapshot.health,
    runner: snapshot.runner,
    persistence: snapshot.persistence,
  };
  const focus = text(self.current_focus_summary, snapshot.organism ? "Cognitive organism" : "Runtime state");
  addNode({
    id: "organism:runtime",
    objectId: "runtime",
    kind: "organism",
    label: focus,
    summary: snapshot.organism
      ? "Live organism state reported by Brain"
      : "Connected Brain runtime; no detailed organism state is exposed",
    x: 0.47,
    y: 0.5,
    size: 22 + Math.min(10, number(heartbeat.working_memory_size) * 1.5),
    importance: 1,
    state: snapshot.health?.status ?? "unknown",
    route: "/organism",
    metrics: [
      metric("beliefs", snapshot.health?.beliefs ?? snapshot.beliefs.length),
      metric("cycles", heartbeat.ticks ?? 0, "attention"),
      metric("working memory", heartbeat.working_memory_size ?? 0),
      metric("persistence", snapshot.health?.persistence ?? snapshot.persistence?.store ?? "unknown"),
    ],
    payload: organismPayload,
  });

  const sourceByName = new Map<string, string>();
  [...snapshot.sources].sort((a, b) => a.id.localeCompare(b.id)).forEach((source) => {
    const payload = record(source);
    const trust = clamp(number(source.trust_score, 0.5));
    const nodeId = idFor("source", source.id);
    sourceByName.set(source.name.toLowerCase(), nodeId);
    addNode({
      id: nodeId,
      objectId: source.id,
      kind: "source",
      label: source.name,
      summary: `${source.kind} source · ${source.status}`,
      ...arc(source.id, 0.105, 0.5, 0.055, 0.36, Math.PI / 2, Math.PI),
      size: 7 + trust * 5,
      importance: 0.35 + trust * 0.35,
      timestamp: timestamp(payload),
      state: source.status,
      route: "/sources",
      metrics: [metric("trust", trust.toFixed(2)), metric("status", source.status)],
      payload,
    });
  });

  [...snapshot.signals].sort((a, b) => a.id.localeCompare(b.id)).forEach((signal) => {
    const payload = record(signal);
    const metadata = record(signal.metadata);
    const attention = clamp(number(signal.attention_score));
    const urgency = clamp(number(signal.urgency));
    const nodeId = idFor("signal", signal.id);
    addNode({
      id: nodeId,
      objectId: signal.id,
      kind: "signal",
      label: text(metadata.claim ?? metadata.content, signal.source_id || "Signal"),
      summary: `Perception from ${signal.source_id}`,
      ...arc(signal.id, 0.25, 0.5, 0.135, 0.37, Math.PI / 2, Math.PI),
      size: 8 + attention * 12,
      importance: 0.45 + attention * 0.5,
      timestamp: timestamp(payload),
      route: "/perception",
      metrics: [
        metric("attention", attention.toFixed(2), "attention"),
        metric("novelty", number(signal.novelty).toFixed(2)),
        metric("urgency", urgency.toFixed(2), urgency > 0.65 ? "warning" : "neutral"),
        metric("source", signal.source_id),
      ],
      payload,
    });
    addEdge(sourceByName.get(signal.source_id.toLowerCase()), nodeId, "origin", Math.max(0.3, attention));
  });

  [...snapshot.beliefs].sort((a, b) => a.id.localeCompare(b.id)).forEach((belief) => {
    const payload = record(belief);
    const confidence = clamp(number(belief.confidence, 0.5));
    addNode({
      id: idFor("belief", belief.id),
      objectId: belief.id,
      kind: "belief",
      label: belief.statement,
      summary: `${belief.state} belief · version ${belief.version ?? 1}`,
      ...arc(belief.id, 0.47, 0.5, 0.18, 0.245),
      size: 9 + confidence * 13,
      importance: 0.55 + confidence * 0.4,
      timestamp: timestamp(payload),
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

  [...snapshot.contradictions].sort((a, b) => a.id.localeCompare(b.id)).forEach((item) => {
    const payload = record(item);
    const pressure = clamp(number(item.investigation_pressure, 0.6));
    const linkedBelief = item.belief_ids.map((objectId) => sceneByObject.get(objectId)).find(Boolean);
    const linkedNode = linkedBelief ? nodes.find((node) => node.id === linkedBelief) : undefined;
    const fallback = arc(item.id, 0.49, 0.5, 0.28, 0.31);
    const point = linkedNode
      ? {
          x: clamp(linkedNode.x + (hash01(`${item.id}:x`) - 0.5) * 0.13, 0.055, 0.945),
          y: clamp(linkedNode.y + (hash01(`${item.id}:y`) - 0.5) * 0.13, 0.065, 0.935),
        }
      : fallback;
    const nodeId = idFor("contradiction", item.id);
    addNode({
      id: nodeId,
      objectId: item.id,
      kind: "contradiction",
      label: "Contradiction",
      summary: `${item.belief_ids.length} belief relation${item.belief_ids.length === 1 ? "" : "s"} under tension`,
      ...point,
      size: 9 + pressure * 8,
      importance: 0.72 + pressure * 0.25,
      timestamp: timestamp(payload),
      state: item.status,
      route: "/contradictions",
      metrics: [
        metric("status", item.status, "danger"),
        metric("pressure", pressure.toFixed(2), "danger"),
        metric("supporting", item.supporting_evidence_ids.length),
        metric("contradicting", item.contradicting_evidence_ids.length),
      ],
      payload,
    });
    item.belief_ids.forEach((beliefId) => addEdge(nodeId, sceneByObject.get(beliefId), "contradicts", pressure, true));
  });

  [...snapshot.curiosity].sort((a, b) => a.id.localeCompare(b.id)).forEach((task) => {
    const payload = record(task);
    const priority = clamp(number(task.priority, 0.5));
    const nodeId = idFor("curiosity", task.id);
    addNode({
      id: nodeId,
      objectId: task.id,
      kind: "curiosity",
      label: task.title,
      summary: "Runtime curiosity task",
      ...arc(task.id, 0.51, 0.115, 0.3, 0.065, Math.PI, Math.PI),
      size: 7 + priority * 7,
      importance: 0.45 + priority * 0.45,
      timestamp: timestamp(payload),
      state: task.status,
      route: "/curiosity",
      metrics: [metric("priority", priority.toFixed(2), "warning"), metric("status", task.status), metric("action", task.suggested_action ?? "—")],
      payload,
    });
    addEdge(nodeId, sceneByObject.get(task.linked_object_id), "questions", priority);
  });

  snapshot.organismCuriosity.forEach((task, index) => {
    const payload = record(task);
    const rawId = text(payload.id, `organism-curiosity-${index}`);
    const priority = clamp(number(payload.expected_value ?? payload.priority, 0.5));
    const nodeId = idFor("curiosity", rawId);
    addNode({
      id: nodeId,
      objectId: rawId,
      kind: "curiosity",
      label: text(payload.question ?? payload.trigger_type, "Organism curiosity"),
      summary: "Organism curiosity",
      ...arc(rawId, 0.55, 0.11, 0.27, 0.06, Math.PI, Math.PI),
      size: 7 + priority * 7,
      importance: 0.45 + priority * 0.45,
      timestamp: timestamp(payload),
      state: typeof payload.status === "string" ? payload.status : undefined,
      route: "/organism",
      metrics: [
        metric("expected value", priority.toFixed(2), "warning"),
        metric("uncertainty", number(payload.uncertainty).toFixed(2)),
        metric("status", payload.status ?? "open"),
      ],
      payload,
    });
  });

  [...snapshot.predictions].sort((a, b) => a.id.localeCompare(b.id)).forEach((prediction) => {
    const payload = record(prediction);
    const confidence = clamp(number(payload.confidence ?? payload.forecast_probability, 0.5));
    const beliefId = typeof payload.belief_id === "string" ? payload.belief_id : undefined;
    const nodeId = idFor("prediction", prediction.id);
    addNode({
      id: nodeId,
      objectId: prediction.id,
      kind: "prediction",
      label: text(payload.statement ?? payload.metric, "Prediction"),
      summary: `${text(payload.status, "open")} prediction`,
      ...arc(prediction.id, 0.79, 0.49, 0.17, 0.33, -Math.PI / 2, Math.PI),
      size: 9 + confidence * 10,
      importance: 0.5 + confidence * 0.42,
      timestamp: timestamp(payload),
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
    addEdge(sceneByObject.get(beliefId ?? ""), nodeId, "forecasts", confidence);
  });

  [...snapshot.outcomes].sort((a, b) => a.id.localeCompare(b.id)).forEach((outcome) => {
    const payload = record(outcome);
    const accuracy = clamp(number(outcome.prediction_accuracy));
    const nodeId = idFor("outcome", outcome.id);
    addNode({
      id: nodeId,
      objectId: outcome.id,
      kind: "outcome",
      label: `Outcome · ${Math.round(accuracy * 100)}% accuracy`,
      summary: `Value created ${number(outcome.value_created).toFixed(2)}`,
      ...arc(outcome.id, 0.73, 0.81, 0.18, 0.11, 0, Math.PI),
      size: 8 + accuracy * 9,
      importance: 0.5 + accuracy * 0.38,
      timestamp: timestamp(payload),
      route: "/learning",
      metrics: [
        metric("accuracy", `${Math.round(accuracy * 100)}%`, accuracy > 0.7 ? "success" : "warning"),
        metric("value", number(outcome.value_created).toFixed(2)),
        metric("trust impact", number(outcome.trust_impact).toFixed(2)),
        metric("legal risk", number(outcome.legal_risk).toFixed(2)),
      ],
      payload,
    });
    addEdge(sceneByObject.get(outcome.prediction_id ?? ""), nodeId, "resolved by", Math.max(0.35, accuracy));
    addEdge(nodeId, "organism:runtime", "feeds learning", Math.max(0.35, accuracy));
  });

  [...snapshot.opportunities].sort((a, b) => a.id.localeCompare(b.id)).forEach((opportunity) => {
    const payload = record(opportunity);
    const expected = clamp(number(opportunity.expected_value, 0.5));
    const nodeId = idFor("opportunity", opportunity.id);
    addNode({
      id: nodeId,
      objectId: opportunity.id,
      kind: "opportunity",
      label: opportunity.title,
      summary: `${opportunity.status} opportunity`,
      ...arc(opportunity.id, 0.62, 0.7, 0.14, 0.14, 0, Math.PI),
      size: 8 + expected * 8,
      importance: 0.45 + expected * 0.4,
      timestamp: timestamp(payload),
      state: opportunity.status,
      route: "/opportunities",
      metrics: [metric("expected value", opportunity.expected_value), metric("risk", opportunity.risk_score), metric("status", opportunity.status)],
      payload,
    });
    opportunity.belief_ids.forEach((beliefId) => addEdge(sceneByObject.get(beliefId), nodeId, "supports", expected));
  });

  [...snapshot.approvals].sort((a, b) => a.id.localeCompare(b.id)).forEach((approval) => {
    const payload = record(approval);
    const nodeId = idFor("approval", approval.id);
    addNode({
      id: nodeId,
      objectId: approval.id,
      kind: "approval",
      label: `Approval · ${approval.state}`,
      summary: approval.external_consequence ? "External consequence requires operator authority" : "Operator approval gate",
      ...arc(approval.id, 0.45, 0.885, 0.16, 0.04, 0, Math.PI),
      size: approval.state === "requested" ? 13 : 9,
      importance: approval.state === "requested" ? 0.92 : 0.5,
      timestamp: timestamp(payload),
      state: approval.state,
      route: "/approvals",
      metrics: [
        metric("state", approval.state, approval.state === "requested" ? "warning" : "neutral"),
        metric("approver", approval.required_approver),
        metric("external", approval.external_consequence),
      ],
      payload,
    });
    addEdge("organism:runtime", nodeId, "governed action", approval.state === "requested" ? 0.9 : 0.4);
  });

  snapshot.agencyActions.forEach((action, index) => {
    const payload = record(action);
    const rawId = text(payload.id, `agency-${index}`);
    const risk = clamp(number(action.risk_score));
    const nodeId = idFor("agency", rawId);
    addNode({
      id: nodeId,
      objectId: rawId,
      kind: "agency",
      label: text(action.proposal ?? action.action_type, "Agency action"),
      summary: `${action.tier ?? "governed"} · ${action.status ?? "unknown"}`,
      ...arc(rawId, 0.59, 0.875, 0.14, 0.045, 0, Math.PI),
      size: 9 + risk * 7,
      importance: 0.55 + risk * 0.3,
      state: action.status,
      route: "/organism",
      metrics: [
        metric("tier", action.tier ?? "—"),
        metric("status", action.status ?? "—"),
        metric("risk", risk.toFixed(2), risk > 0.6 ? "warning" : "neutral"),
      ],
      payload,
    });
    addEdge("organism:runtime", nodeId, "proposes", 0.55 + risk * 0.3);
  });

  snapshot.quarantine.forEach((item, index) => {
    const payload = record(item);
    const rawId = text(payload.id, `quarantine-${index}`);
    addNode({
      id: idFor("quarantine", rawId),
      objectId: rawId,
      kind: "quarantine",
      label: text(item.reason, "Quarantined item"),
      summary: `${item.item_type ?? "item"} · ${item.item_ref ?? "unknown"}`,
      ...arc(rawId, 0.12, 0.82, 0.07, 0.09, Math.PI, Math.PI),
      size: 11,
      importance: 0.85,
      route: "/organism",
      metrics: [metric("type", item.item_type ?? "—"), metric("reference", item.item_ref ?? "—"), metric("reason", item.reason ?? "—", "danger")],
      payload,
    });
  });

  snapshot.edges.forEach((graphEdge: ObservedGraphEdge, index) => {
    const sourceObject = String(graphEdge.source_node_id ?? graphEdge.source ?? "");
    const targetObject = String(graphEdge.target_node_id ?? graphEdge.target ?? "");
    addEdge(
      sceneByObject.get(sourceObject),
      sceneByObject.get(targetObject),
      String(graphEdge.relation ?? "related"),
      number(graphEdge.confidence ?? graphEdge.weight, 0.5)
    );
    if (edges.length) edges[edges.length - 1].id = `graph:${graphEdge.id ?? index}:${sourceObject}:${targetObject}`;
  });

  const chronology = nodes
    .filter((node) => node.timestamp && Number.isFinite(Date.parse(node.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp as string) - Date.parse(a.timestamp as string));

  const recentSignals = snapshot.signals.filter((signal) => {
    const stamp = timestamp(record(signal));
    return Boolean(stamp && Number.isFinite(Date.parse(stamp)) && Date.now() - Date.parse(stamp) < 5 * 60 * 1000);
  }).length;
  const pressure =
    snapshot.contradictions.filter((item) => item.status !== "resolved_with_note").length +
    snapshot.curiosity.filter((item) => item.status === "open" || item.status === "in_progress").length +
    snapshot.approvals.filter((item) => item.state === "requested").length +
    snapshot.quarantine.length +
    number(snapshot.runner?.inbox ?? snapshot.health?.heartbeat?.inbox);

  return {
    nodes,
    edges,
    chronology,
    activity: clamp((recentSignals + pressure) / 6),
    workingMemorySize: Math.max(0, number(snapshot.runner?.working_memory_size ?? snapshot.health?.heartbeat?.working_memory_size)),
    memoryPressure: clamp(number(self.memory_pressure)),
    counts,
  };
}
