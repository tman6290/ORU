import { useMemo, useRef } from "react";
import { useFrame } from "./frame-clock";
import { motion } from "./motion";

// The mind (DESIGN.md; Tofa's pick (a)): a constellation of nodes arcing above
// the orb. What it means: ORU's reasoning. Paths light up while he thinks, a
// burst runs on each tool call, and (Phase 9) a path flashes when he recalls a
// memory. At rest it is a faint, slowly twinkling net.

const W = 400;
const H = 105; // flat arch: keeps the stage short so the orb can be big
const NODE_COUNT = 30;

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

interface Graph {
  nodes: { x: number; y: number }[];
  edges: [number, number][];
  adj: number[][];
}

function buildGraph(): Graph {
  const rand = rng(7);
  // Nodes scattered inside an arch: an upper half-ellipse band.
  const nodes: { x: number; y: number }[] = [];
  while (nodes.length < NODE_COUNT) {
    const a = Math.PI * (0.06 + rand() * 0.88);
    const r = 0.62 + rand() * 0.38;
    const x = W / 2 - Math.cos(a) * (W / 2 - 8) * r;
    const y = H - Math.sin(a) * (H - 8) * r;
    if (nodes.every((n) => Math.hypot(n.x - x, n.y - y) > 22)) nodes.push({ x, y });
  }
  // Connect each node to its 2–3 nearest neighbours.
  const key = new Set<string>();
  const edges: [number, number][] = [];
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2 + (i % 2));
    for (const { j } of near) {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!key.has(k)) {
        key.add(k);
        edges.push([Math.min(i, j), Math.max(i, j)]);
      }
    }
  });
  const adj = nodes.map(() => [] as number[]);
  edges.forEach(([a, b], e) => {
    adj[a].push(e);
    adj[b].push(e);
  });
  return { nodes, edges, adj };
}

/** A pulse walking edge to edge through the graph. */
interface Pulse {
  node: number;
  edge: number;
  /** 0..1 along the current edge */
  t: number;
  hops: number;
}

export function MindLattice({ width }: { width: number }) {
  const graph = useMemo(buildGraph, []);
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const heat = useRef({ e: graph.edges.map(() => 0), n: graph.nodes.map(() => 0) });
  const pulses = useRef<Pulse[]>([]);
  const spawnAcc = useRef(0);
  const lastTick = useRef(0);
  const rand = useMemo(() => rng(99), []);

  const spawn = () => {
    const node = Math.floor(rand() * graph.nodes.length);
    const opts = graph.adj[node];
    if (!opts.length) return;
    pulses.current.push({ node, edge: opts[Math.floor(rand() * opts.length)], t: 0, hops: 0 });
  };

  useFrame((t, dt) => {
    const think = motion.w.thinking;
    // Spawn rate: several paths per second while thinking, rare at rest.
    spawnAcc.current += dt * (0.15 + think * 5 + motion.w.speaking * 0.8);
    while (spawnAcc.current >= 1) {
      spawnAcc.current -= 1;
      spawn();
    }
    // Tool call: a burst of three pulses.
    if (motion.toolTick > 0.95 && t - lastTick.current > 0.2) {
      lastTick.current = t;
      spawn();
      spawn();
      spawn();
    }

    const h = heat.current;
    const cool = Math.exp(-dt / 0.45);
    for (let i = 0; i < h.e.length; i++) h.e[i] *= cool;
    for (let i = 0; i < h.n.length; i++) h.n[i] *= cool;

    const speed = 2.2 + think * 2;
    pulses.current = pulses.current.filter((p) => {
      p.t += dt * speed;
      h.e[p.edge] = 1;
      if (p.t < 1) return true;
      const [a, b] = graph.edges[p.edge];
      const next = p.node === a ? b : a;
      h.n[next] = 1;
      p.hops += 1;
      if (p.hops > 5) return false;
      const opts = graph.adj[next].filter((e) => e !== p.edge);
      if (!opts.length) return false;
      p.node = next;
      p.edge = opts[Math.floor(rand() * opts.length)];
      p.t = 0;
      return true;
    });

    const base = 0.1 + motion.energy * 0.12;
    graph.edges.forEach((_, i) => {
      edgeRefs.current[i]?.setAttribute("opacity", (base + h.e[i] * 0.8).toFixed(3));
    });
    graph.nodes.forEach((_, i) => {
      const twinkle = 0.12 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1));
      nodeRefs.current[i]?.setAttribute("opacity", (0.3 + twinkle + h.n[i] * 0.7).toFixed(3));
    });
  });

  return (
    <svg
      data-oru="lattice"
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={(width * H) / W}
      className="pointer-events-none overflow-visible"
      style={{ filter: "drop-shadow(0 0 3px var(--oru-glow))" }}
    >
      {graph.edges.map(([a, b], i) => (
        <line
          key={i}
          ref={(el) => {
            edgeRefs.current[i] = el;
          }}
          x1={graph.nodes[a].x}
          y1={graph.nodes[a].y}
          x2={graph.nodes[b].x}
          y2={graph.nodes[b].y}
          stroke="var(--oru-primary)"
          strokeWidth={0.7}
          opacity={0.1}
        />
      ))}
      {graph.nodes.map((n, i) => (
        <circle
          key={i}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          cx={n.x}
          cy={n.y}
          r={i % 4 === 0 ? 2.4 : 1.6}
          fill="var(--oru-primary)"
          opacity={0.4}
        />
      ))}
    </svg>
  );
}
