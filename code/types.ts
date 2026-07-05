/**
 * PitchIntel — Core Types
 *
 * Data structures for real-time football tactical analysis.
 * Coordinate system: meters, origin at center circle.
 *   x: -52.5 to 52.5 (length, left goal to right goal)
 *   y: -34 to 34 (width, touchline to touchline)
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerFrame {
  id: string;             // e.g., "home_7", "away_10"
  team: 'home' | 'away';
  jersey: number;
  pos: Vec2;              // meters from center
  vel: Vec2;              // m/s
  speed: number;          // |vel| in m/s
}

export interface BallFrame {
  pos: Vec2;
  vel: Vec2;
  speed: number;
  holder: string | null;  // player id who has possession, or null
}

export interface Frame {
  index: number;
  time: number;           // seconds from kickoff
  minute: number;
  second: number;
  home: PlayerFrame[];
  away: PlayerFrame[];
  ball: BallFrame;
  possession: 'home' | 'away' | 'contested';
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  fps: number;
  fieldLength: number;    // meters (typically 105)
  fieldWidth: number;     // meters (typically 68)
  frames: Frame[];
  duration: number;       // seconds
}

// ─── Graph Types ─────────────────────────────────────────────

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface PlayerGraph {
  nodes: string[];        // player ids
  edges: GraphEdge[];
  adjacency: Map<string, Map<string, number>>;
}

// ─── Analysis Output Types ───────────────────────────────────

export interface MinCutResult {
  value: number;                    // cut weight (lower = weaker defense)
  corridor: Vec2[];                 // points defining the vulnerability corridor
  partitionGoalSide: string[];      // players on goal side of cut
  partitionFieldSide: string[];     // players on field side of cut
  cutEdges: GraphEdge[];
}

export interface PressTrigger {
  frameIndex: number;
  time: number;
  minute: number;
  opponentPassingLanes: number;     // how many safe options they have
  mincutValue: number;              // how constrained they are
  ballHolder: string | null;
  severity: 'critical' | 'high' | 'moderate';
}

export interface PassingChain {
  frameIndex: number;
  time: number;
  chain: string[];                  // sequence of player ids
  totalProbability: number;         // product of edge probabilities
  reachesGoalZone: boolean;
}

export interface FormationSnapshot {
  frameIndex: number;
  time: number;
  homeFormation: string;            // e.g., "4-4-2", "4-3-3"
  awayFormation: string;
  homeDrift: number;                // how far from ideal formation
  awayDrift: number;
  eigenvalues: number[];            // spectral signature
}

export interface TacticalMoment {
  frameIndex: number;
  time: number;
  minute: number;
  type: 'press_trigger' | 'vulnerability' | 'counter_risk' | 'formation_break' | 'passing_overload';
  severity: 'critical' | 'high' | 'moderate';
  description: string;
  data: Record<string, unknown>;
}

export interface MatchReport {
  match: { id: string; home: string; away: string; duration: number };
  summary: {
    totalMoments: number;
    criticalMoments: number;
    avgDefensiveMincut: { home: number; away: number };
    pressTriggersMissed: number;
    formationBreaks: { home: number; away: number };
  };
  moments: TacticalMoment[];
  timeline: Array<{
    minute: number;
    homeMincut: number;
    awayMincut: number;
    possession: string;
    pressPotential: number;
  }>;
}
