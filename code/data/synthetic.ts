/**
 * Synthetic Match Generator
 *
 * Generates realistic 22-player tracking data with scripted tactical
 * scenarios so the analysis pipeline has clear moments to detect.
 *
 * Scenarios embedded:
 *   1. Normal build-up play (baseline)
 *   2. Defensive line pushed high → gap opens (MinCut drops)
 *   3. Opponent trapped in corner → press trigger
 *   4. Counter-attack after turnover
 *   5. Formation collapse under pressure
 */

import type { Match, Frame, PlayerFrame, BallFrame, Vec2 } from '../types.js';

const FIELD_LENGTH = 105;  // meters
const FIELD_WIDTH = 68;
const HALF_L = FIELD_LENGTH / 2;
const HALF_W = FIELD_WIDTH / 2;
const FPS = 10;  // frames per second (sufficient for tactical analysis)

// ─── Formation Templates ─────────────────────────────────────

// Positions relative to own goal (x: 0=own goal, 105=opponent goal)
// Converted to center-origin later
const FORMATION_442 = {
  GK: { x: 5, y: 0 },
  LB: { x: 30, y: -25 }, CB1: { x: 28, y: -8 }, CB2: { x: 28, y: 8 }, RB: { x: 30, y: 25 },
  LM: { x: 50, y: -28 }, CM1: { x: 48, y: -8 }, CM2: { x: 48, y: 8 }, RM: { x: 50, y: 28 },
  ST1: { x: 72, y: -10 }, ST2: { x: 72, y: 10 },
};

const FORMATION_433 = {
  GK: { x: 5, y: 0 },
  LB: { x: 30, y: -25 }, CB1: { x: 28, y: -8 }, CB2: { x: 28, y: 8 }, RB: { x: 30, y: 25 },
  CM1: { x: 45, y: -12 }, CDM: { x: 42, y: 0 }, CM2: { x: 45, y: 12 },
  LW: { x: 70, y: -25 }, ST: { x: 75, y: 0 }, RW: { x: 70, y: 25 },
};

function formationPositions(formation: Record<string, Vec2>, flip: boolean): Vec2[] {
  return Object.values(formation).map(p => ({
    x: flip ? FIELD_LENGTH - p.x : p.x,
    y: p.y
  }));
}

// ─── Movement Simulation ─────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** Jitter a position with Brownian motion */
function jitter(pos: Vec2, amount: number): Vec2 {
  return {
    x: pos.x + (Math.random() - 0.5) * amount * 2,
    y: pos.y + (Math.random() - 0.5) * amount * 2
  };
}

/** Move a position toward a target with some speed limit and noise */
function moveToward(current: Vec2, target: Vec2, maxStep: number, noise: number = 0.5): Vec2 {
  const d = dist(current, target);
  if (d < 0.1) return jitter(current, noise);
  const step = Math.min(maxStep, d);
  const ratio = step / d;
  return jitter({
    x: current.x + (target.x - current.x) * ratio,
    y: current.y + (target.y - current.y) * ratio,
  }, noise);
}

// ─── Scenario Definitions ────────────────────────────────────

interface Scenario {
  name: string;
  startTime: number;    // seconds
  endTime: number;
  apply: (baseFrame: Frame, t: number, progress: number) => Frame;
}

/** Move the away defensive line dangerously high, creating a gap */
function scenarioHighLine(frame: Frame, _t: number, progress: number): Frame {
  const peak = Math.sin(progress * Math.PI); // ramps up then down
  for (const p of frame.away) {
    // Push defenders forward (toward home goal, which is negative x)
    if (p.jersey >= 2 && p.jersey <= 5) { // defenders
      p.pos.x -= peak * 15; // push 15m forward at peak
      // Spread them apart too, weakening coverage
      p.pos.y *= 1 + peak * 0.3;
    }
  }
  return frame;
}

