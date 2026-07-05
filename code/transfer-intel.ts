/**
 * PitchIntel Transfer Intelligence
 *
 * Context-adjusted player valuations: what is a player worth
 * to THIS specific team, given how they actually play?
 *
 * Core principle: a player's value is not intrinsic — it's relational.
 * The same player is worth different amounts to different teams based on:
 *
 *   1. SYSTEM FIT — does their playing style match the team's graph structure?
 *   2. STRUCTURAL IMPACT — do they improve MinCut (defense) or PPR flow (attack)?
 *   3. CHEMISTRY — do they pair well with existing players?
 *   4. REDUNDANCY — does the team already have what this player offers?
 *   5. DEPENDENCY RISK — would buying them create a single point of failure?
 *   6. FORMATION FIT — do they suit the shape the team actually plays?
 *
 * Input: team tracking data (multiple matches) + player profile (from scouting data)
 * Output: context-adjusted valuation per team, with explanation
 *
 * Usage: npx tsx src/pitch-intel/transfer-intel.ts
 */

import { generateSyntheticMatch } from './data/synthetic.js';
import {
  buildPassingGraph, buildDefensiveGraph, stoerWagnerMinCut,
  personalizedPageRank, formationEigenvalues, detectFormation,
  countSafePassingLanes
} from './graph/engine.js';
import type { Match, Frame, PlayerFrame, Vec2 } from './types.js';

// ─── Player Profile (scouting data) ─────────────────────────

export interface ScoutProfile {
  name: string;
  age: number;
  position: string;           // 'CB', 'LB', 'CM', 'RW', 'ST', etc.
  marketValue: number;        // € millions (TransferMarkt / agent asking price)
  contractYearsLeft: number;
  // Playing style metrics (from their current/previous team data)
  avgX: number;               // typical position x (center-origin, meters)
  avgY: number;               // typical position y
  passCompletionRate: number; // 0-1
  avgPassDistance: number;     // meters
  defensiveWorkRate: number;  // 0-1 (how much they contribute to pressing)
  sprintCapacity: number;     // sprints per 90
  avgSpeed: number;           // m/s typical match speed
  // Graph metrics from their current team
  currentPageRank: number;    // their centrality in current team
  currentConnections: number; // avg passing connections
  currentPassWeight: number;  // avg pass edge weight
}

// ─── Team Context (from Team DNA analysis) ───────────────────

export interface TeamContext {
  name: string;
  budget: number;             // € millions available
  formation: string;          // primary formation
  style: 'possession' | 'counter' | 'pressing' | 'balanced';
  // From Team DNA
  avgMincut: number;          // current defensive solidity
  networkDensity: number;     // how connected the passing network is
  weakestZone: string;        // 'left', 'center', 'right'
  hubPlayer: string;          // jersey of current network hub
  hubDependency: number;      // how much the team depends on their hub (0-1)
  pressEfficiency: number;    // current press success rate
  // Existing squad coverage by position
  positionDepth: Map<string, number>; // position -> number of players available
  // Per-player centrality (for chemistry calculation)
  playerCentralities: Map<string, number>; // player_id -> centrality score
  // Average player profile for comparison
  avgPlayerCentrality: number;
  avgPlayerConnections: number;
}

// ─── Valuation Model ─────────────────────────────────────────

interface ValuationFactor {
  name: string;
  score: number;              // -1 to +1 (negative = reduces value, positive = increases)
  weight: number;             // importance weight
  explanation: string;
}

interface ContextValuation {
  team: string;
  player: string;
  marketValue: number;        // € millions (base)
  contextValue: number;       // € millions (adjusted for this team)
  multiplier: number;         // contextValue / marketValue
  verdict: 'underpay' | 'fair' | 'overpay' | 'avoid';
  factors: ValuationFactor[];
  summary: string;
  recommendation: string;
}

