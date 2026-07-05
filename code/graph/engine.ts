/**
 * PitchIntel Graph Engine
 *
 * Builds tactical graphs from player positions and runs
 * MinCut, PPR, and spectral analysis on them.
 *
 * Graph types:
 *   1. Passing graph — edge weight = probability of successful pass
 *   2. Defensive coverage graph — edge weight = overlapping coverage
 *   3. Pressure graph — closing speed toward ball holder
 *
 * All algorithms optimized for n=22 (microsecond-scale).
 */

import type { Frame, PlayerFrame, Vec2, GraphEdge, PlayerGraph, MinCutResult } from '../types.js';

// ─── Geometry Helpers ────────────────────────────────────────

function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function angleBetween(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Check if any opponent is close to the line between passer and receiver */
function passIsBlocked(
  from: Vec2, to: Vec2, opponents: PlayerFrame[], blockRadius: number = 2.0
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.01) return false;

  for (const opp of opponents) {
    // Project opponent onto the pass line
    const t = Math.max(0, Math.min(1,
      ((opp.pos.x - from.x) * dx + (opp.pos.y - from.y) * dy) / lenSq
    ));
    const projX = from.x + t * dx;
    const projY = from.y + t * dy;
    const d = Math.sqrt((opp.pos.x - projX) ** 2 + (opp.pos.y - projY) ** 2);
    if (d < blockRadius) return true;
  }
  return false;
}

// ─── Pass Probability Model ──────────────────────────────────

/**
 * Estimate probability of a successful pass between two players.
 *
 * Factors:
 *   - Distance (longer = harder)
 *   - Opponent interception (anyone in the lane?)
 *   - Receiver openness (nearest opponent distance)
 *   - Pass direction relative to goal (forward passes are riskier)
 */
function passProb(
  passer: PlayerFrame,
  receiver: PlayerFrame,
  opponents: PlayerFrame[],
  goalDirection: number  // +1 = attacking right, -1 = attacking left
): number {
  const d = dist(passer.pos, receiver.pos);

  // Distance decay: sharp falloff past 25m
  const distFactor = Math.exp(-d / 25);
  if (d > 50) return 0; // no 50m+ passes in this model

  // Blocking: is there an opponent in the passing lane?
  const blocked = passIsBlocked(passer.pos, receiver.pos, opponents, 2.5);
  const blockFactor = blocked ? 0.15 : 1.0;

  // Receiver openness: how far is nearest opponent from receiver?
  let minOppDist = Infinity;
  for (const opp of opponents) {
    minOppDist = Math.min(minOppDist, dist(receiver.pos, opp.pos));
  }
  const openFactor = Math.min(1, minOppDist / 5); // fully open at 5m+

  // Direction: forward passes slightly riskier
  const angle = angleBetween(passer.pos, receiver.pos);
  const forwardness = Math.cos(angle) * goalDirection;
  const dirFactor = forwardness > 0 ? 0.85 : 1.0; // small penalty for forward

  return Math.min(0.99, distFactor * blockFactor * openFactor * dirFactor);
}

// ─── Graph Construction ──────────────────────────────────────

export function buildPassingGraph(
  frame: Frame,
  team: 'home' | 'away'
): PlayerGraph {
  const players = frame[team];
  const opponents = team === 'home' ? frame.away : frame.home;
  const goalDir = team === 'home' ? 1 : -1;

  const nodes = players.map(p => p.id);
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, Map<string, number>>();

  for (const p of players) adjacency.set(p.id, new Map());

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const prob = passProb(players[i], players[j], opponents, goalDir);
      if (prob > 0.01) {
        edges.push({ from: players[i].id, to: players[j].id, weight: prob });
        adjacency.get(players[i].id)!.set(players[j].id, prob);
        adjacency.get(players[j].id)!.set(players[i].id, prob);
      }
    }
  }

  return { nodes, edges, adjacency };
}

/**
 * Build defensive coverage graph.
 * Nodes = all outfield players on the team. Edge weight = mutual coverage strength.
 *
 * The key insight: a defensive LINE is only as strong as its weakest link.
 * Stoer-Wagner MinCut on this graph finds exactly that weakest link.
 *
 * Edge weight model:
 *   - Base: inverse-square of distance (coverage decays with distance)
 *   - Bonus: players at similar x-coordinates (on the same "line") get extra weight
 *   - All pairs connected (weight decays to near-zero for far-apart players)
 *     so the graph is never disconnected — MinCut is always meaningful.
 */
