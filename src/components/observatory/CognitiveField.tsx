"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { CognitiveScene, SceneEdge, SceneKind, SceneNode } from "@/types/observatory";

const COLORS: Record<SceneKind, string> = {
  organism: "#f4f7fb",
  signal: "#3f8cff",
  belief: "#9b7bff",
  prediction: "#55d6ff",
  outcome: "#45d99a",
  contradiction: "#ff675d",
  curiosity: "#f2b95e",
  source: "#92a4b8",
  approval: "#f0d27a",
  opportunity: "#72dfc8",
  agency: "#b7c7ff",
  quarantine: "#ff755f",
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (index / sides) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function edgePath(ctx: CanvasRenderingContext2D, source: { x: number; y: number }, target: { x: number; y: number }, tension: boolean) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const bend = tension ? 0.18 : 0.08;
  const cx = (source.x + target.x) / 2 - dy * bend;
  const cy = (source.y + target.y) / 2 + dx * bend;
  ctx.beginPath();
  ctx.moveTo(source.x, source.y);
  ctx.quadraticCurveTo(cx, cy, target.x, target.y);
}

function nodePulse(node: SceneNode): number {
  if (node.kind !== "signal" && node.kind !== "contradiction") return 0;
  const metric = node.metrics.find((item) => item.label === (node.kind === "signal" ? "urgency" : "pressure"));
  return Math.max(0, Math.min(1, Number(metric?.value ?? 0)));
}