function evaluateSystemFit(
  player: ScoutProfile,
  team: TeamContext
): ValuationFactor {
  // Does the player's positional profile match the team's formation needs?
  const posNeed = team.positionDepth.get(player.position) ?? 0;
  const positionFit = posNeed <= 1 ? 0.8 : posNeed <= 2 ? 0.3 : -0.3;

  // Does their playing area match the formation shape?
  // A CM who plays at x=48 fits a 4-4-2 but not a 4-3-3 with a single pivot
  let formationFit = 0;
  if (team.formation.includes('4-4-2')) {
    if (['CM', 'LM', 'RM', 'ST'].includes(player.position)) formationFit = 0.5;
    if (['CAM', 'CDM'].includes(player.position)) formationFit = -0.2;
  } else if (team.formation.includes('4-3-3')) {
    if (['CM', 'CDM', 'LW', 'RW', 'ST'].includes(player.position)) formationFit = 0.5;
    if (['LM', 'RM'].includes(player.position)) formationFit = -0.1;
  }

  // Style match
  let styleFit = 0;
  if (team.style === 'possession' && player.passCompletionRate > 0.85) styleFit = 0.6;
  if (team.style === 'counter' && player.sprintCapacity > 25) styleFit = 0.6;
  if (team.style === 'pressing' && player.defensiveWorkRate > 0.7) styleFit = 0.6;
  if (team.style === 'possession' && player.passCompletionRate < 0.75) styleFit = -0.4;
  if (team.style === 'pressing' && player.defensiveWorkRate < 0.4) styleFit = -0.5;

  const score = (positionFit + formationFit + styleFit) / 3;

  return {
    name: 'System Fit',
    score,
    weight: 0.25,
    explanation: `Position need: ${posNeed <= 1 ? 'HIGH' : posNeed <= 2 ? 'moderate' : 'low'}. ` +
      `Formation match: ${formationFit > 0 ? 'good' : formationFit < 0 ? 'poor' : 'neutral'}. ` +
      `Style match: ${styleFit > 0.3 ? 'strong' : styleFit < -0.2 ? 'poor' : 'average'}.`
  };
}

function evaluateStructuralImpact(
  player: ScoutProfile,
  team: TeamContext
): ValuationFactor {
  // Would this player improve or hurt the team's structural metrics?

  // Defensive impact: if the team's weak zone matches the player's position
  let defensiveImpact = 0;
  const playsOnLeft = player.avgY < -10;
  const playsOnRight = player.avgY > 10;
  const playsCenter = !playsOnLeft && !playsOnRight;
  if (team.weakestZone === 'left' && playsOnLeft) defensiveImpact = 0.7;
  if (team.weakestZone === 'right' && playsOnRight) defensiveImpact = 0.7;
  if (team.weakestZone.includes('center') && playsCenter) defensiveImpact = 0.5;

  // Network impact: would they increase or decrease passing connectivity?
  const connectivityDelta = (player.currentConnections - team.avgPlayerConnections) / team.avgPlayerConnections;
  const networkImpact = Math.max(-0.8, Math.min(0.8, connectivityDelta));

  // MinCut contribution: high defensive work rate improves defensive structure
  const mincutImpact = player.defensiveWorkRate > 0.6 && team.avgMincut < 0.4
    ? 0.6 : player.defensiveWorkRate < 0.3 && team.avgMincut < 0.4
    ? -0.3 : 0.1;

  const score = (defensiveImpact * 0.4 + networkImpact * 0.3 + mincutImpact * 0.3);

  return {
    name: 'Structural Impact',
    score,
    weight: 0.25,
    explanation: `Defensive gap fill: ${defensiveImpact > 0.3 ? 'YES — addresses ' + team.weakestZone + ' vulnerability' : 'no direct gap fill'}. ` +
      `Network effect: ${networkImpact > 0.2 ? 'improves connectivity' : networkImpact < -0.2 ? 'reduces connectivity' : 'neutral'}. ` +
      `MinCut contribution: ${mincutImpact > 0.3 ? 'strengthens defense' : 'limited impact'}.`
  };
}

