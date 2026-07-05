/**
 * PitchIntel Gem Scanner
 *
 * The engine that finds hidden value in the transfer market.
 *
 * Runs every player through every team's context valuation and identifies:
 *   - BARGAINS: players worth significantly more to a specific team than market price
 *   - OVERPAYS: players worth significantly less to a specific team than market price
 *   - PERFECT FITS: highest multiplier player for each team+position combination
 *
 * At ~80 players × ~30 teams = 2,400 valuations, runs in <1 second.
 *
 * Usage: npx tsx src/pitch-intel/gem-scanner.ts
 */

import type { ScoutProfile } from './data/players-db.js';
import type { TeamContext } from './data/teams-db.js';

// ─── Import the valuation factors (inlined from transfer-intel) ──

interface ValuationFactor {
  name: string;
  score: number;
  weight: number;
  explanation: string;
}

interface ContextValuation {
  team: string;
  player: string;
  position: string;
  club: string;
  league: string;
  age: number;
  marketValue: number;
  contextValue: number;
  multiplier: number;
  verdict: 'bargain' | 'fair' | 'overpay' | 'avoid';
  topFactor: string;
  topFactorScore: number;
  factors: ValuationFactor[];
}

interface GemResult {
  player: ScoutProfile;
  team: TeamContext;
  valuation: ContextValuation;
}

// ─── Valuation Factors ───────────────────────────────────────

function evalSystemFit(p: ScoutProfile, t: TeamContext): ValuationFactor {
  const posNeed = t.positionDepth.get(p.position) ?? 0;
  const posFit = posNeed === 0 ? 0.9 : posNeed === 1 ? 0.5 : posNeed === 2 ? 0 : -0.4;

  let formFit = 0;
  const f = t.formation;
  if (f.includes('4-3-3')) {
    if (['CM', 'CDM', 'LW', 'RW', 'ST'].includes(p.position)) formFit = 0.4;
    if (['LM', 'RM'].includes(p.position)) formFit = -0.1;
    if (['CAM'].includes(p.position)) formFit = 0.1;
  } else if (f.includes('4-4-2')) {
    if (['CM', 'LM', 'RM', 'ST'].includes(p.position)) formFit = 0.4;
    if (['CAM', 'CDM'].includes(p.position)) formFit = -0.1;
    if (['LW', 'RW'].includes(p.position)) formFit = 0.2;
  } else if (f.includes('3-5-2') || f.includes('3-4-3')) {
    if (['CB', 'CM', 'LM', 'RM', 'ST'].includes(p.position)) formFit = 0.4;
    if (['LB', 'RB'].includes(p.position)) formFit = -0.2;
  } else if (f.includes('4-2-3-1')) {
    if (['CDM', 'CAM', 'LW', 'RW', 'ST'].includes(p.position)) formFit = 0.4;
    if (['CM'].includes(p.position)) formFit = 0.2;
  }

  let styleFit = 0;
  if (t.style === 'possession' && p.passCompletionRate > 0.85) styleFit = 0.5;
  if (t.style === 'possession' && p.passCompletionRate < 0.78) styleFit = -0.3;
  if (t.style === 'counter' && p.sprintCapacity > 25) styleFit = 0.5;
  if (t.style === 'counter' && p.sprintCapacity < 15) styleFit = -0.3;
  if (t.style === 'pressing' && p.defensiveWorkRate > 0.65) styleFit = 0.5;
  if (t.style === 'pressing' && p.defensiveWorkRate < 0.4) styleFit = -0.4;
  if (t.style === 'balanced') styleFit = 0.1;

  const score = (posFit * 0.4 + formFit * 0.3 + styleFit * 0.3);
  return {
    name: 'System Fit',
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.25,
    explanation: `Position need: ${posNeed === 0 ? 'CRITICAL' : posNeed === 1 ? 'high' : posNeed === 2 ? 'adequate' : 'saturated'}. ` +
      `Formation: ${formFit > 0 ? 'compatible' : formFit < 0 ? 'awkward' : 'neutral'}. Style: ${styleFit > 0.2 ? 'strong match' : styleFit < -0.2 ? 'mismatch' : 'acceptable'}.`
  };
}

