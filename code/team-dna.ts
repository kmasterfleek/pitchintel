/**
 * Team DNA — Multi-Match Structural Intelligence Briefing
 *
 * "You've just been hired. Here's everything graph theory can tell you
 * about your new team from the last 10 matches."
 *
 * Analyses:
 *   1. Network Centrality — Who are the hub players?
 *   2. Formation DNA — What shape does the team ACTUALLY play?
 *   3. Defensive Blueprint — Where do MinCut corridors appear?
 *   4. Pressing Identity — When and how effectively do they press?
 *   5. Player Chemistry — Strongest and weakest pairwise connections
 *   6. Player Impact — How does team structure change with each player?
 *   7. Temporal Profile — When does the team's structure degrade?
 *   8. Automated Insights — The briefing a coach needs in week one
 *
 * Input: multiple matches of tracking data
 * Output: comprehensive team structural profile
 *
 * Usage: npx tsx src/pitch-intel/team-dna.ts
 */

import { generateSyntheticMatch } from './data/synthetic.js';
import {
  buildPassingGraph, buildDefensiveGraph, stoerWagnerMinCut,
  personalizedPageRank, formationEigenvalues, detectFormation,
  countSafePassingLanes
} from './graph/engine.js';
import type { Match, Frame, PlayerGraph } from './types.js';

// ─── Multi-Match Data Collection ─────────────────────────────

interface PlayerProfile {
  id: string;
  jersey: number;
  appearances: number;
  minutesPlayed: number;
  // Network centrality
  avgPageRank: number;
  avgConnections: number;        // how many passing lanes they create
  avgPassWeight: number;         // average weight of their passing edges
  networkCentrality: number;     // composite score
  // Structural impact
  avgTeamMincutWith: number;     // team MinCut when this player is on
  avgTeamMincutWithout: number;  // estimated MinCut without (from partial matches)
  structuralImpact: number;      // with - without (positive = improves structure)
  // Pressing
  pressTriggerRate: number;      // how often opponent is constrained when this player presses
  // Positions
  avgX: number;
  avgY: number;
  heatmapZones: Map<string, number>;  // zone -> time spent
}

interface PairChemistry {
  playerA: string;
  playerB: string;
  avgPassWeight: number;
  appearances: number;
  connectionStrength: number;    // normalized
}

interface FormationProfile {
  formation: string;
  occurrences: number;
  avgMincut: number;
  avgPressTriggers: number;
  stability: number;             // how long before drift occurs
}

interface TemporalBucket {
  minuteRange: string;
  avgMincut: number;
  avgSafeLanes: number;
  pressEfficiency: number;
  formationStability: number;
}

interface DefensiveHotspot {
  zone: string;                  // e.g., "left", "center-left", "center-right", "right"
  corridorFrequency: number;     // how often MinCut passes through here
  avgMincutWhenHere: number;
}

interface TeamDNA {
  teamName: string;
  matchesAnalyzed: number;
  totalMinutes: number;
  players: PlayerProfile[];
  chemistry: PairChemistry[];
  formations: FormationProfile[];
  temporal: TemporalBucket[];
  defensiveHotspots: DefensiveHotspot[];
  insights: string[];
}

// ─── Analysis Engine ─────────────────────────────────────────