function evaluateChemistry(
  player: ScoutProfile,
  team: TeamContext
): ValuationFactor {
  // Predict chemistry with existing players based on playing profiles

  // Players with similar passing profiles pair well
  const centralityMatch = 1 - Math.abs(player.currentPageRank - team.avgPlayerCentrality) /
    Math.max(team.avgPlayerCentrality, 0.01);

  // If the team has a hub, does this player complement them?
  let hubComplementarity = 0;
  if (team.hubDependency > 0.5) {
    // Team is hub-dependent. A player who connects well reduces single-point-of-failure
    if (player.currentConnections > team.avgPlayerConnections * 1.2) {
      hubComplementarity = 0.6; // creates an alternative hub
    } else {
      hubComplementarity = -0.2; // increases hub dependency
    }
  }

  // Position-based chemistry prediction
  let positionChemistry = 0;
  // Wingers pair with fullbacks, strikers pair with midfielders, etc.
  const complementaryPositions: Record<string, string[]> = {
    'LW': ['LB', 'CM'], 'RW': ['RB', 'CM'], 'ST': ['CM', 'CAM', 'LW', 'RW'],
    'CM': ['CB', 'ST', 'LW', 'RW'], 'CDM': ['CB', 'CM'], 'CAM': ['ST', 'CM'],
    'LB': ['LW', 'CM'], 'RB': ['RW', 'CM'], 'CB': ['CDM', 'CM', 'CB'],
  };
  const complements = complementaryPositions[player.position] ?? [];
  const hasComplement = complements.some(pos =>
    (team.positionDepth.get(pos) ?? 0) >= 1
  );
  if (hasComplement) positionChemistry = 0.4;

  const score = (centralityMatch * 0.3 + hubComplementarity * 0.4 + positionChemistry * 0.3);

  return {
    name: 'Chemistry Prediction',
    score,
    weight: 0.20,
    explanation: `Centrality match: ${centralityMatch > 0.6 ? 'good' : 'weak'}. ` +
      `Hub complementarity: ${hubComplementarity > 0.3 ? 'creates alternative hub (reduces dependency)' :
        hubComplementarity < -0.1 ? 'increases hub dependency risk' : 'neutral'}. ` +
      `Position chemistry: ${positionChemistry > 0 ? 'complementary positions exist in squad' : 'limited natural pairings'}.`
  };
}

function evaluateRedundancy(
  player: ScoutProfile,
  team: TeamContext
): ValuationFactor {
  const depth = team.positionDepth.get(player.position) ?? 0;

  let score: number;
  let explanation: string;

  if (depth === 0) {
    score = 0.9;
    explanation = `NO current cover at ${player.position}. Critical gap — premium justified.`;
  } else if (depth === 1) {
    score = 0.5;
    explanation = `Only 1 player at ${player.position}. Low depth — good value add.`;
  } else if (depth === 2) {
    score = 0;
    explanation = `2 players already at ${player.position}. Adequate depth — no urgency.`;
  } else {
    score = -0.6;
    explanation = `${depth} players already at ${player.position}. Redundant — avoid overpaying.`;
  }

  return {
    name: 'Redundancy',
    score,
    weight: 0.15,
    explanation
  };
}

function evaluateDependencyRisk(
  player: ScoutProfile,
  team: TeamContext
): ValuationFactor {
  // Would signing this player create unhealthy dependency?

  let score = 0;
  let explanation = '';

  if (player.currentPageRank > team.avgPlayerCentrality * 2) {
    // This player would become the new hub
    if (team.hubDependency > 0.5) {
      score = -0.4;
      explanation = `Player would become new network hub, replacing existing dependency. ` +
        `If injured/suspended, team structure collapses. Consider the risk.`;
    } else {
      score = 0.3;
      explanation = `Player would become a network hub. Team currently has distributed structure — ` +
        `this could be positive if managed well.`;
    }
  } else {
    score = 0.2;
    explanation = `Player integrates without creating excessive dependency. Healthy addition.`;
  }

  // Age factor
  if (player.age > 30 && player.contractYearsLeft <= 2) {
    score -= 0.3;
    explanation += ` Age ${player.age} with ${player.contractYearsLeft} years left — limited structural investment period.`;
  } else if (player.age < 24) {
    score += 0.2;
    explanation += ` Age ${player.age} — long development horizon. Value grows over time.`;
  }

  return {
    name: 'Dependency Risk',
    score,
    weight: 0.15,
    explanation
  };
}

// ─── Main Valuation Engine ───────────────────────────────────

