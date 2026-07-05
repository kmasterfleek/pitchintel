/**
 * Tactical Analysis Pipeline
 *
 * Processes every frame of a match and detects tactical moments:
 *   - Defensive vulnerabilities (MinCut drops)
 *   - Press triggers (opponent has few passing options)
 *   - Counter-attack risk (fast transition, defenders caught high)
 *   - Formation breaks (eigenvalue shift beyond threshold)
 *   - Passing overload (numerical superiority in a zone)
 */

import type {
  Match, Frame, TacticalMoment, MatchReport, MinCutResult,
  FormationSnapshot, Vec2, PlayerFrame
} from '../types.js';
import {
  buildPassingGraph, buildDefensiveGraph, stoerWagnerMinCut,
  personalizedPageRank, formationEigenvalues, detectFormation,
  countSafePassingLanes
} from '../graph/engine.js';

// ─── Thresholds ──────────────────────────────────────────────

const THRESHOLDS = {
  // MinCut: below this = defensive vulnerability
  // (calibrated for inverse-square edge weights, typical values ~0.5-3.0)
  mincutCritical: 0.15,
  mincutHigh: 0.25,
  mincutModerate: 0.4,

  // Press trigger: opponent has this many or fewer safe passing lanes
  pressLanesCritical: 1,
  pressLanesHigh: 2,
  pressLanesModerate: 3,

  // Formation drift: eigenvalue ratio change beyond this threshold
  formationDriftThreshold: 0.4,

  // Counter-attack: average defender speed toward own goal
  counterSpeedThreshold: 4.0, // m/s retreating

  // Overload: 3+ players more than opponent in a zone
  overloadAdvantage: 3,

  // Minimum seconds between reported moments of same type
  cooldown: 15,  // at least 15s between same-type alerts

  // Analysis sample rate (analyze every Nth frame)
  sampleEvery: 5,  // at 10fps, analyze every 0.5s
};

// ─── Zone Analysis ───────────────────────────────────────────

interface Zone {
  name: string;
  xMin: number; xMax: number;
  yMin: number; yMax: number;
}

const ZONES: Zone[] = [
  { name: 'home_box', xMin: -52.5, xMax: -36, yMin: -20, yMax: 20 },
  { name: 'home_third', xMin: -52.5, xMax: -17.5, yMin: -34, yMax: 34 },
  { name: 'mid_left', xMin: -17.5, xMax: 17.5, yMin: -34, yMax: 0 },
  { name: 'mid_right', xMin: -17.5, xMax: 17.5, yMin: 0, yMax: 34 },
  { name: 'away_third', xMin: 17.5, xMax: 52.5, yMin: -34, yMax: 34 },
  { name: 'away_box', xMin: 36, xMax: 52.5, yMin: -20, yMax: 20 },
];

function playersInZone(players: PlayerFrame[], zone: Zone): PlayerFrame[] {
  return players.filter(p =>
    p.pos.x >= zone.xMin && p.pos.x <= zone.xMax &&
    p.pos.y >= zone.yMin && p.pos.y <= zone.yMax
  );
}

// ─── Spatial MinCut Corridor ─────────────────────────────────

/** Convert a graph MinCut into a spatial corridor on the pitch */
function computeCorridor(
  cut: MinCutResult,
  players: PlayerFrame[]
): Vec2[] {
  if (cut.cutEdges.length === 0) return [];

  // The corridor is the line between the two partitions
  // Find the "gap" — midpoints of cut edges
  const midpoints: Vec2[] = [];
  for (const e of cut.cutEdges) {
    const pA = players.find(p => p.id === e.from);
    const pB = players.find(p => p.id === e.to);
    if (pA && pB) {
      midpoints.push({
        x: (pA.pos.x + pB.pos.x) / 2,
        y: (pA.pos.y + pB.pos.y) / 2
      });
    }
  }

  // Sort by y coordinate to form a corridor line
  return midpoints.sort((a, b) => a.y - b.y);
}

// ─── Main Analysis Pipeline ──────────────────────────────────