export function buildDefensiveGraph(
  frame: Frame,
  team: 'home' | 'away'
): PlayerGraph {
  const players = frame[team].filter(p => p.jersey !== 1); // exclude GK
  const nodes = players.map(p => p.id);
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, Map<string, number>>();

  for (const p of players) adjacency.set(p.id, new Map());

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const d = dist(players[i].pos, players[j].pos);
      const pi = players[i], pj = players[j];

      // Distance-based coverage: inverse-square decay
      // Strong within 15m, moderate to 30m, weak but nonzero beyond
      const distWeight = 1 / (1 + (d / 12) ** 2);

      // Line cohesion bonus: players at similar x get extra weight
      // (defenders on the same line provide mutual coverage)
      const xDiff = Math.abs(pi.pos.x - pj.pos.x);
      const lineBonus = Math.exp(-xDiff / 8); // strong bonus when within 8m on x-axis

      // Lateral coverage: penalize large y-gaps (the actual "corridor" vulnerability)
      const yGap = Math.abs(pi.pos.y - pj.pos.y);
      const lateralPenalty = yGap > 25 ? 0.3 : 1.0; // big gap = weak link

      const weight = distWeight * (0.5 + 0.5 * lineBonus) * lateralPenalty;

      if (weight > 0.001) { // skip negligible edges for performance
        edges.push({ from: pi.id, to: pj.id, weight });
        adjacency.get(pi.id)!.set(pj.id, weight);
        adjacency.get(pj.id)!.set(pi.id, weight);
      }
    }
  }

  return { nodes, edges, adjacency };
}

// ─── Stoer-Wagner MinCut ─────────────────────────────────────

export function stoerWagnerMinCut(graph: PlayerGraph): MinCutResult {
  const nodeIds = [...graph.nodes];
  if (nodeIds.length < 2) {
    return { value: Infinity, corridor: [], partitionGoalSide: nodeIds, partitionFieldSide: [], cutEdges: [] };
  }

  // Mutable adjacency
  const groups = new Map<string, Set<string>>();
  for (const id of nodeIds) groups.set(id, new Set([id]));

  const adj = new Map<string, Map<string, number>>();
  for (const id of nodeIds) adj.set(id, new Map());
  for (const e of graph.edges) {
    adj.get(e.from)!.set(e.to, (adj.get(e.from)!.get(e.to) ?? 0) + e.weight);
    adj.get(e.to)!.set(e.from, (adj.get(e.to)!.get(e.from) ?? 0) + e.weight);
  }

  let bestCutWeight = Infinity;
  let bestPartA = new Set<string>();
  let bestPartB = new Set<string>();
  const active = new Set(nodeIds);

  while (active.size > 1) {
    // Maximum adjacency ordering
    const nodes = [...active];
    const inA = new Set<string>();
    const w = new Map<string, number>();
    for (const n of nodes) w.set(n, 0);

    let s = '', t = '';
    for (let i = 0; i < nodes.length; i++) {
      let maxW = -Infinity;
      let maxNode = '';
      for (const n of nodes) {
        if (!inA.has(n) && (w.get(n)! > maxW)) {
          maxW = w.get(n)!;
          maxNode = n;
        }
      }
      s = t;
      t = maxNode;
      inA.add(maxNode);

      const neighbors = adj.get(maxNode)!;
      for (const [nId, weight] of neighbors) {
        if (!inA.has(nId) && active.has(nId)) {
          w.set(nId, (w.get(nId) ?? 0) + weight);
        }
      }
    }

    const cutOfPhase = w.get(t) ?? 0;
    if (cutOfPhase < bestCutWeight) {
      bestCutWeight = cutOfPhase;
      bestPartA = new Set(groups.get(t)!);
      bestPartB = new Set<string>();
      for (const nId of active) {
        if (nId !== t) for (const m of groups.get(nId)!) bestPartB.add(m);
      }
    }

    // Merge t into s
    const tNeighbors = adj.get(t)!;
    const sNeighbors = adj.get(s)!;
    for (const [nId, weight] of tNeighbors) {
      if (nId === s || !active.has(nId)) continue;
      sNeighbors.set(nId, (sNeighbors.get(nId) ?? 0) + weight);
      adj.get(nId)!.set(s, (adj.get(nId)!.get(s) ?? 0) + weight);
      adj.get(nId)!.delete(t);
    }
    sNeighbors.delete(t);
    for (const m of groups.get(t)!) groups.get(s)!.add(m);
    groups.delete(t);
    active.delete(t);
    adj.delete(t);
  }

  // Find cut edges
  const cutEdges: GraphEdge[] = [];
  for (const e of graph.edges) {
    if ((bestPartA.has(e.from) && bestPartB.has(e.to)) ||
        (bestPartA.has(e.to) && bestPartB.has(e.from))) {
      cutEdges.push(e);
    }
  }

  return {
    value: bestCutWeight,
    corridor: [], // filled in by caller with spatial info
    partitionGoalSide: [...bestPartA],
    partitionFieldSide: [...bestPartB],
    cutEdges,
  };
}

