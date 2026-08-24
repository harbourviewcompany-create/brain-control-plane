import type {
  ApprovalRequest,
  Belief,
  Contradiction,
  CuriosityTask,
  HealthResponse,
  Opportunity,
  OrganismAgencyAction,
  OrganismCockpit,
  OrganismCuriosityTask,
  OrganismPersistenceStatus,
  OrganismQuarantineItem,
  OrganismSelfState,
  Outcome,
  Prediction,
  Signal,
  Source,
} from "@/types/brain";

export type SceneKind =
  | "organism"
  | "signal"
  | "belief"
  | "prediction"
  | "outcome"
  | "contradiction"
  | "curiosity"
  | "source"
  | "approval"
  | "opportunity"
  | "agency"
  | "quarantine";

export interface RunnerStatus {
  ticks?: number;
  total_processed?: number;
  inbox?: number;
  working_memory_size?: number;
  [key: string]: unknown;
}

export interface ObservedGraphEdge {
  id?: string;
  source?: string;
  target?: string;
  source_node_id?: string;
  target_node_id?: string;
  relation?: string;
  weight?: number;
  confidence?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface ObservatorySnapshot {
  capturedAt: string;
  health: HealthResponse | null;
  runner: RunnerStatus | null;
  signals: Signal[];
  beliefs: Belief[];
  predictions: Prediction[];
  edges: ObservedGraphEdge[];
  contradictions: Contradiction[];
  curiosity: CuriosityTask[];
  sources: Source[];
  approvals: ApprovalRequest[];
  opportunities: Opportunity[];
  outcomes: Outcome[];
  organism: OrganismCockpit | null;
  selfState: OrganismSelfState | null;
  organismCuriosity: OrganismCuriosityTask[];
  agencyActions: OrganismAgencyAction[];
  quarantine: OrganismQuarantineItem[];
  persistence: OrganismPersistenceStatus | null;
  errors: string[];
  signature: string;
}

export interface SceneMetric {
  label: string;
  value: string;
  tone?: "neutral" | "attention" | "future" | "warning" | "danger" | "success";
}

export interface SceneNode {
  id: string;
  objectId: string;
  kind: SceneKind;
  label: string;
  summary: string;
  x: number;
  y: number;
  size: number;
  importance: number;
  timestamp?: string;
  state?: string;
  route?: string;
  metrics: SceneMetric[];
  payload: Record<string, unknown>;
}

export interface SceneEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  strength: number;
  tension?: boolean;
}

export interface CognitiveScene {
  nodes: SceneNode[];
  edges: SceneEdge[];
  chronology: SceneNode[];
  activity: number;
  workingMemorySize: number;
  memoryPressure: number;
  counts: Record<SceneKind, number>;
}