export function analyzeMatch(match: Match): MatchReport {
  const moments: TacticalMoment[] = [];
  const timeline: MatchReport['timeline'] = [];

  // Cooldown tracking (prevent spam)
  const lastMoment = new Map<string, number>();

  // Running averages for baseline
  let homeMincutSum = 0, awayMincutSum = 0, sampleCount = 0;

  // Baseline formation eigenvalues (from first 30 seconds)
  let homeBaselineEig: number[] | null = null;
  let awayBaselineEig: number[] | null = null;

  const totalFrames = match.frames.length;

  for (let fi = 0; fi < totalFrames; fi += THRESHOLDS.sampleEvery) {
    const frame = match.frames[fi];
    const time = frame.time;
    const minute = frame.minute;

    // ── Build graphs ──────────────────────────────────────

    const homeDefGraph = buildDefensiveGraph(frame, 'home');
    const awayDefGraph = buildDefensiveGraph(frame, 'away');
    const homePassGraph = buildPassingGraph(frame, 'home');
    const awayPassGraph = buildPassingGraph(frame, 'away');

    // ── MinCut analysis ───────────────────────────────────

    const homeCut = stoerWagnerMinCut(homeDefGraph);
    const awayCut = stoerWagnerMinCut(awayDefGraph);

    homeMincutSum += homeCut.value;
    awayMincutSum += awayCut.value;
    sampleCount++;

    // Check for defensive vulnerability
    for (const [team, cut, players] of [
      ['home', homeCut, frame.home] as const,
      ['away', awayCut, frame.away] as const,
    ]) {
      const opponentTeam = team === 'home' ? match.awayTeam : match.homeTeam;
      const defendingTeam = team === 'home' ? match.homeTeam : match.awayTeam;

      let severity: 'critical' | 'high' | 'moderate' | null = null;
      if (cut.value < THRESHOLDS.mincutCritical) severity = 'critical';
      else if (cut.value < THRESHOLDS.mincutHigh) severity = 'high';
      else if (cut.value < THRESHOLDS.mincutModerate) severity = 'moderate';

      if (severity) {
        const key = `vulnerability_${team}`;
        const lastTime = lastMoment.get(key) ?? -Infinity;
        if (time - lastTime >= THRESHOLDS.cooldown) {
          const corridor = computeCorridor(cut, [...players]);
          const corridorDesc = corridor.length > 0
            ? `y=[${corridor[0].y.toFixed(0)}, ${corridor[corridor.length - 1].y.toFixed(0)}]m`
            : 'diffuse';

          moments.push({
            frameIndex: fi,
            time,
            minute,
            type: 'vulnerability',
            severity,
            description: `${defendingTeam} defensive MinCut=${cut.value.toFixed(2)} — corridor at ${corridorDesc}. ${opponentTeam} should attack here.`,
            data: { team, mincutValue: cut.value, corridor, cutEdges: cut.cutEdges.length }
          });
          lastMoment.set(key, time);
        }
      }
    }

    // ── Press triggers ────────────────────────────────────

    for (const team of ['home', 'away'] as const) {
      if (frame.possession !== team) continue; // only check team in possession

      const lanes = countSafePassingLanes(frame, team);
      const pressingTeam = team === 'home' ? match.awayTeam : match.homeTeam;
      const possTeam = team === 'home' ? match.homeTeam : match.awayTeam;

      let severity: 'critical' | 'high' | 'moderate' | null = null;
      if (lanes <= THRESHOLDS.pressLanesCritical) severity = 'critical';
      else if (lanes <= THRESHOLDS.pressLanesHigh) severity = 'high';
      else if (lanes <= THRESHOLDS.pressLanesModerate) severity = 'moderate';

      if (severity) {
        const key = `press_${team}`;
        const lastTime = lastMoment.get(key) ?? -Infinity;
        if (time - lastTime >= THRESHOLDS.cooldown) {
          moments.push({
            frameIndex: fi,
            time,
            minute,
            type: 'press_trigger',
            severity,
            description: `PRESS NOW: ${possTeam} has only ${lanes} safe passing lane(s). ${pressingTeam} should press immediately.`,
            data: { possessionTeam: team, lanes, ballHolder: frame.ball.holder }
          });
          lastMoment.set(key, time);
        }
      }
    }

    // ── Counter-attack risk ───────────────────────────────

    for (const team of ['home', 'away'] as const) {
      const defenders = frame[team].filter(p => p.jersey >= 2 && p.jersey <= 5);
      const retreatDir = team === 'home' ? -1 : 1;

      // Average retreat speed (velocity component toward own goal)
      const avgRetreat = defenders.reduce((s, p) => s + p.vel.x * retreatDir, 0) / defenders.length;

      // Defenders caught high? (average x position beyond midfield)
      const avgDefX = defenders.reduce((s, p) => s + p.pos.x, 0) / defenders.length;
      const caughtHigh = team === 'home' ? avgDefX > 10 : avgDefX < -10;

      if (avgRetreat > THRESHOLDS.counterSpeedThreshold && caughtHigh && frame.possession !== team) {
        const key = `counter_${team}`;
        const lastTime = lastMoment.get(key) ?? -Infinity;
        if (time - lastTime >= THRESHOLDS.cooldown) {
          const teamName = team === 'home' ? match.homeTeam : match.awayTeam;
          moments.push({
            frameIndex: fi,
            time,
            minute,
            type: 'counter_risk',
            severity: 'high',
            description: `COUNTER-ATTACK RISK for ${teamName}: defenders caught at avg x=${avgDefX.toFixed(0)}m, retreating at ${avgRetreat.toFixed(1)}m/s.`,
            data: { team, avgDefenderX: avgDefX, retreatSpeed: avgRetreat }
          });
          lastMoment.set(key, time);
        }
      }
    }

    // ── Formation drift ───────────────────────────────────

    const homeEig = formationEigenvalues(frame.home.filter(p => p.jersey !== 1));
    const awayEig = formationEigenvalues(frame.away.filter(p => p.jersey !== 1));

    if (time < 30) {
      // Build baseline
      if (!homeBaselineEig) homeBaselineEig = homeEig;
      if (!awayBaselineEig) awayBaselineEig = awayEig;
    } else {
      for (const [team, eig, baseline] of [
        ['home', homeEig, homeBaselineEig] as const,
        ['away', awayEig, awayBaselineEig] as const,
      ]) {
        if (!baseline) continue;
        const ratio = baseline[0] > 0 ? Math.abs(eig[0] / baseline[0] - 1) : 0;
        if (ratio > THRESHOLDS.formationDriftThreshold) {
          const key = `formation_${team}`;
          const lastTime = lastMoment.get(key) ?? -Infinity;
          if (time - lastTime >= THRESHOLDS.cooldown * 2) {
            const teamName = team === 'home' ? match.homeTeam : match.awayTeam;
            const formation = detectFormation(
              frame[team],
              team === 'home' ? 1 : -1
            );
            moments.push({
              frameIndex: fi,
              time,
              minute,
              type: 'formation_break',
              severity: ratio > 0.6 ? 'critical' : 'moderate',
              description: `${teamName} formation drifted ${(ratio * 100).toFixed(0)}% from baseline. Current shape: ${formation}. Eigenvalue ratio: ${(eig[0] / baseline[0]).toFixed(2)}.`,
              data: { team, drift: ratio, formation, eigenvalues: eig }
            });
            lastMoment.set(key, time);
          }
        }
      }
    }

    // ── Passing overload ──────────────────────────────────

    for (const zone of ZONES) {
      const homeInZone = playersInZone(frame.home, zone);
      const awayInZone = playersInZone(frame.away, zone);
      const advantage = Math.abs(homeInZone.length - awayInZone.length);

      if (advantage >= THRESHOLDS.overloadAdvantage) {
        const key = `overload_${zone.name}`;
        const lastTime = lastMoment.get(key) ?? -Infinity;
        if (time - lastTime >= THRESHOLDS.cooldown * 2) {
          const dominant = homeInZone.length > awayInZone.length ? 'home' : 'away';
          const teamName = dominant === 'home' ? match.homeTeam : match.awayTeam;
          moments.push({
            frameIndex: fi,
            time,
            minute,
            type: 'passing_overload',
            severity: advantage >= 4 ? 'high' : 'moderate',
            description: `${teamName} has ${advantage}-player overload in ${zone.name} (${homeInZone.length}v${awayInZone.length}).`,
            data: { zone: zone.name, homeCount: homeInZone.length, awayCount: awayInZone.length, dominant }
          });
          lastMoment.set(key, time);
        }
      }
    }

    // ── Timeline entry ────────────────────────────────────

    const homePassLanes = frame.possession === 'home'
      ? countSafePassingLanes(frame, 'home')
      : -1;
    const awayPassLanes = frame.possession === 'away'
      ? countSafePassingLanes(frame, 'away')
      : -1;
    const pressPotential = frame.possession === 'home'
      ? Math.max(0, 5 - homePassLanes) / 5
      : frame.possession === 'away'
      ? Math.max(0, 5 - awayPassLanes) / 5
      : 0;

    timeline.push({
      minute: frame.minute + frame.second / 60,
      homeMincut: homeCut.value,
      awayMincut: awayCut.value,
      possession: frame.possession,
      pressPotential,
    });
  }

  // ── PPR analysis for key moments ──────────────────────────

  for (const moment of moments.filter(m => m.type === 'press_trigger' && m.severity === 'critical')) {
    const frame = match.frames[moment.frameIndex];
    const team = (moment.data.possessionTeam as string) === 'home' ? 'away' : 'home';
    const passGraph = buildPassingGraph(frame, team === 'home' ? 'home' : 'away');

    // Find the most "reachable" player from the ball position
    if (frame.ball.holder) {
      const ppr = personalizedPageRank(passGraph, frame.ball.holder);
      const sorted = [...ppr.entries()].sort((a, b) => b[1] - a[1]);
      moment.data.topTargets = sorted.slice(0, 3).map(([id, score]) => ({ id, score: score.toFixed(3) }));
    }
  }

  // ── Compile report ────────────────────────────────────────

  const avgHomeMC = sampleCount > 0 ? homeMincutSum / sampleCount : 0;
  const avgAwayMC = sampleCount > 0 ? awayMincutSum / sampleCount : 0;

  return {
    match: {
      id: match.id,
      home: match.homeTeam,
      away: match.awayTeam,
      duration: match.duration,
    },
    summary: {
      totalMoments: moments.length,
      criticalMoments: moments.filter(m => m.severity === 'critical').length,
      avgDefensiveMincut: { home: avgHomeMC, away: avgAwayMC },
      pressTriggersMissed: moments.filter(m => m.type === 'press_trigger').length,
      formationBreaks: {
        home: moments.filter(m => m.type === 'formation_break' && m.data.team === 'home').length,
        away: moments.filter(m => m.type === 'formation_break' && m.data.team === 'away').length,
      },
    },
    moments: moments.sort((a, b) => a.time - b.time),
    timeline,
  };
}