/** Trap the home team in their own corner — press opportunity for away */
function scenarioCornerTrap(frame: Frame, _t: number, progress: number): Frame {
  const peak = Math.sin(progress * Math.PI);
  // Move ball to home team's corner
  frame.ball.pos = { x: -HALF_L + 10, y: -HALF_W + 8 };
  frame.ball.holder = 'home_2'; // left back has it

  // Compress home players into their own third
  for (const p of frame.home) {
    if (p.jersey !== 1) { // not GK
      p.pos.x = lerp(p.pos.x, -HALF_L + 20 + Math.random() * 15, peak * 0.6);
      p.pos.y = lerp(p.pos.y, -HALF_W + 15 + Math.random() * 20, peak * 0.4);
    }
  }
  // Away team presses high
  for (const p of frame.away) {
    if (p.jersey !== 1) {
      p.pos.x = lerp(p.pos.x, -HALF_L + 25 + Math.random() * 20, peak * 0.5);
    }
  }
  frame.possession = 'home';
  return frame;
}

/** Counter-attack: home team loses ball, away breaks fast */
function scenarioCounterAttack(frame: Frame, _t: number, progress: number): Frame {
  // Away team drives forward with ball
  const ballX = lerp(-10, HALF_L - 15, progress);
  frame.ball.pos = { x: ballX, y: lerp(5, -10, progress) };
  frame.ball.holder = 'away_9'; // striker
  frame.possession = 'away';

  // Away attackers sprint forward
  for (const p of frame.away) {
    if (p.jersey >= 9) { // attackers
      p.pos.x = lerp(p.pos.x, ballX + (Math.random() - 0.5) * 15, 0.3);
      p.speed = 8 + Math.random() * 2; // sprinting
    }
  }
  // Home defenders caught high
  for (const p of frame.home) {
    if (p.jersey >= 2 && p.jersey <= 5) {
      p.pos.x = lerp(p.pos.x, p.pos.x - progress * 8, 0.2); // slow retreat
    }
  }
  return frame;
}

/** Formation collapse: home midfield loses shape under pressure */
function scenarioFormationCollapse(frame: Frame, _t: number, progress: number): Frame {
  const peak = Math.sin(progress * Math.PI);
  // Home midfielders drift out of position
  for (const p of frame.home) {
    if (p.jersey >= 6 && p.jersey <= 8) { // midfield
      p.pos.x += (Math.random() - 0.5) * peak * 20;
      p.pos.y += (Math.random() - 0.5) * peak * 20;
    }
  }
  return frame;
}

/** Passing overload: away team creates numerical superiority on the left */
function scenarioOverload(frame: Frame, _t: number, progress: number): Frame {
  const peak = Math.sin(progress * Math.PI);
  // Away players converge on left side
  for (const p of frame.away) {
    if (p.jersey >= 6 && p.jersey <= 11) {
      p.pos.y = lerp(p.pos.y, p.pos.y - peak * 15, 0.4);
    }
  }
  frame.ball.pos = { x: 15, y: -20 };
  frame.ball.holder = 'away_7';
  frame.possession = 'away';
  return frame;
}

// ─── Main Generator ──────────────────────────────────────────