function computeContextValuation(
  player: ScoutProfile,
  team: TeamContext
): ContextValuation {
  const factors = [
    evaluateSystemFit(player, team),
    evaluateStructuralImpact(player, team),
    evaluateChemistry(player, team),
    evaluateRedundancy(player, team),
    evaluateDependencyRisk(player, team),
  ];

  // Weighted sum: -1 to +1 → multiplier range
  const weightedScore = factors.reduce((s, f) => s + f.score * f.weight, 0);
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const normalizedScore = weightedScore / totalWeight;

  // Convert to multiplier: -1 → 0.3x, 0 → 1.0x, +1 → 2.5x
  // Using exponential curve for natural feel
  const multiplier = Math.exp(normalizedScore * 0.9);
  const contextValue = Math.round(player.marketValue * multiplier * 10) / 10;

  // Verdict
  let verdict: 'underpay' | 'fair' | 'overpay' | 'avoid';
  if (multiplier > 1.3) verdict = 'underpay';      // worth MORE than market → buying at market is a bargain
  else if (multiplier > 0.85) verdict = 'fair';
  else if (multiplier > 0.5) verdict = 'overpay';
  else verdict = 'avoid';

  // Generate summary
  const topPositive = factors.filter(f => f.score > 0.2).sort((a, b) => b.score * b.weight - a.score * a.weight);
  const topNegative = factors.filter(f => f.score < -0.2).sort((a, b) => a.score * a.weight - b.score * b.weight);

  let summary = '';
  if (verdict === 'underpay') {
    summary = `${player.name} is worth MORE to ${team.name} than the market price. `;
    if (topPositive.length > 0) summary += `Key driver: ${topPositive[0].name.toLowerCase()}. `;
    summary += `At €${player.marketValue}M market value, this is a bargain for your system.`;
  } else if (verdict === 'fair') {
    summary = `${player.name} is a fair buy for ${team.name} at market price. `;
    summary += `They fit the system without being transformative.`;
  } else if (verdict === 'overpay') {
    summary = `${player.name} at €${player.marketValue}M would be an OVERPAY for ${team.name}. `;
    if (topNegative.length > 0) summary += `Main concern: ${topNegative[0].name.toLowerCase()}. `;
    summary += `Context-adjusted value is €${contextValue}M.`;
  } else {
    summary = `AVOID: ${player.name} is a poor fit for ${team.name}'s system. `;
    if (topNegative.length > 0) summary += `${topNegative[0].explanation}`;
  }

  // Recommendation
  let recommendation = '';
  if (verdict === 'underpay') {
    recommendation = `BUY — and move fast. Other teams running this analysis will see the same fit premium. ` +
      `Offer up to €${Math.round(contextValue)}M and you're still getting value.`;
  } else if (verdict === 'fair') {
    recommendation = `BUY if the price is right. Don't overpay, but don't lose them over €${Math.round(contextValue * 0.1)}M either.`;
  } else if (verdict === 'overpay') {
    recommendation = `NEGOTIATE DOWN. Your max offer should be €${Math.round(contextValue)}M. ` +
      `Above that, the structural value doesn't justify the spend.`;
  } else {
    recommendation = `PASS. The money is better spent addressing your ${team.weakestZone} defensive vulnerability ` +
      `or strengthening existing partnerships.`;
  }

  return {
    team: team.name,
    player: player.name,
    marketValue: player.marketValue,
    contextValue,
    multiplier,
    verdict,
    factors,
    summary,
    recommendation,
  };
}

// ─── Demo: Multiple Teams Evaluating Same Player ─────────────

function createDemoProfiles(): ScoutProfile[] {
  return [
    {
      name: 'Marcus Torres', age: 24, position: 'CM',
      marketValue: 45, contractYearsLeft: 4,
      avgX: -5, avgY: -8, passCompletionRate: 0.88,
      avgPassDistance: 18, defensiveWorkRate: 0.72,
      sprintCapacity: 28, avgSpeed: 5.2,
      currentPageRank: 0.32, currentConnections: 9.5, currentPassWeight: 0.38,
    },
    {
      name: 'Kai Eriksson', age: 22, position: 'LW',
      marketValue: 35, contractYearsLeft: 3,
      avgX: 28, avgY: -22, passCompletionRate: 0.76,
      avgPassDistance: 14, defensiveWorkRate: 0.35,
      sprintCapacity: 35, avgSpeed: 6.1,
      currentPageRank: 0.18, currentConnections: 5.2, currentPassWeight: 0.24,
    },
    {
      name: 'Diego Vasquez', age: 29, position: 'CB',
      marketValue: 25, contractYearsLeft: 2,
      avgX: -35, avgY: 6, passCompletionRate: 0.82,
      avgPassDistance: 22, defensiveWorkRate: 0.85,
      sprintCapacity: 15, avgSpeed: 4.3,
      currentPageRank: 0.22, currentConnections: 7.8, currentPassWeight: 0.31,
    },
  ];
}

