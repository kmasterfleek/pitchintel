/**
 * Profile Builder
 *
 * Converts raw scraped data into the ScoutProfile and TeamContext
 * formats used by the valuation engine.
 *
 * Key conversions (calibrated against StatsBomb open data):
 *   progressive_passes/90 -> estimated PageRank
 *   pass_completion x volume -> estimated pass_weight
 *   pressures/90 -> defensive_work_rate
 *   touch_zone_distribution -> avg_position (x, y)
 */

import type { ScoutProfile } from './players-db.js';
import type { TeamContext } from './teams-db.js';
import type { FBRefPlayerStats, FBRefTeamStats } from './fbref-scraper.js';

// ─── Position Classification ────────────────────────────────

/**
 * Normalized position buckets. FBRef positions can be multi-valued
 * (e.g., "MF,FW") so we pick the primary role.
 */
function normalizePosition(raw: string): string {
  const cleaned = raw.toUpperCase().trim();

  // Direct matches
  if (cleaned === 'GK') return 'GK';

  // FBRef shorthand: DF, MF, FW — plus specific roles
  if (cleaned.includes('CB') || cleaned === 'DF') return 'CB';
  if (cleaned.includes('LB') || cleaned.includes('DL')) return 'LB';
  if (cleaned.includes('RB') || cleaned.includes('DR')) return 'RB';
  if (cleaned.includes('DM') || cleaned.includes('CDM')) return 'CDM';
  if (cleaned.includes('CM') || cleaned === 'MF') return 'CM';
  if (cleaned.includes('AM') || cleaned.includes('CAM')) return 'CAM';
  if (cleaned.includes('LM') || cleaned.includes('LW')) return 'LW';
  if (cleaned.includes('RM') || cleaned.includes('RW')) return 'RW';
  if (cleaned.includes('FW') || cleaned.includes('ST') || cleaned.includes('CF')) return 'ST';

  // Multi-position fallback: use the first token
  const parts = cleaned.split(/[,\s/]+/);
  for (const part of parts) {
    if (['DF', 'CB'].includes(part)) return 'CB';
    if (['MF'].includes(part)) return 'CM';
    if (['FW'].includes(part)) return 'ST';
  }

  return 'CM'; // safe default
}

/**
 * Returns true if the position string indicates a left-sided player.
 */
function isLeftSide(position: string): boolean {
  return /L[BWM]|DL/i.test(position);
}

/**
 * Returns true if the position string indicates a right-sided player.
 */
function isRightSide(position: string): boolean {
  return /R[BWM]|DR/i.test(position);
}

// ─── Sprint & Speed Estimates by Position ───────────────────

const SPRINT_ESTIMATES: Record<string, number> = {
  GK: 5,  CB: 15, LB: 22, RB: 22,
  CDM: 18, CM: 22, CAM: 24,
  LW: 30, RW: 30, LM: 28, RM: 28,
  ST: 25,
};

const SPEED_ESTIMATES: Record<string, number> = {
  GK: 3.5, CB: 4.5, LB: 5.2, RB: 5.2,
  CDM: 4.8, CM: 5.2, CAM: 5.4,
  LW: 5.8, RW: 5.8, LM: 5.6, RM: 5.6,
  ST: 5.5,
};

// ─── FBRef -> ScoutProfile Conversion ───────────────────────

/**
 * Converts raw FBRef player stats into the ScoutProfile interface
 * used by the transfer valuation engine.
 *
 * Some fields require estimation because FBRef does not track GPS data
 * (sprint capacity, average speed). These are filled from position-based
 * priors calibrated against StatsBomb open data.
 *
 * @param raw - Player stats scraped from FBRef
 * @param marketValue - TransferMarkt market value in EUR millions
 * @param contractYears - Remaining contract years
 * @param extra - Additional metadata not available from FBRef:
 *   - club: player's club name
 *   - league: league name (e.g., 'Premier League')
 *   - nationality: player's nationality
 * @returns A ScoutProfile ready for the valuation engine
 */