export function generateSyntheticMatch(durationMinutes: number = 10): Match {
  const durationSeconds = durationMinutes * 60;
  const totalFrames = durationSeconds * FPS;

  // Base positions (center-origin coordinates)
  const homeBase = formationPositions(FORMATION_442, false).map(p => ({
    x: p.x - HALF_L, y: p.y
  }));
  const awayBase = formationPositions(FORMATION_433, true).map(p => ({
    x: p.x - HALF_L, y: p.y
  }));

  // Scenario timeline
  const scenarios: Scenario[] = [
    { name: 'high_line', startTime: 60, endTime: 90, apply: scenarioHighLine },
    { name: 'corner_trap', startTime: 130, endTime: 160, apply: scenarioCornerTrap },
    { name: 'counter_attack', startTime: 210, endTime: 235, apply: scenarioCounterAttack },
    { name: 'formation_collapse', startTime: 310, endTime: 350, apply: scenarioFormationCollapse },
    { name: 'overload', startTime: 420, endTime: 455, apply: scenarioOverload },
    // Repeat some scenarios later
    { name: 'high_line_2', startTime: 480, endTime: 510, apply: scenarioHighLine },
    { name: 'corner_trap_2', startTime: 540, endTime: 565, apply: scenarioCornerTrap },
  ];

  // Current positions (will be mutated frame to frame)
  const homePos = homeBase.map(p => ({ ...p }));
  const awayPos = awayBase.map(p => ({ ...p }));

  const frames: Frame[] = [];

  for (let fi = 0; fi < totalFrames; fi++) {
    const time = fi / FPS;
    const minute = Math.floor(time / 60);
    const second = Math.floor(time % 60);

    // Drift toward base positions with noise (default behavior)
    for (let i = 0; i < 11; i++) {
      homePos[i] = moveToward(homePos[i], homeBase[i], 1.5 / FPS, 0.3);
      homePos[i].x = clamp(homePos[i].x, -HALF_L + 1, HALF_L - 1);
      homePos[i].y = clamp(homePos[i].y, -HALF_W + 1, HALF_W - 1);

      awayPos[i] = moveToward(awayPos[i], awayBase[i], 1.5 / FPS, 0.3);
      awayPos[i].x = clamp(awayPos[i].x, -HALF_L + 1, HALF_L - 1);
      awayPos[i].y = clamp(awayPos[i].y, -HALF_W + 1, HALF_W - 1);
    }

    // Ball follows a random home/away player
    const possTeam = Math.sin(time * 0.1) > 0 ? 'home' : 'away';
    const holderIdx = Math.floor(Math.abs(Math.sin(time * 0.3)) * 10) + 1; // 1-10 (not GK)
    const holderPos = possTeam === 'home' ? homePos[holderIdx] : awayPos[holderIdx];
    const holderId = `${possTeam}_${holderIdx + 1}`;

    // Build frame
    const home: PlayerFrame[] = homePos.map((pos, i) => ({
      id: `home_${i + 1}`,
      team: 'home' as const,
      jersey: i + 1,
      pos: { ...pos },
      vel: { x: 0, y: 0 },
      speed: 2 + Math.random() * 3,
    }));

    const away: PlayerFrame[] = awayPos.map((pos, i) => ({
      id: `away_${i + 1}`,
      team: 'away' as const,
      jersey: i + 1,
      pos: { ...pos },
      vel: { x: 0, y: 0 },
      speed: 2 + Math.random() * 3,
    }));

    const ball: BallFrame = {
      pos: { x: holderPos.x + (Math.random() - 0.5) * 2, y: holderPos.y + (Math.random() - 0.5) * 2 },
      vel: { x: 0, y: 0 },
      speed: 0,
      holder: holderId,
    };

    let frame: Frame = {
      index: fi,
      time,
      minute,
      second,
      home,
      away,
      ball,
      possession: possTeam,
    };

    // Apply active scenarios
    for (const scenario of scenarios) {
      if (time >= scenario.startTime && time <= scenario.endTime) {
        const progress = (time - scenario.startTime) / (scenario.endTime - scenario.startTime);
        frame = scenario.apply(frame, time, progress);
      }
    }

    // Clamp all positions to field
    for (const p of [...frame.home, ...frame.away]) {
      p.pos.x = clamp(p.pos.x, -HALF_L + 0.5, HALF_L - 0.5);
      p.pos.y = clamp(p.pos.y, -HALF_W + 0.5, HALF_W - 0.5);
    }

    frames.push(frame);
  }

  // Compute velocities from position deltas
  for (let fi = 1; fi < frames.length; fi++) {
    const dt = 1 / FPS;
    for (const team of ['home', 'away'] as const) {
      for (let i = 0; i < 11; i++) {
        const curr = frames[fi][team][i];
        const prev = frames[fi - 1][team][i];
        curr.vel = {
          x: (curr.pos.x - prev.pos.x) / dt,
          y: (curr.pos.y - prev.pos.y) / dt,
        };
        curr.speed = Math.sqrt(curr.vel.x ** 2 + curr.vel.y ** 2);
      }
    }
  }

  return {
    id: 'synthetic_demo_001',
    homeTeam: 'FC United',
    awayTeam: 'City Athletic',
    fps: FPS,
    fieldLength: FIELD_LENGTH,
    fieldWidth: FIELD_WIDTH,
    frames,
    duration: durationSeconds,
  };
}