function analyzeTeamDNA(matches: Match[], team: 'home' | 'away'): TeamDNA {
  const teamName = team === 'home' ? matches[0].homeTeam : matches[0].awayTeam;

  // Accumulators
  const playerStats = new Map<string, {
    appearances: number; minutes: number;
    prScores: number[]; connections: number[]; passWeights: number[];
    teamMincuts: number[]; xs: number[]; ys: number[];
    pressFrames: number; pressSuccess: number;
  }>();

  const pairStats = new Map<string, {
    weights: number[]; appearances: Set<number>;
  }>();

  const formationCounts = new Map<string, {
    count: number; mincuts: number[]; pressTriggers: number[];
    driftTimes: number[];
  }>();

  const temporalBuckets = new Map<number, {
    mincuts: number[]; lanes: number[]; pressSuccess: number; pressTotal: number;
    eigDrifts: number[];
  }>();

  const corridorZones = { left: 0, centerLeft: 0, centerRight: 0, right: 0 };
  const corridorMincuts = { left: [] as number[], centerLeft: [] as number[], centerRight: [] as number[], right: [] as number[] };
  let totalSamples = 0;

  // Process each match
  for (let mi = 0; mi < matches.length; mi++) {
    const match = matches[mi];
    const attackDir = team === 'home' ? 1 : -1;
    let baselineEig: number[] | null = null;

    for (let fi = 0; fi < match.frames.length; fi += 5) {
      const frame = match.frames[fi];
      const time = frame.time;
      const minuteBucket = Math.floor(time / (5 * 60)); // 5-minute buckets
      const players = frame[team];
      const opponents = team === 'home' ? frame.away : frame.home;

      // Build graphs
      const passGraph = buildPassingGraph(frame, team);
      const defGraph = buildDefensiveGraph(frame, team);
      const cut = stoerWagnerMinCut(defGraph);
      const lanes = frame.possession === team
        ? countSafePassingLanes(frame, team) : -1;

      // Formation
      const formation = detectFormation(players, attackDir);

      if (!formationCounts.has(formation)) {
        formationCounts.set(formation, { count: 0, mincuts: [], pressTriggers: [], driftTimes: [] });
      }
      const fc = formationCounts.get(formation)!;
      fc.count++;
      fc.mincuts.push(cut.value);

      // Eigenvalue drift
      const outfield = players.filter(p => p.jersey !== 1);
      const eig = formationEigenvalues(outfield);
      if (!baselineEig && time < 30) baselineEig = eig;

      // Temporal bucket
      if (!temporalBuckets.has(minuteBucket)) {
        temporalBuckets.set(minuteBucket, { mincuts: [], lanes: [], pressSuccess: 0, pressTotal: 0, eigDrifts: [] });
      }
      const tb = temporalBuckets.get(minuteBucket)!;
      tb.mincuts.push(cut.value);
      if (lanes >= 0) tb.lanes.push(lanes);
      if (baselineEig && baselineEig[0] > 0) {
        tb.eigDrifts.push(Math.abs(eig[0] / baselineEig[0] - 1));
      }

      // PPR for each player
      for (const p of players) {
        if (!playerStats.has(p.id)) {
          playerStats.set(p.id, {
            appearances: 0, minutes: 0,
            prScores: [], connections: [], passWeights: [],
            teamMincuts: [], xs: [], ys: [],
            pressFrames: 0, pressSuccess: 0,
          });
        }
        const ps = playerStats.get(p.id)!;
        if (fi === 0) ps.appearances++;
        ps.minutes += 0.5; // each sample = 0.5 seconds of real time

        const ppr = personalizedPageRank(passGraph, p.id);
        ps.prScores.push(ppr.get(p.id) ?? 0);

        const adj = passGraph.adjacency.get(p.id);
        if (adj) {
          ps.connections.push(adj.size);
          const totalW = [...adj.values()].reduce((s, v) => s + v, 0);
          ps.passWeights.push(totalW / Math.max(adj.size, 1));
        }

        ps.teamMincuts.push(cut.value);
        ps.xs.push(p.pos.x);
        ps.ys.push(p.pos.y);

        // Press contribution
        if (frame.possession !== team) {
          ps.pressFrames++;
          const oppLanes = countSafePassingLanes(frame, frame.possession as 'home' | 'away');
          if (oppLanes <= 2) ps.pressSuccess++;
        }
      }

      // Pair chemistry
      for (const e of passGraph.edges) {
        const key = [e.from, e.to].sort().join('|');
        if (!pairStats.has(key)) pairStats.set(key, { weights: [], appearances: new Set() });
        const ps = pairStats.get(key)!;
        ps.weights.push(e.weight);
        ps.appearances.add(mi);
      }

      // Defensive corridor analysis
      if (cut.cutEdges.length > 0) {
        const defPlayers = frame[team];
        for (const e of cut.cutEdges) {
          const pA = defPlayers.find(p => p.id === e.from);
          const pB = defPlayers.find(p => p.id === e.to);
          if (pA && pB) {
            const midY = (pA.pos.y + pB.pos.y) / 2;
            const zone = midY < -17 ? 'left' : midY < 0 ? 'centerLeft' : midY < 17 ? 'centerRight' : 'right';
            corridorZones[zone]++;
            corridorMincuts[zone].push(cut.value);
          }
        }
      }

      // Pressing for temporal
      if (frame.possession !== team && lanes >= 0) {
        tb.pressTotal++;
        if (lanes <= 2) tb.pressSuccess++;
      }

      totalSamples++;
    }
  }

  // ── Compile Player Profiles ──────────────────────────────

  const playerProfiles: PlayerProfile[] = [];
  for (const [id, ps] of playerStats) {
    const jersey = parseInt(id.split('_')[1]);
    const avgPR = ps.prScores.reduce((s, v) => s + v, 0) / Math.max(ps.prScores.length, 1);
    const avgConn = ps.connections.reduce((s, v) => s + v, 0) / Math.max(ps.connections.length, 1);
    const avgPW = ps.passWeights.reduce((s, v) => s + v, 0) / Math.max(ps.passWeights.length, 1);
    const avgMC = ps.teamMincuts.reduce((s, v) => s + v, 0) / Math.max(ps.teamMincuts.length, 1);

    playerProfiles.push({
      id,
      jersey,
      appearances: ps.appearances || matches.length,
      minutesPlayed: ps.minutes / 60, // convert to minutes
      avgPageRank: avgPR,
      avgConnections: avgConn,
      avgPassWeight: avgPW,
      networkCentrality: avgPR * 0.4 + (avgConn / 10) * 0.3 + avgPW * 0.3,
      avgTeamMincutWith: avgMC,
      avgTeamMincutWithout: 0, // would need substitution data
      structuralImpact: 0,
      pressTriggerRate: ps.pressFrames > 0 ? ps.pressSuccess / ps.pressFrames : 0,
      avgX: ps.xs.reduce((s, v) => s + v, 0) / Math.max(ps.xs.length, 1),
      avgY: ps.ys.reduce((s, v) => s + v, 0) / Math.max(ps.ys.length, 1),
      heatmapZones: new Map(),
    });
  }
  playerProfiles.sort((a, b) => b.networkCentrality - a.networkCentrality);

  // ── Compile Chemistry ────────────────────────────────────

  const chemistry: PairChemistry[] = [];
  for (const [key, ps] of pairStats) {
    const [a, b] = key.split('|');
    const avgW = ps.weights.reduce((s, v) => s + v, 0) / ps.weights.length;
    chemistry.push({
      playerA: a,
      playerB: b,
      avgPassWeight: avgW,
      appearances: ps.appearances.size,
      connectionStrength: avgW * Math.sqrt(ps.appearances.size),
    });
  }
  chemistry.sort((a, b) => b.connectionStrength - a.connectionStrength);

  // ── Compile Formations ───────────────────────────────────

  const formations: FormationProfile[] = [];
  for (const [name, fc] of formationCounts) {
    const avgMC = fc.mincuts.reduce((s, v) => s + v, 0) / fc.mincuts.length;
    formations.push({
      formation: name,
      occurrences: fc.count,
      avgMincut: avgMC,
      avgPressTriggers: 0,
      stability: 0,
    });
  }
  formations.sort((a, b) => b.occurrences - a.occurrences);

  // ── Compile Temporal ─────────────────────────────────────

  const temporal: TemporalBucket[] = [];
  for (const [bucket, tb] of [...temporalBuckets.entries()].sort((a, b) => a[0] - b[0])) {
    const startMin = bucket * 5;
    const endMin = startMin + 5;
    temporal.push({
      minuteRange: `${startMin}-${endMin}'`,
      avgMincut: tb.mincuts.reduce((s, v) => s + v, 0) / Math.max(tb.mincuts.length, 1),
      avgSafeLanes: tb.lanes.length > 0 ? tb.lanes.reduce((s, v) => s + v, 0) / tb.lanes.length : 0,
      pressEfficiency: tb.pressTotal > 0 ? tb.pressSuccess / tb.pressTotal : 0,
      formationStability: tb.eigDrifts.length > 0
        ? 1 - (tb.eigDrifts.reduce((s, v) => s + v, 0) / tb.eigDrifts.length) : 1,
    });
  }

  // ── Defensive Hotspots ───────────────────────────────────

  const totalCorridors = Object.values(corridorZones).reduce((s, v) => s + v, 0) || 1;
  const defensiveHotspots: DefensiveHotspot[] = [
    { zone: 'left (y < -17m)', corridorFrequency: corridorZones.left / totalCorridors,
      avgMincutWhenHere: corridorMincuts.left.length > 0 ? corridorMincuts.left.reduce((s, v) => s + v, 0) / corridorMincuts.left.length : 0 },
    { zone: 'center-left (-17m to 0)', corridorFrequency: corridorZones.centerLeft / totalCorridors,
      avgMincutWhenHere: corridorMincuts.centerLeft.length > 0 ? corridorMincuts.centerLeft.reduce((s, v) => s + v, 0) / corridorMincuts.centerLeft.length : 0 },
    { zone: 'center-right (0 to 17m)', corridorFrequency: corridorZones.centerRight / totalCorridors,
      avgMincutWhenHere: corridorMincuts.centerRight.length > 0 ? corridorMincuts.centerRight.reduce((s, v) => s + v, 0) / corridorMincuts.centerRight.length : 0 },
    { zone: 'right (y > 17m)', corridorFrequency: corridorZones.right / totalCorridors,
      avgMincutWhenHere: corridorMincuts.right.length > 0 ? corridorMincuts.right.reduce((s, v) => s + v, 0) / corridorMincuts.right.length : 0 },
  ];

  // ── Generate Insights ────────────────────────────────────

  const insights: string[] = [];

  // Hub player
  const hub = playerProfiles[0];
  insights.push(`#${hub.jersey} is your network backbone — highest PageRank (${hub.avgPageRank.toFixed(3)}) and ${hub.avgConnections.toFixed(1)} avg connections. Losing this player will disrupt your passing structure most.`);

  // Most isolated player
  const isolated = [...playerProfiles].filter(p => p.jersey !== 1).sort((a, b) => a.networkCentrality - b.networkCentrality)[0];
  insights.push(`#${isolated.jersey} is the most isolated player in the network (centrality ${isolated.networkCentrality.toFixed(3)}). Either they're underutilized or playing a role that doesn't integrate with the system.`);

  // Strongest pair
  const topPair = chemistry[0];
  if (topPair) {
    const a = topPair.playerA.split('_')[1];
    const b = topPair.playerB.split('_')[1];
    insights.push(`Strongest connection: #${a} ↔ #${b} (pass weight ${topPair.avgPassWeight.toFixed(3)}). This is your most reliable passing lane. Build around it.`);
  }

  // Weakest defensive zone
  const worstZone = [...defensiveHotspots].sort((a, b) => b.corridorFrequency - a.corridorFrequency)[0];
  insights.push(`Defensive vulnerability concentrates on the ${worstZone.zone} — ${(worstZone.corridorFrequency * 100).toFixed(0)}% of MinCut corridors pass through here. Opponents will target this side.`);

  // Formation stability
  const primaryFormation = formations[0];
  if (primaryFormation) {
    insights.push(`Primary shape: ${primaryFormation.formation} (${primaryFormation.occurrences} frames, ${(primaryFormation.occurrences / totalSamples * 100).toFixed(0)}% of match time). Avg defensive solidity in this shape: ${primaryFormation.avgMincut.toFixed(3)}.`);
  }

  // Temporal degradation
  if (temporal.length >= 2) {
    const firstHalf = temporal.slice(0, Math.ceil(temporal.length / 2));
    const secondHalf = temporal.slice(Math.ceil(temporal.length / 2));
    const firstMC = firstHalf.reduce((s, t) => s + t.avgMincut, 0) / firstHalf.length;
    const secondMC = secondHalf.reduce((s, t) => s + t.avgMincut, 0) / secondHalf.length;
    const drop = ((firstMC - secondMC) / firstMC * 100);
    if (drop > 5) {
      insights.push(`Team structure degrades ${drop.toFixed(0)}% in the second half of matches. Formation stability also drops. Consider early subs or more conservative shape after 60'.`);
    } else if (drop < -5) {
      insights.push(`Team structure actually IMPROVES as matches progress (${(-drop).toFixed(0)}% better). This is a side that grows into games.`);
    } else {
      insights.push(`Structural consistency is even across match time — no significant degradation pattern.`);
    }
  }

  // Press identity
  const avgPressEff = temporal.reduce((s, t) => s + t.pressEfficiency, 0) / Math.max(temporal.length, 1);
  if (avgPressEff > 0.4) {
    insights.push(`Strong pressing identity: ${(avgPressEff * 100).toFixed(0)}% of defensive actions result in constraining opponents to ≤2 lanes. This team knows how to press.`);
  } else if (avgPressEff > 0.2) {
    insights.push(`Moderate pressing capability (${(avgPressEff * 100).toFixed(0)}% efficiency). There's potential but the press isn't consistently coordinated.`);
  } else {
    insights.push(`Low pressing efficiency (${(avgPressEff * 100).toFixed(0)}%). This team prefers to sit back or the press is poorly organized. Consider whether to train it or lean into a mid-block.`);
  }

  return {
    teamName,
    matchesAnalyzed: matches.length,
    totalMinutes: matches.reduce((s, m) => s + m.duration, 0) / 60,
    players: playerProfiles,
    chemistry,
    formations,
    temporal,
    defensiveHotspots,
    insights,
  };
}