function fbrefToScoutProfile(
  raw: FBRefPlayerStats,
  marketValue: number,
  contractYears: number,
  extra: { club?: string; league?: string; nationality?: string } = {},
): ScoutProfile {
  const position = normalizePosition(raw.position);

  // ── Pass completion rate (0-1) ──
  const passCompletionRate = raw.passCompletion / 100;

  // ── Defensive work rate (0-1) ──
  // Normalized composite: pressures carry base weight, tackles are weighted
  // higher since they represent direct ball-winning actions.
  const defensiveWorkRate = Math.min(1, (raw.pressures + raw.tackles * 2) / 30);

  // ── Sprint capacity and speed (from position priors) ──
  const sprintCapacity = SPRINT_ESTIMATES[position] ?? 22;
  const avgSpeed = SPEED_ESTIMATES[position] ?? 5.2;

  // ── PageRank estimate ──
  // Progressive passes are a strong proxy for graph centrality.
  // Touches per 90 add a secondary signal (more involvement = more connected).
  // Capped at 0.4 to stay within realistic PageRank bounds for a single player.
  const currentPageRank = Math.min(
    0.4,
    raw.progressivePasses * 0.02 + raw.touches * 0.001,
  );

  // ── Connection count estimate ──
  // Players with more progressive passes tend to have more unique pass
  // recipients. Baseline of 4 connections plus half a connection per
  // progressive pass per 90. Capped at 10.
  const currentConnections = Math.min(10, raw.progressivePasses * 0.5 + 4);

  // ── Pass weight estimate ──
  // Combines completion reliability with progressive pass volume.
  // A high-volume progressive passer with good accuracy gets a higher weight.
  const currentPassWeight =
    (raw.passCompletion / 100) * (raw.progressivePasses * 0.03 + 0.1);

  // ── Average position (x, y) from touch zone distribution ──
  // x-axis: -52.5 (own goal) to +52.5 (opponent goal), center = 0
  // We derive x from the touch distribution across thirds.
  //   - touchesMidThird contributes toward the center
  //   - touchesAttThird pushes toward opponent goal
  //   - The baseline at -35 represents a deep defender's position
  const avgX =
    -35 +
    (raw.touchesMidThird * 0.35 + raw.touchesAttThird * 0.70) * 70 / 100;

  // y-axis: negative = left, positive = right, 0 = center
  let avgY = 0;
  if (isLeftSide(raw.position)) {
    avgY = position === 'LW' ? -20 : -15;
  } else if (isRightSide(raw.position)) {
    avgY = position === 'RW' ? 20 : 15;
  }

  // ── Average pass distance (estimated from position) ──
  // Central defenders and deep midfielders tend to play longer passes.
  // Wingers and strikers play shorter, quicker passes.
  const avgPassDistanceByPosition: Record<string, number> = {
    GK: 30, CB: 22, LB: 18, RB: 18,
    CDM: 20, CM: 18, CAM: 15,
    LW: 14, RW: 14, LM: 16, RM: 16,
    ST: 12,
  };
  const avgPassDistance = avgPassDistanceByPosition[position] ?? 18;

  return {
    name: raw.name,
    age: raw.age,
    position,
    club: extra.club ?? raw.team,
    league: extra.league ?? '',
    nationality: extra.nationality ?? '',
    marketValue,
    contractYearsLeft: contractYears,
    avgX,
    avgY,
    passCompletionRate,
    avgPassDistance,
    defensiveWorkRate,
    sprintCapacity,
    avgSpeed,
    currentPageRank,
    currentConnections,
    currentPassWeight,
  };
}

// ─── FBRef -> TeamContext Conversion ────────────────────────

/**
 * Derives the team's playing style from statistical profile.
 */