function evalStructuralImpact(p: ScoutProfile, t: TeamContext): ValuationFactor {
  let defImpact = 0;
  const playsLeft = p.avgY < -10;
  const playsRight = p.avgY > 10;
  if (t.weakestZone.includes('left') && playsLeft) defImpact = 0.7;
  else if (t.weakestZone.includes('right') && playsRight) defImpact = 0.7;
  else if (t.weakestZone.includes('center') && !playsLeft && !playsRight) defImpact = 0.4;

  const connDelta = (p.currentConnections - t.avgPlayerConnections) / Math.max(t.avgPlayerConnections, 1);
  const netImpact = Math.max(-0.6, Math.min(0.6, connDelta * 0.8));

  const mcImpact = (p.defensiveWorkRate > 0.6 && t.avgMincut < 0.5) ? 0.5 :
    (p.defensiveWorkRate < 0.3 && t.avgMincut < 0.4) ? -0.2 : 0.1;

  const score = defImpact * 0.4 + netImpact * 0.3 + mcImpact * 0.3;
  return {
    name: 'Structural Impact',
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.25,
    explanation: `Defense: ${defImpact > 0.3 ? 'fills ' + t.weakestZone + ' gap' : 'no gap fill'}. ` +
      `Network: ${netImpact > 0.15 ? 'boosts connectivity' : netImpact < -0.15 ? 'lowers connectivity' : 'neutral'}. ` +
      `MinCut: ${mcImpact > 0.3 ? 'strengthens' : 'limited'}.`
  };
}

function evalChemistry(p: ScoutProfile, t: TeamContext): ValuationFactor {
  const centMatch = 1 - Math.abs(p.currentPageRank - t.avgPlayerCentrality) / Math.max(t.avgPlayerCentrality, 0.01);

  let hubComp = 0;
  if (t.hubDependency > 0.5) {
    hubComp = p.currentConnections > t.avgPlayerConnections * 1.2 ? 0.6 : -0.15;
  }

  const complementary: Record<string, string[]> = {
    'LW': ['LB', 'CM'], 'RW': ['RB', 'CM'], 'ST': ['CM', 'CAM', 'LW', 'RW'],
    'CM': ['CB', 'ST', 'LW', 'RW', 'CDM'], 'CDM': ['CB', 'CM'], 'CAM': ['ST', 'CM'],
    'LB': ['LW', 'CM', 'CB'], 'RB': ['RW', 'CM', 'CB'], 'CB': ['CDM', 'CM', 'CB'],
    'LM': ['LB', 'CM', 'ST'], 'RM': ['RB', 'CM', 'ST'],
  };
  const hasComp = (complementary[p.position] ?? []).some(pos => (t.positionDepth.get(pos) ?? 0) >= 1);
  const posComp = hasComp ? 0.3 : 0;

  const score = centMatch * 0.3 + hubComp * 0.4 + posComp * 0.3;
  return {
    name: 'Chemistry',
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.20,
    explanation: `Centrality match: ${centMatch > 0.6 ? 'good' : 'moderate'}. ` +
      `Hub effect: ${hubComp > 0.3 ? 'reduces hub dependency' : hubComp < -0.1 ? 'increases dependency' : 'neutral'}. ` +
      `Pairings: ${hasComp ? 'complementary positions exist' : 'limited'}.`
  };
}

function evalRedundancy(p: ScoutProfile, t: TeamContext): ValuationFactor {
  const depth = t.positionDepth.get(p.position) ?? 0;
  const score = depth === 0 ? 0.9 : depth === 1 ? 0.5 : depth === 2 ? -0.1 : depth === 3 ? -0.5 : -0.7;
  return {
    name: 'Redundancy',
    score,
    weight: 0.15,
    explanation: `${depth} players at ${p.position}. ${depth === 0 ? 'CRITICAL GAP' : depth === 1 ? 'Low depth' : depth === 2 ? 'Adequate' : 'Saturated'}.`
  };
}