// ─── Report Output ───────────────────────────────────────────

function header(text: string) {
  console.log('\n' + '═'.repeat(72));
  console.log(`  ${text}`);
  console.log('═'.repeat(72));
}

function sub(text: string) {
  console.log(`\n── ${text} ${'─'.repeat(Math.max(0, 66 - text.length))}`);
}

function printTeamDNA(dna: TeamDNA) {
  header(`TEAM DNA BRIEFING — ${dna.teamName.toUpperCase()}`);
  console.log(`  "Here's what graph intelligence tells you about your new team."`);
  console.log(`\n  Matches analyzed: ${dna.matchesAnalyzed}`);
  console.log(`  Total match time: ${dna.totalMinutes.toFixed(0)} minutes`);

  // ── Key Insights (the TL;DR) ──────────────────────────

  sub('KEY INSIGHTS — Read This First');
  for (let i = 0; i < dna.insights.length; i++) {
    console.log(`\n  ${i + 1}. ${dna.insights[i]}`);
  }

  // ── Player Network Centrality ─────────────────────────

  sub('PLAYER NETWORK CENTRALITY');
  console.log('  Who makes this team tick? Ranked by graph centrality score.\n');
  console.log('  #    Player         PageRank  Connections  Pass Wt  Centrality  Role');
  console.log('  ' + '-'.repeat(68));

  for (const p of dna.players.filter(pp => pp.jersey !== 1).slice(0, 10)) {
    const role = p.networkCentrality > 0.08 ? 'HUB' :
                 p.networkCentrality > 0.05 ? 'Connector' :
                 p.networkCentrality > 0.03 ? 'Role player' : 'Peripheral';
    console.log(`  ${String(p.jersey).padStart(2)}   ${p.id.padEnd(14)} ${p.avgPageRank.toFixed(4).padStart(8)}  ${p.avgConnections.toFixed(1).padStart(11)}  ${p.avgPassWeight.toFixed(3).padStart(7)}  ${p.networkCentrality.toFixed(4).padStart(10)}  ${role}`);
  }

  // ── Player Chemistry Map ──────────────────────────────

  sub('PLAYER CHEMISTRY — Strongest Connections');
  console.log('  Pairs with the highest passing bond across all matches.\n');
  console.log('  Pair                  Avg Weight  Matches  Strength');
  console.log('  ' + '-'.repeat(55));

  for (const c of dna.chemistry.slice(0, 15)) {
    const a = c.playerA.split('_')[1];
    const b = c.playerB.split('_')[1];
    console.log(`  #${a.padEnd(3)}↔ #${b.padEnd(13)} ${c.avgPassWeight.toFixed(4).padStart(10)}  ${String(c.appearances).padStart(7)}  ${c.connectionStrength.toFixed(3).padStart(8)}`);
  }

  sub('PLAYER CHEMISTRY — Weakest Connections');
  console.log('  Pairs that rarely connect — potential blind spots.\n');
  const weak = [...dna.chemistry].sort((a, b) => a.connectionStrength - b.connectionStrength);
  for (const c of weak.slice(0, 10)) {
    const a = c.playerA.split('_')[1];
    const b = c.playerB.split('_')[1];
    console.log(`  #${a.padEnd(3)}↔ #${b.padEnd(13)} ${c.avgPassWeight.toFixed(4).padStart(10)}  ${String(c.appearances).padStart(7)}  ${c.connectionStrength.toFixed(3).padStart(8)}`);
  }

  // ── Formation DNA ─────────────────────────────────────

  sub('FORMATION DNA');
  console.log('  What shape does the team ACTUALLY play?\n');
  console.log('  Formation      % Time    Avg MinCut   Assessment');
  console.log('  ' + '-'.repeat(55));

  const totalOcc = dna.formations.reduce((s, f) => s + f.occurrences, 0);
  for (const f of dna.formations.slice(0, 5)) {
    const pct = (f.occurrences / totalOcc * 100).toFixed(0);
    const assessment = f.avgMincut > 0.5 ? 'Structurally sound' :
                       f.avgMincut > 0.3 ? 'Average solidity' : 'Vulnerable';
    console.log(`  ${f.formation.padEnd(14)} ${pct.padStart(4)}%    ${f.avgMincut.toFixed(3).padStart(10)}   ${assessment}`);
  }

  // ── Defensive Blueprint ───────────────────────────────

  sub('DEFENSIVE BLUEPRINT — Where You Get Hurt');
  console.log('  MinCut corridor distribution: where do defensive gaps appear?\n');

  const maxFreq = Math.max(...dna.defensiveHotspots.map(h => h.corridorFrequency));
  for (const h of dna.defensiveHotspots) {
    const barLen = Math.round((h.corridorFrequency / Math.max(maxFreq, 0.01)) * 30);
    const bar = '█'.repeat(Math.max(0, barLen)) + '░'.repeat(Math.max(0, 30 - barLen));
    const pct = (h.corridorFrequency * 100).toFixed(0);
    const danger = h.corridorFrequency > 0.35 ? ' ◄ PRIMARY THREAT' :
                   h.corridorFrequency > 0.25 ? ' ◄ watch this side' : '';
    console.log(`  ${h.zone.padEnd(25)} │${bar}│ ${pct}%${danger}`);
  }

  // ── Temporal Profile ──────────────────────────────────

  sub('TEMPORAL PROFILE — How Structure Changes Over Time');
  console.log('  Does the team fade? Get stronger? Stay consistent?\n');
  console.log('  Period     MinCut    Lanes   Press%   Form Stability');
  console.log('  ' + '-'.repeat(55));

  for (const t of dna.temporal) {
    const pressStr = (t.pressEfficiency * 100).toFixed(0);
    const stabStr = (t.formationStability * 100).toFixed(0);
    console.log(`  ${t.minuteRange.padEnd(10)} ${t.avgMincut.toFixed(3).padStart(7)}    ${t.avgSafeLanes.toFixed(1).padStart(5)}   ${pressStr.padStart(5)}%   ${stabStr.padStart(12)}%`);
  }

  // ── Player Position Map (ASCII) ───────────────────────

  sub('AVERAGE POSITION MAP');
  console.log('  Where each player typically operates (attacking →)\n');

  const outfield = dna.players.filter(p => p.jersey !== 1);
  // Simple ASCII pitch
  const pitchW = 60;
  const pitchH = 20;
  const grid: string[][] = Array.from({ length: pitchH }, () => new Array(pitchW).fill(' '));

  // Draw boundaries
  for (let x = 0; x < pitchW; x++) { grid[0][x] = '─'; grid[pitchH - 1][x] = '─'; }
  for (let y = 0; y < pitchH; y++) { grid[y][0] = '│'; grid[y][pitchW - 1] = '│'; }
  grid[0][0] = '┌'; grid[0][pitchW - 1] = '┐';
  grid[pitchH - 1][0] = '└'; grid[pitchH - 1][pitchW - 1] = '┘';
  // Center line
  for (let y = 1; y < pitchH - 1; y++) grid[y][Math.floor(pitchW / 2)] = '┊';

  for (const p of outfield) {
    // Map from field coords (-52.5..52.5, -34..34) to grid
    const gx = Math.round(((p.avgX + 52.5) / 105) * (pitchW - 4)) + 2;
    const gy = Math.round(((p.avgY + 34) / 68) * (pitchH - 4)) + 2;
    const cx = Math.max(1, Math.min(pitchW - 3, gx));
    const cy = Math.max(1, Math.min(pitchH - 2, gy));
    const label = String(p.jersey).padStart(2);
    if (cx < pitchW - 2) {
      grid[cy][cx] = label[0];
      grid[cy][cx + 1] = label[1];
    }
  }

  for (const row of grid) {
    console.log('  ' + row.join(''));
  }
  console.log(`  ${'← Own Goal'.padEnd(30)}Opp Goal →`);

  // ── Pressing Identity ─────────────────────────────────

  sub('PRESSING IDENTITY');
  console.log('  Which players contribute most to the press?\n');
  console.log('  #    Player         Press Rate   Assessment');
  console.log('  ' + '-'.repeat(50));

  const pressRanked = [...dna.players]
    .filter(p => p.jersey !== 1)
    .sort((a, b) => b.pressTriggerRate - a.pressTriggerRate);

  for (const p of pressRanked.slice(0, 10)) {
    const rate = (p.pressTriggerRate * 100).toFixed(0);
    const assessment = p.pressTriggerRate > 0.4 ? 'Elite presser' :
                       p.pressTriggerRate > 0.25 ? 'Consistent' :
                       p.pressTriggerRate > 0.15 ? 'Average' : 'Low workrate';
    console.log(`  ${String(p.jersey).padStart(2)}   ${p.id.padEnd(14)} ${rate.padStart(9)}%   ${assessment}`);
  }

  // ── Summary ───────────────────────────────────────────

  header('YOUR FIRST-WEEK ACTION ITEMS');
  console.log(`\n  Based on ${dna.matchesAnalyzed} matches of structural analysis:\n`);
  console.log(`  1. Meet with #${dna.players[0].jersey} first — they're the network hub.`);
  console.log(`     Everything flows through them. Understand how they see the game.`);

  const weakZone = dna.defensiveHotspots.sort((a, b) => b.corridorFrequency - a.corridorFrequency)[0];
  console.log(`\n  2. Address the ${weakZone.zone} defensive corridor.`);
  console.log(`     ${(weakZone.corridorFrequency * 100).toFixed(0)}% of structural vulnerabilities concentrate here.`);
  console.log(`     Your first opponent WILL target this.`);

  if (dna.formations.length > 1) {
    const best = [...dna.formations].sort((a, b) => b.avgMincut - a.avgMincut)[0];
    console.log(`\n  3. Consider defaulting to ${best.formation}.`);
    console.log(`     It gives the highest structural solidity (MinCut ${best.avgMincut.toFixed(3)}).`);
  }

  const topPair = dna.chemistry[0];
  if (topPair) {
    const a = topPair.playerA.split('_')[1];
    const b = topPair.playerB.split('_')[1];
    console.log(`\n  4. Build around the #${a} ↔ #${b} connection.`);
    console.log(`     This is the strongest passing bond in the squad. Don't break it.`);
  }

  console.log(`\n  5. Watch the ${dna.temporal.length > 1 ? dna.temporal[dna.temporal.length - 1].minuteRange : 'late'} period.`);
  const lastBucket = dna.temporal[dna.temporal.length - 1];
  if (lastBucket) {
    console.log(`     MinCut drops to ${lastBucket.avgMincut.toFixed(3)}, formation stability at ${(lastBucket.formationStability * 100).toFixed(0)}%.`);
    console.log(`     Have your substitutions planned for this window.`);
  }
  console.log('');
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('Generating 5 synthetic matches for Team DNA analysis...');
  const matches: Match[] = [];
  for (let i = 0; i < 5; i++) {
    matches.push(generateSyntheticMatch(10));
    process.stdout.write(`  Match ${i + 1}/5 generated\n`);
  }

  console.log('\nAnalyzing team DNA (this processes all matches simultaneously)...');
  const start = Date.now();
  const dna = analyzeTeamDNA(matches, 'home');
  const elapsed = Date.now() - start;
  console.log(`  Analysis complete in ${elapsed}ms`);
  console.log(`  ${matches.reduce((s, m) => s + m.frames.length, 0)} total frames processed`);

  printTeamDNA(dna);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