export function CognitiveField({
  scene,
  selectedId,
  onSelect,
}: {
  scene: CognitiveScene;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeMap = useMemo(() => new Map(scene.nodes.map((node) => [node.id, node])), [scene.nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const animate = !reduced && scene.activity > 0;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const point = (node: SceneNode) => ({ x: node.x * width, y: node.y * height });

    const drawZones = () => {
      const center = { x: width * 0.47, y: height * 0.5 };
      ctx.save();
      ctx.lineWidth = 1;
      [0.13, 0.205, 0.29].forEach((radiusFactor, index) => {
        const radius = Math.min(width, height) * radiusFactor;
        ctx.strokeStyle = `rgba(137, 156, 180, ${0.09 - index * 0.015})`;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, radius * 1.18, radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      const memoryAlpha = 0.035 + scene.memoryPressure * 0.08;
      const wmAlpha = 0.035 + Math.min(0.1, scene.workingMemorySize * 0.012);
      ctx.strokeStyle = `rgba(155, 123, 255, ${memoryAlpha})`;
      ctx.lineWidth = 6 + scene.memoryPressure * 12;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, Math.min(width, height) * 0.2, Math.min(width, height) * 0.155, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(244, 247, 251, ${wmAlpha})`;
      ctx.lineWidth = 2 + Math.min(10, scene.workingMemorySize);
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, Math.min(width, height) * 0.105, Math.min(width, height) * 0.082, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = `${isMobile ? 9 : 10}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillStyle = "rgba(160, 177, 198, .48)";
      ctx.textBaseline = "middle";
      const labels = isMobile
        ? [["PERCEPTION", 0.04, 0.5], ["FUTURE", 0.83, 0.5], ["MEMORY", 0.43, 0.71]]
        : [
            ["SOURCE PERIMETER", 0.035, 0.5],
            ["PERCEPTION RIM", 0.17, 0.22],
            ["CURIOSITY FRONTIER", 0.42, 0.055],
            ["BELIEF LATTICE", 0.405, 0.28],
            ["PREDICTION HORIZON", 0.79, 0.17],
            ["OUTCOME RETURN", 0.75, 0.91],
            ["AGENCY GATE", 0.48, 0.955],
          ];
      labels.forEach(([label, x, y]) => ctx.fillText(String(label), Number(x) * width, Number(y) * height));
      ctx.restore();
    };

    const drawEdge = (edge: SceneEdge, time: number) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) return;
      const source = point(sourceNode);
      const target = point(targetNode);
      ctx.save();
      ctx.lineWidth = edge.tension ? 1.4 + edge.strength : 0.55 + edge.strength * 1.05;
      ctx.strokeStyle = edge.tension
        ? `rgba(255, 103, 93, ${0.24 + edge.strength * 0.4})`
        : `rgba(132, 158, 190, ${0.08 + edge.strength * 0.22})`;
      if (edge.tension) {
        ctx.setLineDash([5, 6]);
        ctx.lineDashOffset = animate ? -(time / 90) % 22 : 0;
      }
      edgePath(ctx, source, target, Boolean(edge.tension));
      ctx.stroke();
      ctx.restore();
    };

    const drawNode = (node: SceneNode, time: number) => {
      const { x, y } = point(node);
      const color = COLORS[node.kind];
      const pulse = nodePulse(node);
      const phase = pulse > 0 && animate ? (Math.sin(time / (620 - pulse * 300)) + 1) / 2 : 0;
      const radius = node.size + phase * pulse * 4;
      const selected = node.id === selectedId;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (node.importance > 0.58 || selected) {
        const haloRadius = radius * (2.1 + node.importance * 0.75);
        const gradient = ctx.createRadialGradient(x, y, radius * 0.2, x, y, haloRadius);
        gradient.addColorStop(0, `${color}${selected ? "55" : "2f"}`);
        gradient.addColorStop(1, `${color}00`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.fillStyle = `${color}${selected ? "38" : "18"}`;
      ctx.lineWidth = selected ? 2.2 : 1.15;
      ctx.shadowColor = selected ? color : "transparent";
      ctx.shadowBlur = selected ? 16 : 0;

      if (node.kind === "belief") {
        drawPolygon(ctx, x, y, radius, 6);
      } else if (node.kind === "prediction") {
        drawPolygon(ctx, x, y, radius, 4, 0);
      } else if (node.kind === "contradiction" || node.kind === "quarantine") {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.55, y - radius * 0.55);
        ctx.lineTo(x + radius * 0.55, y + radius * 0.55);
        ctx.moveTo(x + radius * 0.55, y - radius * 0.55);
        ctx.lineTo(x - radius * 0.55, y + radius * 0.55);
        ctx.stroke();
        ctx.restore();
        return;
      } else if (node.kind === "source") {
        roundedRect(ctx, x - radius, y - radius, radius * 2, radius * 2, 3);
      } else if (node.kind === "curiosity") {
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI * 0.2, Math.PI * 1.45);
      } else if (node.kind === "organism") {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.53, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
      } else {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const drawLabels = () => {
      if (isMobile) return;
      ctx.save();
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textBaseline = "top";
      scene.nodes.forEach((node) => {
        if (node.importance < 0.72 && node.id !== selectedId) return;
        const { x, y } = point(node);
        const max = 32;
        const label = node.label.length > max ? `${node.label.slice(0, max - 1)}…` : node.label;
        ctx.fillStyle = node.id === selectedId ? "rgba(245,248,252,.95)" : "rgba(196,209,224,.65)";
        ctx.fillText(label, x + node.size + 7, y - 5);
      });
      ctx.restore();
    };

    const draw = (time = 0) => {
      ctx.clearRect(0, 0, width, height);
      const gradient = ctx.createRadialGradient(width * 0.47, height * 0.5, 0, width * 0.47, height * 0.5, Math.max(width, height) * 0.7);
      gradient.addColorStop(0, "rgba(24, 29, 41, .72)");
      gradient.addColorStop(0.45, "rgba(10, 14, 21, .35)");
      gradient.addColorStop(1, "rgba(4, 7, 11, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawZones();
      scene.edges.forEach((edge) => drawEdge(edge, time));
      scene.nodes.forEach((node) => drawNode(node, time));
      drawLabels();
      if (animate) frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const observer = new ResizeObserver(() => {
      resize();
      if (!animate) draw();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [animateKey(scene), nodeMap, scene, selectedId]);

  return (
    <div className="cognitive-field" ref={containerRef}>
      <canvas ref={canvasRef} className="cognitive-field__canvas" aria-hidden="true" />
      <div className="cognitive-field__targets" aria-label="Cognitive field objects">
        {scene.nodes.map((node) => {
          const hitSize = Math.max(44, node.size * 2 + 20);
          const style = {
            left: `${node.x * 100}%`,
            top: `${node.y * 100}%`,
            width: `${hitSize}px`,
            height: `${hitSize}px`,
            "--node-color": COLORS[node.kind],
          } as CSSProperties;
          return (
            <button
              type="button"
              key={node.id}
              className={`cognitive-field__target ${node.id === selectedId ? "is-selected" : ""}`}
              style={style}
              onClick={() => onSelect(node.id)}
              aria-pressed={node.id === selectedId}
              aria-label={`${node.kind}: ${node.label}`}
              title={`${node.kind}: ${node.label}`}
            >
              <span className="sr-only">{node.summary}</span>
            </button>
          );
        })}
      </div>
      {scene.nodes.length <= 1 && (
        <div className="cognitive-field__dormant" role="status">
          <span>FIELD QUIET</span>
          <strong>Brain is connected, but no cognitive objects are currently exposed by the live read models.</strong>
        </div>
      )}
    </div>
  );
}

function animateKey(scene: CognitiveScene) {
  return `${scene.activity}:${scene.nodes.length}:${scene.edges.length}`;
}