function evalRisk(p: ScoutProfile, t: TeamContext): ValuationFactor {
  let score = 0;
  let expl = '';

  if (p.currentPageRank > t.avgPlayerCentrality * 1.8) {
    if (t.hubDependency > 0.5) {
      score = -0.3;
      expl = 'Would become new single point of failure. ';
    } else {
      score = 0.2;
      expl = 'Could become positive hub in distributed system. ';
    }
  } else {
    score = 0.15;
    expl = 'Integrates without excessive dependency. ';
  }

  if (p.age >= 30 && p.contractYearsLeft <= 2) {
    score -= 0.35;
    expl += `Age ${p.age}, ${p.contractYearsLeft}yr contract — limited window.`;
  } else if (p.age >= 28) {
    score -= 0.1;
    expl += `Age ${p.age} — peak but declining horizon.`;
  } else if (p.age <= 23) {
    score += 0.25;
    expl += `Age ${p.age} — significant development upside.`;
  } else {
    expl += `Age ${p.age} — prime years.`;
  }

  // Same league transfer premium (harder to buy from rivals)
  if (p.league === t.league) {
    score -= 0.1;
    expl += ' Same-league premium applies.';
  }

  return {
    name: 'Risk & Upside',
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.15,
    explanation: expl
  };
}

// ─── Core Valuation ──────────────────────────────────────────

function computeValuation(p: ScoutProfile, t: TeamContext): ContextValuation {
  // Skip if player is already at this club
  if (p.club === t.name) {
    return {
      team: t.name, player: p.name, position: p.position,
      club: p.club, league: p.league, age: p.age,
      marketValue: p.marketValue, contextValue: p.marketValue,
      multiplier: 1.0, verdict: 'fair', topFactor: 'Current club', topFactorScore: 0,
      factors: []
    };
  }

  const factors = [
    evalSystemFit(p, t),
    evalStructuralImpact(p, t),
    evalChemistry(p, t),
    evalRedundancy(p, t),
    evalRisk(p, t),
  ];

  const weightedScore = factors.reduce((s, f) => s + f.score * f.weight, 0);
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const norm = weightedScore / totalWeight;
  const multiplier = Math.round(Math.exp(norm * 0.92) * 100) / 100;
  const contextValue = Math.round(p.marketValue * multiplier * 10) / 10;

  const verdict: ContextValuation['verdict'] =
    multiplier > 1.3 ? 'bargain' : multiplier > 0.85 ? 'fair' : multiplier > 0.55 ? 'overpay' : 'avoid';

  const topF = [...factors].sort((a, b) => Math.abs(b.score * b.weight) - Math.abs(a.score * a.weight))[0];

  return {
    team: t.name, player: p.name, position: p.position,
    club: p.club, league: p.league, age: p.age,
    marketValue: p.marketValue, contextValue, multiplier, verdict,
    topFactor: topF.name, topFactorScore: topF.score,
    factors,
  };
}

// ─── Gem Scanner ─────────────────────────────────────────────

export interface TeamGems {
  team: string;
  league: string;
  bargains: ContextValuation[];   // sorted by multiplier desc
  overpays: ContextValuation[];   // sorted by multiplier asc
  bestByPosition: Map<string, ContextValuation>; // position -> best fit player
}

export function scanGems(
  players: ScoutProfile[],
  teams: TeamContext[],
  minMultiplier: number = 1.2,
  maxMultiplier: number = 0.75
): { byTeam: Map<string, TeamGems>; allValuations: ContextValuation[]; topGems: ContextValuation[] } {
  const allValuations: ContextValuation[] = [];
  const byTeam = new Map<string, TeamGems>();

  for (const team of teams) {
    const gems: TeamGems = {
      team: team.name,
      league: team.league,
      bargains: [],
      overpays: [],
      bestByPosition: new Map()
    };

    for (const player of players) {
      const v = computeValuation(player, team);
      if (player.club === team.name) continue; // skip own players

      allValuations.push(v);

      if (v.multiplier >= minMultiplier) gems.bargains.push(v);
      if (v.multiplier <= maxMultiplier) gems.overpays.push(v);

      // Track best by position
      const existing = gems.bestByPosition.get(player.position);
      if (!existing || v.multiplier > existing.multiplier) {
        gems.bestByPosition.set(player.position, v);
      }
    }

    gems.bargains.sort((a, b) => b.multiplier - a.multiplier);
    gems.overpays.sort((a, b) => a.multiplier - b.multiplier);
    byTeam.set(team.name, gems);
  }

  const topGems = allValuations
    .filter(v => v.multiplier >= minMultiplier)
    .sort((a, b) => b.multiplier - a.multiplier);

  return { byTeam, allValuations, topGems };
}