function createDemoTeams(): TeamContext[] {
  return [
    {
      name: 'Manchester City',
      budget: 150,
      formation: '4-3-3',
      style: 'possession',
      avgMincut: 0.72, networkDensity: 0.85, weakestZone: 'center-right',
      hubPlayer: '8', hubDependency: 0.65, pressEfficiency: 0.48,
      positionDepth: new Map([
        ['GK', 3], ['CB', 4], ['LB', 2], ['RB', 2],
        ['CM', 3], ['CDM', 2], ['CAM', 1],
        ['LW', 2], ['RW', 2], ['ST', 2],
      ]),
      playerCentralities: new Map(),
      avgPlayerCentrality: 0.28, avgPlayerConnections: 8.5,
    },
    {
      name: 'Atletico Madrid',
      budget: 80,
      formation: '4-4-2',
      style: 'pressing',
      avgMincut: 0.58, networkDensity: 0.62, weakestZone: 'left',
      hubPlayer: '6', hubDependency: 0.45, pressEfficiency: 0.52,
      positionDepth: new Map([
        ['GK', 2], ['CB', 4], ['LB', 2], ['RB', 2],
        ['CM', 2], ['CDM', 1], ['LM', 1], ['RM', 2],
        ['ST', 3],
      ]),
      playerCentralities: new Map(),
      avgPlayerCentrality: 0.22, avgPlayerConnections: 6.8,
    },
    {
      name: 'Brighton',
      budget: 60,
      formation: '4-2-3-1',
      style: 'balanced',
      avgMincut: 0.45, networkDensity: 0.71, weakestZone: 'center-left',
      hubPlayer: '10', hubDependency: 0.55, pressEfficiency: 0.38,
      positionDepth: new Map([
        ['GK', 2], ['CB', 3], ['LB', 2], ['RB', 1],
        ['CM', 2], ['CDM', 1], ['CAM', 1],
        ['LW', 1], ['RW', 1], ['ST', 2],
      ]),
      playerCentralities: new Map(),
      avgPlayerCentrality: 0.24, avgPlayerConnections: 7.2,
    },
    {
      name: 'Napoli',
      budget: 70,
      formation: '4-3-3',
      style: 'counter',
      avgMincut: 0.52, networkDensity: 0.68, weakestZone: 'right',
      hubPlayer: '7', hubDependency: 0.70, pressEfficiency: 0.35,
      positionDepth: new Map([
        ['GK', 2], ['CB', 3], ['LB', 1], ['RB', 2],
        ['CM', 3], ['CDM', 1],
        ['LW', 2], ['RW', 1], ['ST', 2],
      ]),
      playerCentralities: new Map(),
      avgPlayerCentrality: 0.20, avgPlayerConnections: 6.2,
    },
  ];
}

// ─── Output ──────────────────────────────────────────────────

function header(text: string) {
  console.log('\n' + '═'.repeat(72));
  console.log(`  ${text}`);
  console.log('═'.repeat(72));
}

function sub(text: string) {
  console.log(`\n── ${text} ${'─'.repeat(Math.max(0, 66 - text.length))}`);
}