function inferStyle(
  raw: FBRefTeamStats,
): 'possession' | 'counter' | 'pressing' | 'balanced' {
  // Possession-based: high possession, high pass completion
  if (raw.possession >= 55 && raw.passCompletion >= 85) return 'possession';

  // Pressing: low PPDA (< 8 means aggressive pressing)
  if (raw.ppda < 8) return 'pressing';

  // Counter: low possession but positive goal/xG differential
  if (raw.possession < 48 && raw.goalsFor > raw.goalsAgainst) return 'counter';

  return 'balanced';
}

/**
 * Estimates structural metrics that normally come from Team DNA analysis.
 *
 * These are rough approximations. In production, feed real tracking data
 * through the Team DNA pipeline for accurate values.
 */
function estimateStructuralMetrics(raw: FBRefTeamStats): {
  avgMincut: number;
  networkDensity: number;
  weakestZone: string;
  hubDependency: number;
  pressEfficiency: number;
} {
  // MinCut proxy: defensive solidity from goals/xG against
  // Lower xGA relative to league average (roughly 45) = higher MinCut
  const defensiveRatio = raw.xGA > 0
    ? Math.min(1, 1 - (raw.xGA / 60))
    : raw.goalsAgainst > 0
      ? Math.min(1, 1 - (raw.goalsAgainst / 60))
      : 0.5;
  const avgMincut = Math.max(0.2, Math.min(0.9, defensiveRatio));

  // Network density proxy: pass completion and possession correlate with
  // how connected a team's passing network is
  const networkDensity = Math.max(
    0.3,
    Math.min(0.95, (raw.passCompletion / 100) * 0.6 + (raw.possession / 100) * 0.4),
  );

  // Weakest zone: rough heuristic — center is default, pressing teams
  // tend to be weaker on the flanks, possession teams in transition
  const weakestZone = raw.ppda < 8 ? 'right' : raw.possession > 55 ? 'center' : 'left';

  // Hub dependency: lower pass completion variance suggests less reliance
  // on a single player. We use a moderate default.
  const hubDependency = raw.possession > 55 ? 0.55 : 0.45;

  // Press efficiency: inversely related to PPDA
  const pressEfficiency = Math.max(0.2, Math.min(0.7, 1 - (raw.ppda / 20)));

  return { avgMincut, networkDensity, weakestZone, hubDependency, pressEfficiency };
}

/**
 * Converts raw FBRef team stats into the TeamContext interface
 * used by the transfer valuation engine.
 *
 * @param raw - Team stats scraped from FBRef
 * @param squadDepth - Map of position -> number of players at that position
 * @param extraInfo - Additional context not available from FBRef:
 *   - budget: transfer budget in EUR millions
 *   - formation: primary formation string (e.g., '4-3-3')
 *   - hubPlayer: jersey number of the team's primary network hub
 * @returns A TeamContext ready for the valuation engine
 */
function fbrefToTeamContext(
  raw: FBRefTeamStats,
  squadDepth: Map<string, number>,
  extraInfo: { budget: number; formation: string; hubPlayer: string },
): TeamContext {
  const style = inferStyle(raw);
  const structural = estimateStructuralMetrics(raw);

  // Compute average centrality and connections from squad depth
  // These are rough estimates — in production, derive from actual match data
  const avgPlayerCentrality = structural.networkDensity * 0.35;
  const avgPlayerConnections = structural.networkDensity * 10;

  return {
    name: raw.team,
    league: raw.league,
    budget: extraInfo.budget,
    formation: extraInfo.formation,
    style,
    avgMincut: structural.avgMincut,
    networkDensity: structural.networkDensity,
    weakestZone: structural.weakestZone,
    hubPlayer: extraInfo.hubPlayer,
    hubDependency: structural.hubDependency,
    pressEfficiency: structural.pressEfficiency,
    positionDepth: squadDepth,
    avgPlayerCentrality,
    avgPlayerConnections,
  };
}

// ─── Exports ────────────────────────────────────────────────

export { fbrefToScoutProfile, fbrefToTeamContext, normalizePosition };