// ─── Report Output ───────────────────────────────────────────

function hdr(t: string) { console.log('\n' + '═'.repeat(72) + '\n  ' + t + '\n' + '═'.repeat(72)); }
function sub(t: string) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 66 - t.length))); }

export function printGemReport(
  result: ReturnType<typeof scanGems>,
  teams: TeamContext[]
) {
  hdr('PITCHINTEL GEM SCANNER — TRANSFER MARKET INTELLIGENCE');
  console.log(`  ${result.allValuations.length} valuations computed`);
  console.log(`  ${result.topGems.length} bargains found (>1.2x multiplier)`);

  // ── Global Top 20 Gems ──────────────────────────────────

  sub('TOP 20 HIDDEN GEMS — Biggest Value Gaps in World Football');
  console.log('  ' + 'Player'.padEnd(22) + 'Pos'.padEnd(5) + 'Age'.padEnd(5) +
    'Club'.padEnd(18) + '→ Team'.padEnd(20) + 'Market'.padStart(8) +
    'Context'.padStart(9) + 'Multi'.padStart(7) + '  Key Factor');
  console.log('  ' + '-'.repeat(100));

  for (const g of result.topGems.slice(0, 20)) {
    console.log('  ' +
      g.player.padEnd(22) + g.position.padEnd(5) + String(g.age).padEnd(5) +
      g.club.padEnd(18) + ('→ ' + g.team).padEnd(20) +
      ('€' + g.marketValue + 'M').padStart(8) +
      ('€' + g.contextValue + 'M').padStart(9) +
      (g.multiplier.toFixed(2) + 'x').padStart(7) +
      '  ' + g.topFactor + (g.topFactorScore > 0 ? ' ↑' : ' ↓')
    );
  }

  // ── Per-Team Gems (top 5 teams) ─────────────────────────

  const teamsWithGems = [...result.byTeam.entries()]
    .filter(([, g]) => g.bargains.length > 0)
    .sort((a, b) => {
      const aTop = a[1].bargains[0]?.multiplier ?? 0;
      const bTop = b[1].bargains[0]?.multiplier ?? 0;
      return bTop - aTop;
    });

  for (const [teamName, gems] of teamsWithGems.slice(0, 8)) {
    sub(`${teamName} — ${gems.bargains.length} Bargains Found`);

    // Free tier: show top 3
    for (let i = 0; i < Math.min(3, gems.bargains.length); i++) {
      const g = gems.bargains[i];
      const freeLabel = i === 0 ? '' : ' [PRO]';
      console.log(`\n  ${i + 1}. ${g.player} (${g.position}, ${g.age}) — ${g.club}${freeLabel}`);
      console.log(`     Market: €${g.marketValue}M → Context for ${teamName}: €${g.contextValue}M (${g.multiplier.toFixed(2)}x)`);
      console.log(`     ${g.factors.map(f => f.explanation).join(' ')}`);
    }
    if (gems.bargains.length > 3) {
      console.log(`\n  ... and ${gems.bargains.length - 3} more bargains [PRO tier]`);
    }

    // Best by position
    if (gems.bestByPosition.size > 0) {
      console.log('\n  Best fit by position:');
      const sorted = [...gems.bestByPosition.entries()].sort((a, b) => b[1].multiplier - a[1].multiplier);
      for (const [pos, v] of sorted.slice(0, 5)) {
        if (v.multiplier > 1.1) {
          console.log(`    ${pos.padEnd(4)} → ${v.player} (${v.multiplier.toFixed(2)}x, €${v.contextValue}M)`);
        }
      }
    }
  }

  // ── Substack Content Snippets ───────────────────────────

  sub('AUTO-GENERATED CONTENT (ready for Substack/social)');

  // Headline gem
  const headline = result.topGems[0];
  if (headline) {
    console.log('\n  HEADLINE:');
    console.log(`  "${headline.player} is worth €${headline.contextValue}M to ${headline.team},`);
    console.log(`   but the market says €${headline.marketValue}M. Here's why."`);
  }

  // Contrarian take
  const worstFit = [...result.allValuations]
    .filter(v => v.marketValue > 30 && v.multiplier < 0.7)
    .sort((a, b) => a.multiplier - b.multiplier)[0];
  if (worstFit) {
    console.log('\n  CONTRARIAN:');
    console.log(`  "${worstFit.team} should NOT buy ${worstFit.player} at any price.`);
    console.log(`   Market says €${worstFit.marketValue}M, but he's only worth €${worstFit.contextValue}M`);
    console.log(`   to them. ${worstFit.factors[0]?.explanation ?? ''}"`);
  }

  // Share card format
  console.log('\n  SHARE CARD FORMAT:');
  for (const g of result.topGems.slice(0, 3)) {
    console.log(`  ┌${'─'.repeat(50)}┐`);
    console.log(`  │ ${g.player.padEnd(30)} ${g.position.padEnd(4)} ${('€' + g.marketValue + 'M').padStart(12)} │`);
    console.log(`  │ → ${g.team.padEnd(27)} ${'= €' + g.contextValue + 'M (' + g.multiplier.toFixed(2) + 'x)'.padStart(17)} │`);
    console.log(`  │ ${'★ ' + g.topFactor.padEnd(47)} │`);
    console.log(`  └${'─'.repeat(50)}┘`);
  }

  // ── Summary Stats ───────────────────────────────────────

  sub('MARKET EFFICIENCY REPORT');
  const avgMult = result.allValuations.reduce((s, v) => s + v.multiplier, 0) / result.allValuations.length;
  const bargains = result.allValuations.filter(v => v.multiplier > 1.2).length;
  const overpays = result.allValuations.filter(v => v.multiplier < 0.8).length;
  const fair = result.allValuations.filter(v => v.multiplier >= 0.8 && v.multiplier <= 1.2).length;

  console.log(`\n  Total player-team combinations evaluated: ${result.allValuations.length}`);
  console.log(`  Average multiplier: ${avgMult.toFixed(3)}x`);
  console.log(`  Bargains (>1.2x): ${bargains} (${(bargains / result.allValuations.length * 100).toFixed(1)}%)`);
  console.log(`  Fair value (0.8-1.2x): ${fair} (${(fair / result.allValuations.length * 100).toFixed(1)}%)`);
  console.log(`  Overpays (<0.8x): ${overpays} (${(overpays / result.allValuations.length * 100).toFixed(1)}%)`);
  console.log(`\n  The transfer market is ${(bargains + overpays) / result.allValuations.length * 100 > 30 ? 'HIGHLY' : 'moderately'} inefficient when context is considered.`);
  console.log('');
}

// ─── Main (uses static databases until scrapers are ready) ───

async function main() {
  // Dynamic import to handle either real or placeholder databases
  let players: ScoutProfile[];
  let teams: TeamContext[];

  try {
    const pMod = await import('./data/players-db.js');
    players = pMod.getPlayerDatabase();
    const tMod = await import('./data/teams-db.js');
    teams = tMod.getTeamDatabase();
  } catch (e) {
    console.error('Database files not ready yet. Run the data builders first.');
    console.error(e);
    process.exit(1);
  }

  console.log(`Loaded ${players.length} players and ${teams.length} teams`);

  const start = Date.now();
  const result = scanGems(players, teams);
  const elapsed = Date.now() - start;

  console.log(`Gem scan complete: ${result.allValuations.length} valuations in ${elapsed}ms`);
  console.log(`Throughput: ${Math.round(result.allValuations.length / (elapsed / 1000))}/sec`);

  printGemReport(result, teams);
}

main().catch(e => { console.error(e); process.exit(1); });