function printValuation(v: ContextValuation) {
  const verdictColors: Record<string, string> = {
    underpay: '★ BARGAIN', fair: '● FAIR VALUE', overpay: '▼ OVERPAY', avoid: '✗ AVOID',
  };

  console.log(`\n  ┌${'─'.repeat(68)}┐`);
  console.log(`  │  ${v.player.padEnd(25)} → ${v.team.padEnd(25)}  ${verdictColors[v.verdict].padStart(12)} │`);
  console.log(`  ├${'─'.repeat(68)}┤`);
  console.log(`  │  Market Value:  €${String(v.marketValue + 'M').padEnd(10)}  Context Value:  €${String(v.contextValue + 'M').padEnd(10)}  (${v.multiplier.toFixed(2)}x)    │`);
  console.log(`  └${'─'.repeat(68)}┘`);

  // Factor breakdown
  for (const f of v.factors) {
    const bar = f.score > 0
      ? ' '.repeat(15) + '█'.repeat(Math.round(f.score * 15))
      : '█'.repeat(Math.round(Math.abs(f.score) * 15)).padStart(15) + ' '.repeat(15);
    const scoreStr = f.score > 0 ? '+' + f.score.toFixed(2) : f.score.toFixed(2);
    console.log(`    ${f.name.padEnd(22)} [${bar}] ${scoreStr.padStart(6)}  (w=${f.weight})`);
    console.log(`      ${f.explanation}`);
  }

  console.log(`\n    Summary: ${v.summary}`);
  console.log(`\n    Recommendation: ${v.recommendation}`);
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  header('PITCHINTEL TRANSFER INTELLIGENCE');
  console.log('  Context-adjusted player valuations powered by graph theory');
  console.log('  "What is this player worth to THIS team?"');

  const players = createDemoProfiles();
  const teams = createDemoTeams();

  for (const player of players) {
    header(`PLAYER: ${player.name.toUpperCase()} (${player.position}, age ${player.age}) — Market Value €${player.marketValue}M`);
    console.log(`  Pass completion: ${(player.passCompletionRate * 100).toFixed(0)}% | Defensive work rate: ${(player.defensiveWorkRate * 100).toFixed(0)}% | Sprint capacity: ${player.sprintCapacity}/90`);
    console.log(`  PageRank: ${player.currentPageRank} | Connections: ${player.currentConnections} | Pass weight: ${player.currentPassWeight}`);

    sub('VALUATIONS BY TEAM');

    const valuations: ContextValuation[] = [];
    for (const team of teams) {
      const v = computeContextValuation(player, team);
      valuations.push(v);
      printValuation(v);
    }

    // Comparison table
    sub('COMPARISON TABLE');
    console.log('  ' + 'Team'.padEnd(22) + 'Market'.padStart(10) + 'Context'.padStart(10) + 'Mult'.padStart(8) + '  Verdict');
    console.log('  ' + '-'.repeat(60));
    for (const v of valuations.sort((a, b) => b.multiplier - a.multiplier)) {
      console.log(`  ${v.team.padEnd(22)} €${(v.marketValue + 'M').padStart(7)}  €${(v.contextValue + 'M').padStart(7)}  ${v.multiplier.toFixed(2).padStart(6)}  ${v.verdict.toUpperCase()}`);
    }

    // Best fit
    const best = valuations.sort((a, b) => b.multiplier - a.multiplier)[0];
    const worst = valuations.sort((a, b) => a.multiplier - b.multiplier)[0];
    console.log(`\n  BEST FIT:  ${best.team} (${best.multiplier.toFixed(2)}x → €${best.contextValue}M context value)`);
    console.log(`  WORST FIT: ${worst.team} (${worst.multiplier.toFixed(2)}x → €${worst.contextValue}M context value)`);
    console.log(`  SPREAD:    €${(best.contextValue - worst.contextValue).toFixed(1)}M difference for the SAME player`);
  }

  // ── Market Intelligence Summary ───────────────────────────

  header('MARKET INTELLIGENCE SUMMARY');
  console.log('\n  Key insight: identical players have wildly different values');
  console.log('  depending on team context. The transfer market is inefficient');
  console.log('  because everyone uses a single number.\n');

  console.log('  What PitchIntel Transfer Intelligence replaces:');
  console.log('  ┌────────────────────────────────────────────────────────────┐');
  console.log('  │  BEFORE: "Marcus Torres is worth €45M" (TransferMarkt)    │');
  console.log('  │                                                            │');
  console.log('  │  AFTER:  "Marcus Torres is worth..."                       │');

  const torres = players[0];
  for (const team of teams) {
    const v = computeContextValuation(torres, team);
    console.log(`  │    €${String(v.contextValue + 'M').padEnd(7)} to ${team.name.padEnd(20)} (${v.verdict})${' '.repeat(14 - v.verdict.length)}│`);
  }
  console.log('  │                                                            │');
  console.log('  │  Same player. Different value. Because context matters.    │');
  console.log('  └────────────────────────────────────────────────────────────┘');
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1) });