// ─── Personalized PageRank ───────────────────────────────────

/**
 * Forward-push PPR from a source node.
 * Returns importance scores for all nodes.
 * At n=11 this runs in microseconds.
 */
export function personalizedPageRank(
  graph: PlayerGraph,
  sourceId: string,
  alpha: number = 0.15,    // damping
  maxIter: number = 50,
  tol: number = 1e-6
): Map<string, number> {
  const scores = new Map<string, number>();
  const residual = new Map<string, number>();

  for (const n of graph.nodes) {
    scores.set(n, 0);
    residual.set(n, 0);
  }
  residual.set(sourceId, 1);

  for (let iter = 0; iter < maxIter; iter++) {
    let maxChange = 0;

    for (const node of graph.nodes) {
      const r = residual.get(node)!;
      if (r < tol) continue;

      // Push
      scores.set(node, scores.get(node)! + alpha * r);
      const neighbors = graph.adjacency.get(node)!;
      const totalWeight = [...neighbors.values()].reduce((s, v) => s + v, 0);

      if (totalWeight > 0) {
        for (const [nId, weight] of neighbors) {
          const push = (1 - alpha) * r * (weight / totalWeight);
          residual.set(nId, residual.get(nId)! + push);
          maxChange = Math.max(maxChange, Math.abs(push));
        }
      }
      residual.set(node, 0);
    }

    if (maxChange < tol) break;
  }

  return scores;
}

// ─── Spectral Formation Analysis ─────────────────────────────

/**
 * Compute eigenvalues of the team's position covariance matrix.
 * Changes in eigenvalues indicate formation shape changes.
 */
export function formationEigenvalues(players: PlayerFrame[]): number[] {
  const n = players.length;
  // Compute centroid
  let cx = 0, cy = 0;
  for (const p of players) { cx += p.pos.x; cy += p.pos.y; }
  cx /= n; cy /= n;

  // 2x2 covariance matrix
  let cxx = 0, cxy = 0, cyy = 0;
  for (const p of players) {
    const dx = p.pos.x - cx;
    const dy = p.pos.y - cy;
    cxx += dx * dx;
    cxy += dx * dy;
    cyy += dy * dy;
  }
  cxx /= n; cxy /= n; cyy /= n;

  // Eigenvalues of 2x2: λ = (trace ± sqrt(trace² - 4det)) / 2
  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.max(0, trace * trace - 4 * det);
  const sqrtDisc = Math.sqrt(disc);

  return [(trace + sqrtDisc) / 2, (trace - sqrtDisc) / 2].sort((a, b) => b - a);
}

/**
 * Detect formation from player positions.
 * Groups players by x-coordinate bands (defense, midfield, attack).
 */
export function detectFormation(players: PlayerFrame[], attackDirection: number): string {
  // Sort outfield players by x position (in attack direction)
  const outfield = players.filter(p => p.jersey !== 1);
  const sorted = [...outfield].sort((a, b) =>
    (a.pos.x * attackDirection) - (b.pos.x * attackDirection)
  );

  if (sorted.length !== 10) return 'unknown';

  // K-means-ish grouping into lines by x coordinate
  const xs = sorted.map(p => p.pos.x * attackDirection);
  const gaps: Array<{ idx: number; gap: number }> = [];
  for (let i = 0; i < xs.length - 1; i++) {
    gaps.push({ idx: i, gap: xs[i + 1] - xs[i] });
  }
  gaps.sort((a, b) => b.gap - a.gap);

  // Find 2-3 biggest gaps to split into lines
  const splits = gaps.slice(0, 2).map(g => g.idx).sort((a, b) => a - b);

  if (splits.length >= 2) {
    const def = splits[0] + 1;
    const mid = splits[1] - splits[0];
    const att = 10 - splits[1] - 1;
    return `${def}-${mid}-${att}`;
  }

  return 'unknown';
}

// ─── Passing Lane Count ──────────────────────────────────────

/** Count how many "safe" passing options the ball holder has */
export function countSafePassingLanes(
  frame: Frame,
  team: 'home' | 'away',
  minProb: number = 0.3
): number {
  const players = frame[team];
  const opponents = team === 'home' ? frame.away : frame.home;
  const goalDir = team === 'home' ? 1 : -1;

  const holder = players.find(p => p.id === frame.ball.holder);
  if (!holder) return 0;

  let lanes = 0;
  for (const receiver of players) {
    if (receiver.id === holder.id) continue;
    if (passProb(holder, receiver, opponents, goalDir) >= minProb) lanes++;
  }
  return lanes;
}
