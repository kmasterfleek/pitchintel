/**
 * PitchIntel Player Vector — 118-Dimension Transfer Intelligence
 *
 * Defines the full player representation for context-adjusted transfer
 * valuation. Data is organized into three tiers of availability:
 *
 *   Tier 1 (Public):  Auto-populated from FBRef/Opta — ~52 dimensions
 *   Tier 2 (Tracking): Derived from positional/network data — ~36 dimensions
 *   Tier 3 (Subjective): Club scouting input — ~22 dimensions
 *
 * The valuation engine gracefully degrades: it only scores factors for
 * which data exists, and adjusts confidence accordingly.
 *
 * Usage: npx tsx src/pitch-intel/player-vector.ts
 */

import type { ScoutProfile } from './data/players-db.js';
import type { TeamContext } from './data/teams-db.js';

// ─── 1. PlayerVector Interface (~118 dimensions) ─────────────────────

export interface PlayerVector {
  // === IDENTITY (required core) ===
  name: string;
  age: number;
  position: string; // GK,CB,LB,RB,CDM,CM,CAM,LM,RM,LW,RW,ST
  club: string;
  league: string;
  nationality: string;
  marketValue: number;        // EUR millions
  contractYearsLeft: number;

  // === TIER 1: PUBLIC — auto-populated from FBRef/Opta ===

  // Passing (12 dims)
  passCompletionShort?: number;
  passCompletionMedium?: number;
  passCompletionLong?: number;
  progressivePassesPer90?: number;
  keyPassesPer90?: number;
  throughBallsPer90?: number;
  crossesPer90?: number;
  crossAccuracy?: number;
  switchPlayPer90?: number;
  passesIntoFinalThird?: number;
  passesIntoPenaltyArea?: number;
  avgPassDistance?: number;

  // Shooting (8 dims)
  xGper90?: number;
  xGperShot?: number;
  goalsMinusXG?: number;
  shotsOnTargetPct?: number;
  shotDistanceAvg?: number;
  shotsFromInsideBoxPct?: number;
  freeKickGoals?: number;
  penaltyConversion?: number;

  // Creation (8 dims)
  xAper90?: number;
  shotCreatingActionsPer90?: number;
  goalCreatingActionsPer90?: number;
  progressiveCarriesPer90?: number;
  carriesIntoFinalThird?: number;
  carriesIntoPenaltyArea?: number;
  dribbleSuccessRate?: number;
  dribblesPer90?: number;

  // Defending (10 dims)
  tacklesPer90?: number;
  tackleWinPct?: number;
  interceptionsPer90?: number;
  blocksPer90?: number;
  clearancesPer90?: number;
  aerialDuelsWonPct?: number;
  foulsCommittedPer90?: number;
  yellowCardsPer90?: number;
  dribblersTackledPct?: number;
  challengesLostPer90?: number;

  // Pressing (8 dims)
  pressuresPer90?: number;
  pressureSuccessRate?: number;
  pressuresAttThirdPct?: number;
  pressuresMidThirdPct?: number;
  pressuresDefThirdPct?: number;
  counterpressingRecoveries?: number;
  ppda?: number;
  pressureTriggerRate?: number;

  // Physical (6 dims)
  topSpeed?: number;
  avgMatchSpeed?: number;
  sprintsPerMatch?: number;
  highSpeedRunsPerMatch?: number;
  distancePerMatch?: number;
  accelerationsPer90?: number;

  // === TIER 2: TRACKING-DERIVED ===

  // Spatial (12 dims)
  avgX?: number;
  avgY?: number;
  positionHeatmapEntropy?: number;
  territoryControlled?: number;
  spaceCreatedPerRun?: number;
  offBallRunsPerMatch?: number;
  runsBehindLinePer90?: number;
  avgDistFromBall?: number;
  avgDistFromTeamCentroid?: number;
  widthContribution?: number;
  depthContribution?: number;
  defensiveLineHeight?: number;

  // Network (10 dims)
  pageRankCentrality?: number;
  betweennessCentrality?: number;
  clusteringCoefficient?: number;
  passingConnections?: number;
  avgPassEdgeWeight?: number;
  receivingFrequency?: number;
  passUnderPressureRate?: number;
  passUnderPressureAccuracy?: number;
  networkImpactOnRemoval?: number;
  hubScore?: number;

  // Structural (8 dims)
  teamMincutWith?: number;
  teamMincutWithout?: number;
  mincutContribution?: number;
  formationComplianceScore?: number;
  coverShadowArea?: number;
  pressingChainParticipation?: number;
  defensiveTransitionSpeed?: number;
  offensiveTransitionSpeed?: number;

  // Game state (6 dims)
  performanceWhenWinning?: number;
  performanceWhenLosing?: number;
  performanceWhenDrawing?: number;
  last15minPerformance?: number;
  performanceVsTopTeams?: number;
  performanceInBigMoments?: number;

  // === TIER 3: SUBJECTIVE (club scouting input) ===

  // Tactical IQ (1-10 scale)
  positionalAwareness?: number;
  decisionMakingSpeed?: number;
  pressReadingAbility?: number;
  transitionReading?: number;
  setPlayIntelligence?: number;
  coachability?: number;

  // Personality (1-10 scale)
  mentality?: number;
  leadershipPresence?: number;
  cultureFit?: number;
  mediaHandling?: number;
  adaptability?: number;
  injuryProneness?: number;

  // Hold-up & link play (1-10, primarily for forwards)
  holdUpPlayQuality?: number;
  aerialPresence?: number;
  runTiming?: number;
  movementInBox?: number;

  // Defensive specifics (1-10, primarily for defenders)
  oneOnOneDefending?: number;
  organizationalVoice?: number;
  recoverySpeed?: number;
  composureUnderPress?: number;

  // Intangibles (1-10)
  clutchFactor?: number;
  dressingRoomEffect?: number;
  fanAppeal?: number;
  agentDifficulty?: number;
}

// ─── 2. Dimension Completeness Counter ───────────────────────────────

const TIER1_FIELDS: ReadonlyArray<keyof PlayerVector> = [
  'passCompletionShort', 'passCompletionMedium', 'passCompletionLong',
  'progressivePassesPer90', 'keyPassesPer90', 'throughBallsPer90',
  'crossesPer90', 'crossAccuracy', 'switchPlayPer90',
  'passesIntoFinalThird', 'passesIntoPenaltyArea', 'avgPassDistance',
  'xGper90', 'xGperShot', 'goalsMinusXG', 'shotsOnTargetPct',
  'shotDistanceAvg', 'shotsFromInsideBoxPct', 'freeKickGoals', 'penaltyConversion',
  'xAper90', 'shotCreatingActionsPer90', 'goalCreatingActionsPer90',
  'progressiveCarriesPer90', 'carriesIntoFinalThird', 'carriesIntoPenaltyArea',
  'dribbleSuccessRate', 'dribblesPer90',
  'tacklesPer90', 'tackleWinPct', 'interceptionsPer90', 'blocksPer90',
  'clearancesPer90', 'aerialDuelsWonPct', 'foulsCommittedPer90',
  'yellowCardsPer90', 'dribblersTackledPct', 'challengesLostPer90',
  'pressuresPer90', 'pressureSuccessRate', 'pressuresAttThirdPct',
  'pressuresMidThirdPct', 'pressuresDefThirdPct',
  'counterpressingRecoveries', 'ppda', 'pressureTriggerRate',
  'topSpeed', 'avgMatchSpeed', 'sprintsPerMatch',
  'highSpeedRunsPerMatch', 'distancePerMatch', 'accelerationsPer90',
];

const TIER2_FIELDS: ReadonlyArray<keyof PlayerVector> = [
  'avgX', 'avgY', 'positionHeatmapEntropy', 'territoryControlled',
  'spaceCreatedPerRun', 'offBallRunsPerMatch', 'runsBehindLinePer90',
  'avgDistFromBall', 'avgDistFromTeamCentroid', 'widthContribution',
  'depthContribution', 'defensiveLineHeight',
  'pageRankCentrality', 'betweennessCentrality', 'clusteringCoefficient',
  'passingConnections', 'avgPassEdgeWeight', 'receivingFrequency',
  'passUnderPressureRate', 'passUnderPressureAccuracy',
  'networkImpactOnRemoval', 'hubScore',
  'teamMincutWith', 'teamMincutWithout', 'mincutContribution',
  'formationComplianceScore', 'coverShadowArea',
  'pressingChainParticipation', 'defensiveTransitionSpeed',
  'offensiveTransitionSpeed',
  'performanceWhenWinning', 'performanceWhenLosing', 'performanceWhenDrawing',
  'last15minPerformance', 'performanceVsTopTeams', 'performanceInBigMoments',
];

const TIER3_FIELDS: ReadonlyArray<keyof PlayerVector> = [
  'positionalAwareness', 'decisionMakingSpeed', 'pressReadingAbility',
  'transitionReading', 'setPlayIntelligence', 'coachability',
  'mentality', 'leadershipPresence', 'cultureFit', 'mediaHandling',
  'adaptability', 'injuryProneness',
  'holdUpPlayQuality', 'aerialPresence', 'runTiming', 'movementInBox',
  'oneOnOneDefending', 'organizationalVoice', 'recoverySpeed',
  'composureUnderPress',
  'clutchFactor', 'dressingRoomEffect', 'fanAppeal', 'agentDifficulty',
];

export function vectorCompleteness(v: PlayerVector): {
  tier1: number;
  tier2: number;
  tier3: number;
  total: number;
  maxTotal: number;
} {
  const count = (fields: ReadonlyArray<keyof PlayerVector>) =>
    fields.filter(f => v[f] !== undefined).length;

  const tier1 = count(TIER1_FIELDS);
  const tier2 = count(TIER2_FIELDS);
  const tier3 = count(TIER3_FIELDS);

  return {
    tier1,
    tier2,
    tier3,
    total: tier1 + tier2 + tier3,
    maxTotal: TIER1_FIELDS.length + TIER2_FIELDS.length + TIER3_FIELDS.length,
  };
}

// ─── 3. ScoutProfile to PlayerVector Converter ───────────────────────

export function scoutProfileToVector(p: ScoutProfile): PlayerVector {
  // Estimate pass completion bands from the single rate.
  // Short passes are typically higher, long passes lower.
  const shortEst = Math.min(1, p.passCompletionRate + 0.05);
  const medEst = p.passCompletionRate;
  const longEst = Math.max(0, p.passCompletionRate - 0.15);

  return {
    // Identity (direct map)
    name: p.name,
    age: p.age,
    position: p.position,
    club: p.club,
    league: p.league,
    nationality: p.nationality,
    marketValue: p.marketValue,
    contractYearsLeft: p.contractYearsLeft,

    // Tier 1 — what we can infer from ScoutProfile
    passCompletionShort: shortEst,
    passCompletionMedium: medEst,
    passCompletionLong: longEst,
    avgPassDistance: p.avgPassDistance,

    // Physical — map sprint capacity and speed
    topSpeed: p.sprintCapacity > 30 ? 35 : p.sprintCapacity > 20 ? 32 : 29,
    avgMatchSpeed: p.avgSpeed,
    sprintsPerMatch: p.sprintCapacity,

    // Tier 2 — spatial (from old avgX/avgY)
    avgX: p.avgX,
    avgY: p.avgY,

    // Tier 2 — network (from old PageRank/connections/passWeight)
    pageRankCentrality: p.currentPageRank,
    passingConnections: p.currentConnections,
    avgPassEdgeWeight: p.currentPassWeight,

    // Derive a hub score from PageRank and connections
    hubScore: Math.min(1, (p.currentPageRank * 1.5 + p.currentConnections / 15) / 2),

    // Estimate pressing/defensive from defensiveWorkRate
    pressuresPer90: p.defensiveWorkRate > 0.6 ? 22 : p.defensiveWorkRate > 0.4 ? 15 : 8,
    tacklesPer90: p.defensiveWorkRate > 0.7 ? 3.5 : p.defensiveWorkRate > 0.4 ? 2.0 : 0.8,
    interceptionsPer90: p.defensiveWorkRate > 0.7 ? 2.0 : p.defensiveWorkRate > 0.4 ? 1.2 : 0.4,
  };
}

// ─── 4. Enhanced Valuation Engine ────────────────────────────────────

export interface EnhancedValuation {
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
  confidence: number;
  tierBreakdown: {
    tier1Score: number;
    tier2Score: number | null;
    tier3Score: number | null;
  };
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    explanation: string;
    tier: 1 | 2 | 3;
  }>;
  topPositive: string;
  topNegative: string;
}

type FactorResult = {
  name: string;
  score: number;
  weight: number;
  explanation: string;
  tier: 1 | 2 | 3;
};

// ─── Utility helpers ─────────────────────────────────────────────────

function clamp(v: number, lo: number = -1, hi: number = 1): number {
  return Math.max(lo, Math.min(hi, v));
}

function has(v: number | undefined): v is number {
  return v !== undefined;
}

function avg(...nums: (number | undefined)[]): number | undefined {
  const valid = nums.filter(has);
  if (valid.length === 0) return undefined;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ─── Tier 1 Factor Functions ─────────────────────────────────────────

function evalSystemFit(p: PlayerVector, t: TeamContext): FactorResult {
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
  } else if (f.includes('3-5-2') || f.includes('3-4-3') || f.includes('3-4-2-1')) {
    if (['CB', 'CM', 'LM', 'RM', 'ST'].includes(p.position)) formFit = 0.4;
    if (['LB', 'RB'].includes(p.position)) formFit = -0.2;
  } else if (f.includes('4-2-3-1') || f.includes('4-2-2-2')) {
    if (['CDM', 'CAM', 'LW', 'RW', 'ST'].includes(p.position)) formFit = 0.4;
    if (['CM'].includes(p.position)) formFit = 0.2;
  }

  let styleFit = 0;
  const passRate = avg(p.passCompletionShort, p.passCompletionMedium, p.passCompletionLong);
  if (t.style === 'possession') {
    if (has(passRate) && passRate > 0.85) styleFit = 0.5;
    else if (has(passRate) && passRate < 0.78) styleFit = -0.3;
  }
  if (t.style === 'counter') {
    if (has(p.sprintsPerMatch) && p.sprintsPerMatch > 25) styleFit = 0.5;
    else if (has(p.sprintsPerMatch) && p.sprintsPerMatch < 15) styleFit = -0.3;
    else if (has(p.topSpeed) && p.topSpeed > 33) styleFit = 0.4;
  }
  if (t.style === 'pressing') {
    if (has(p.pressuresPer90) && p.pressuresPer90 > 18) styleFit = 0.5;
    else if (has(p.tacklesPer90) && p.tacklesPer90 > 3) styleFit = 0.3;
    else if (has(p.pressuresPer90) && p.pressuresPer90 < 10) styleFit = -0.4;
  }
  if (t.style === 'balanced') styleFit = 0.1;

  const score = posFit * 0.4 + formFit * 0.3 + styleFit * 0.3;
  return {
    name: 'System Fit',
    score: clamp(score),
    weight: 1.0,
    tier: 1,
    explanation:
      `Position need: ${posNeed === 0 ? 'CRITICAL' : posNeed === 1 ? 'high' : posNeed === 2 ? 'adequate' : 'saturated'}. ` +
      `Formation: ${formFit > 0 ? 'compatible' : formFit < 0 ? 'awkward' : 'neutral'}. ` +
      `Style: ${styleFit > 0.2 ? 'strong match' : styleFit < -0.2 ? 'mismatch' : 'acceptable'}.`,
  };
}

function evalPassingProfile(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [
    p.passCompletionShort, p.passCompletionMedium, p.passCompletionLong,
    p.progressivePassesPer90, p.keyPassesPer90, p.avgPassDistance,
  ].filter(has);
  if (available.length === 0) return null;

  let score = 0;
  const parts: string[] = [];

  // High-density networks need high completion
  if (has(p.passCompletionMedium)) {
    const threshold = t.networkDensity > 0.8 ? 0.87 : 0.82;
    const delta = (p.passCompletionMedium - threshold) * 3;
    score += clamp(delta) * 0.4;
    parts.push(p.passCompletionMedium > threshold ? 'passing suits network' : 'completion below network standard');
  }

  // Progressive passing valued in possession teams
  if (has(p.progressivePassesPer90) && t.style === 'possession') {
    score += clamp((p.progressivePassesPer90 - 5) / 5) * 0.3;
  }

  // Key passes
  if (has(p.keyPassesPer90)) {
    score += clamp((p.keyPassesPer90 - 1.5) / 2) * 0.3;
    if (p.keyPassesPer90 > 2.5) parts.push('elite key passer');
  }

  return {
    name: 'Passing Profile',
    score: clamp(score),
    weight: 1.0,
    tier: 1,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Passing profile evaluated.',
  };
}

function evalShootingValue(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [p.xGper90, p.xGperShot, p.goalsMinusXG, p.shotsOnTargetPct].filter(has);
  if (available.length === 0) return null;

  let score = 0;
  const parts: string[] = [];

  if (has(p.xGper90)) {
    // Forwards expected higher xG
    const threshold = ['ST', 'LW', 'RW'].includes(p.position) ? 0.4 : 0.15;
    score += clamp((p.xGper90 - threshold) / threshold) * 0.4;
    if (p.xGper90 > 0.5) parts.push('elite xG output');
  }

  if (has(p.goalsMinusXG)) {
    score += clamp(p.goalsMinusXG / 5) * 0.3;
    if (p.goalsMinusXG > 3) parts.push('clinical finisher');
    if (p.goalsMinusXG < -3) parts.push('underperforming xG');
  }

  if (has(p.shotsOnTargetPct)) {
    score += clamp((p.shotsOnTargetPct - 35) / 30) * 0.3;
  }

  return {
    name: 'Shooting Value',
    score: clamp(score),
    weight: 1.0,
    tier: 1,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Shooting profile evaluated.',
  };
}

function evalCreativeValue(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [
    p.xAper90, p.shotCreatingActionsPer90, p.goalCreatingActionsPer90,
    p.progressiveCarriesPer90, p.dribbleSuccessRate,
  ].filter(has);
  if (available.length === 0) return null;

  let score = 0;
  const parts: string[] = [];

  if (has(p.xAper90)) {
    score += clamp((p.xAper90 - 0.15) / 0.25) * 0.35;
    if (p.xAper90 > 0.3) parts.push('elite chance creator');
  }

  if (has(p.shotCreatingActionsPer90)) {
    score += clamp((p.shotCreatingActionsPer90 - 3) / 3) * 0.25;
  }

  if (has(p.progressiveCarriesPer90)) {
    const bonus = t.style === 'counter' ? 0.1 : 0;
    score += (clamp((p.progressiveCarriesPer90 - 3) / 5) + bonus) * 0.2;
    if (p.progressiveCarriesPer90 > 6) parts.push('dangerous ball carrier');
  }

  if (has(p.dribbleSuccessRate)) {
    score += clamp((p.dribbleSuccessRate - 50) / 30) * 0.2;
  }

  return {
    name: 'Creative Value',
    score: clamp(score),
    weight: 1.0,
    tier: 1,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Creative output evaluated.',
  };
}

function evalDefensiveValue(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [
    p.tacklesPer90, p.tackleWinPct, p.interceptionsPer90,
    p.aerialDuelsWonPct, p.dribblersTackledPct,
  ].filter(has);
  if (available.length === 0) return null;

  let score = 0;
  const parts: string[] = [];

  if (has(p.tacklesPer90)) {
    score += clamp((p.tacklesPer90 - 1.5) / 2.5) * 0.3;
  }

  if (has(p.interceptionsPer90)) {
    score += clamp((p.interceptionsPer90 - 0.8) / 1.5) * 0.25;
  }

  if (has(p.aerialDuelsWonPct)) {
    const bonus = ['CB', 'ST'].includes(p.position) ? 0.1 : 0;
    score += (clamp((p.aerialDuelsWonPct - 50) / 30) + bonus) * 0.2;
    if (p.aerialDuelsWonPct > 70) parts.push('aerial dominance');
  }

  if (has(p.dribblersTackledPct)) {
    score += clamp((p.dribblersTackledPct - 50) / 30) * 0.25;
  }

  // Pressing teams value defenders who tackle
  if (t.style === 'pressing' && has(p.tacklesPer90) && p.tacklesPer90 > 3) {
    score += 0.15;
    parts.push('fits pressing identity');
  }

  return {
    name: 'Defensive Value',
    score: clamp(score),
    weight: 1.0,
    tier: 1,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Defensive profile evaluated.',
  };
}

function evalPhysicalProfile(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [
    p.topSpeed, p.avgMatchSpeed, p.sprintsPerMatch,
    p.highSpeedRunsPerMatch, p.distancePerMatch,
  ].filter(has);
  if (available.length === 0) return null;

  let score = 0;
  const parts: string[] = [];

  if (t.style === 'counter') {
    if (has(p.topSpeed) && p.topSpeed > 33) {
      score += 0.4;
      parts.push('pace suits counter-attack');
    }
    if (has(p.sprintsPerMatch) && p.sprintsPerMatch > 25) {
      score += 0.3;
    }
  }

  if (t.style === 'pressing') {
    if (has(p.distancePerMatch) && p.distancePerMatch > 11) {
      score += 0.3;
      parts.push('high work rate for pressing');
    }
    if (has(p.sprintsPerMatch) && p.sprintsPerMatch > 20) {
      score += 0.2;
    }
  }

  if (t.style === 'possession') {
    // Possession teams less reliant on raw pace
    if (has(p.avgMatchSpeed)) {
      score += clamp((p.avgMatchSpeed - 5.2) / 1.5) * 0.3;
    }
  }

  if (t.style === 'balanced') {
    // Reward well-rounded physical profiles
    const phys = avg(
      has(p.topSpeed) ? (p.topSpeed - 28) / 8 : undefined,
      has(p.sprintsPerMatch) ? (p.sprintsPerMatch - 15) / 20 : undefined,
      has(p.distancePerMatch) ? (p.distancePerMatch - 9) / 3 : undefined,
    );
    if (has(phys)) score += clamp(phys) * 0.5;
  }

  return {
    name: 'Physical Profile',
    score: clamp(score),
    weight: 1.0,
    tier: 1,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Physical profile evaluated.',
  };
}

function evalRedundancy(p: PlayerVector, t: TeamContext): FactorResult {
  const depth = t.positionDepth.get(p.position) ?? 0;
  const score = depth === 0 ? 0.9 : depth === 1 ? 0.5 : depth === 2 ? -0.1 : depth === 3 ? -0.5 : -0.7;
  return {
    name: 'Redundancy',
    score,
    weight: 1.0,
    tier: 1,
    explanation:
      `${depth} players at ${p.position}. ` +
      `${depth === 0 ? 'CRITICAL GAP' : depth === 1 ? 'Low depth' : depth === 2 ? 'Adequate' : 'Saturated'}.`,
  };
}

function evalAgeContract(p: PlayerVector, _t: TeamContext): FactorResult {
  let score = 0;
  const parts: string[] = [];

  // Age component
  if (p.age <= 21) {
    score += 0.4;
    parts.push(`age ${p.age} — massive upside`);
  } else if (p.age <= 24) {
    score += 0.25;
    parts.push(`age ${p.age} — significant development`);
  } else if (p.age <= 27) {
    score += 0.1;
    parts.push(`age ${p.age} — prime years`);
  } else if (p.age <= 29) {
    score -= 0.1;
    parts.push(`age ${p.age} — peak but declining horizon`);
  } else {
    score -= 0.35;
    parts.push(`age ${p.age} — limited resale window`);
  }

  // Contract component: short contract = lower price = buyer advantage
  if (p.contractYearsLeft <= 1) {
    score += 0.3;
    parts.push('expiring contract — transfer leverage');
  } else if (p.contractYearsLeft <= 2) {
    score += 0.1;
    parts.push('short contract');
  } else if (p.contractYearsLeft >= 5) {
    score -= 0.15;
    parts.push('long contract — seller has leverage');
  }

  // Combined penalty: old + short contract = declining asset
  if (p.age >= 30 && p.contractYearsLeft <= 2) {
    score -= 0.2;
    parts.push('aging with limited window');
  }

  // Same-league premium
  // (handled in system fit already, omitted here to avoid double-counting)

  return {
    name: 'Age & Contract',
    score: clamp(score),
    weight: 1.0,
    tier: 1,
    explanation: parts.join('; ') + '.',
  };
}

// ─── Tier 2 Factor Functions ─────────────────────────────────────────

function evalSpatialImpact(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [
    p.avgX, p.avgY, p.positionHeatmapEntropy, p.territoryControlled,
    p.spaceCreatedPerRun, p.widthContribution, p.depthContribution,
  ].filter(has);
  if (available.length < 2) return null;

  let score = 0;
  const parts: string[] = [];

  // Zone weakness fill
  if (has(p.avgY)) {
    const playsLeft = p.avgY < -10;
    const playsRight = p.avgY > 10;
    if (t.weakestZone.includes('left') && playsLeft) {
      score += 0.5;
      parts.push('fills weak left zone');
    } else if (t.weakestZone.includes('right') && playsRight) {
      score += 0.5;
      parts.push('fills weak right zone');
    } else if (t.weakestZone.includes('center') && !playsLeft && !playsRight) {
      score += 0.3;
      parts.push('strengthens center');
    }
  }

  // Space creation value
  if (has(p.spaceCreatedPerRun) && p.spaceCreatedPerRun > 20) {
    score += 0.2;
    parts.push('creates space for teammates');
  }

  // Width/depth contribution
  if (has(p.widthContribution) && has(p.depthContribution)) {
    if (t.style === 'possession' && p.widthContribution > 0.6) {
      score += 0.15;
      parts.push('stretches play wide');
    }
    if (t.style === 'counter' && p.depthContribution > 0.6) {
      score += 0.15;
      parts.push('provides depth in transition');
    }
  }

  // Positional entropy — versatile players fill multiple zones
  if (has(p.positionHeatmapEntropy) && p.positionHeatmapEntropy > 0.7) {
    score += 0.1;
    parts.push('positionally versatile');
  }

  return {
    name: 'Spatial Impact',
    score: clamp(score),
    weight: 1.5,
    tier: 2,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Spatial profile evaluated.',
  };
}

function evalNetworkIntegration(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [
    p.pageRankCentrality, p.betweennessCentrality, p.passingConnections,
    p.avgPassEdgeWeight, p.hubScore, p.networkImpactOnRemoval,
  ].filter(has);
  if (available.length < 2) return null;

  let score = 0;
  const parts: string[] = [];

  // Centrality match with team average
  if (has(p.pageRankCentrality)) {
    const centMatch = 1 - Math.abs(p.pageRankCentrality - t.avgPlayerCentrality) /
      Math.max(t.avgPlayerCentrality, 0.01);
    score += clamp(centMatch) * 0.25;
  }

  // Connection density vs team
  if (has(p.passingConnections)) {
    const connDelta = (p.passingConnections - t.avgPlayerConnections) /
      Math.max(t.avgPlayerConnections, 1);
    score += clamp(connDelta * 0.8) * 0.25;
    if (connDelta > 0.2) parts.push('boosts connectivity');
  }

  // Hub dependency management
  if (has(p.hubScore) && t.hubDependency > 0.5) {
    if (p.hubScore > 0.5) {
      score += 0.3;
      parts.push('reduces hub dependency');
    } else {
      score -= 0.1;
    }
  }

  // Network impact — high-impact players are valuable
  if (has(p.networkImpactOnRemoval) && p.networkImpactOnRemoval > 0.5) {
    score += 0.15;
    parts.push('high network impact');
  }

  // Pass edge weight quality
  if (has(p.avgPassEdgeWeight) && p.avgPassEdgeWeight > 0.35) {
    score += 0.1;
  }

  return {
    name: 'Network Integration',
    score: clamp(score),
    weight: 1.5,
    tier: 2,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Network integration evaluated.',
  };
}

function evalStructuralDefense(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [
    p.teamMincutWith, p.teamMincutWithout, p.mincutContribution,
    p.coverShadowArea, p.pressingChainParticipation,
    p.defensiveTransitionSpeed, p.offensiveTransitionSpeed,
  ].filter(has);
  if (available.length < 2) return null;

  let score = 0;
  const parts: string[] = [];

  // MinCut contribution
  if (has(p.mincutContribution)) {
    if (p.mincutContribution > 0.1) {
      score += 0.4;
      parts.push('strengthens structural resilience');
    } else if (p.mincutContribution < -0.05) {
      score -= 0.2;
      parts.push('weakens team structure');
    }
  } else if (has(p.teamMincutWith) && has(p.teamMincutWithout)) {
    const contrib = p.teamMincutWith - p.teamMincutWithout;
    if (contrib > 0.1) {
      score += 0.4;
      parts.push('strengthens structural resilience');
    }
  }

  // Cover shadow
  if (has(p.coverShadowArea) && p.coverShadowArea > 25) {
    score += 0.15;
    parts.push('effective cover shadow');
  }

  // Pressing chain fit
  if (has(p.pressingChainParticipation)) {
    if (t.style === 'pressing' && p.pressingChainParticipation > 0.6) {
      score += 0.25;
      parts.push('excellent pressing chain participation');
    } else if (p.pressingChainParticipation > 0.4) {
      score += 0.1;
    }
  }

  // Transition speed
  if (has(p.defensiveTransitionSpeed) && p.defensiveTransitionSpeed < 3) {
    score += 0.1;
    parts.push('quick defensive transitions');
  }

  return {
    name: 'Structural Defense',
    score: clamp(score),
    weight: 1.5,
    tier: 2,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Structural defense evaluated.',
  };
}

function evalGameStateResilience(p: PlayerVector, _t: TeamContext): FactorResult | null {
  const available = [
    p.performanceWhenWinning, p.performanceWhenLosing, p.performanceWhenDrawing,
    p.last15minPerformance, p.performanceVsTopTeams, p.performanceInBigMoments,
  ].filter(has);
  if (available.length < 2) return null;

  let score = 0;
  const parts: string[] = [];

  // Performs when losing — clutch mentality
  if (has(p.performanceWhenLosing) && p.performanceWhenLosing > 1.1) {
    score += 0.3;
    parts.push('raises game when behind');
  }

  // Late-game performer
  if (has(p.last15minPerformance) && p.last15minPerformance > 1.2) {
    score += 0.2;
    parts.push('strong in closing minutes');
  }

  // Big-game player
  if (has(p.performanceVsTopTeams) && p.performanceVsTopTeams > 1.0) {
    score += 0.25;
    parts.push('steps up vs top teams');
  }

  if (has(p.performanceInBigMoments) && p.performanceInBigMoments > 1.0) {
    score += 0.15;
    parts.push('decisive in big moments');
  }

  // Consistency across game states
  if (has(p.performanceWhenWinning) && has(p.performanceWhenLosing) && has(p.performanceWhenDrawing)) {
    const variance = Math.abs(p.performanceWhenWinning - p.performanceWhenLosing) +
      Math.abs(p.performanceWhenWinning - p.performanceWhenDrawing);
    if (variance < 0.3) {
      score += 0.1;
      parts.push('consistent across game states');
    }
  }

  return {
    name: 'Game State Resilience',
    score: clamp(score),
    weight: 1.5,
    tier: 2,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Game state resilience evaluated.',
  };
}

// ─── Tier 3 Factor Functions ─────────────────────────────────────────

function evalTacticalIntelligence(p: PlayerVector, t: TeamContext): FactorResult | null {
  const available = [
    p.positionalAwareness, p.decisionMakingSpeed, p.pressReadingAbility,
    p.transitionReading, p.setPlayIntelligence, p.coachability,
  ].filter(has);
  if (available.length < 2) return null;

  let score = 0;
  const parts: string[] = [];

  // Positional awareness — more important in possession systems
  if (has(p.positionalAwareness)) {
    const baseline = t.style === 'possession' ? 7 : 5;
    score += clamp((p.positionalAwareness - baseline) / 4) * 0.25;
    if (p.positionalAwareness >= 8) parts.push('elite positional IQ');
  }

  // Decision-making speed — universally valuable
  if (has(p.decisionMakingSpeed)) {
    score += clamp((p.decisionMakingSpeed - 5) / 4) * 0.2;
  }

  // Press reading — critical for pressing teams
  if (has(p.pressReadingAbility) && t.style === 'pressing') {
    score += clamp((p.pressReadingAbility - 5) / 4) * 0.25;
    if (p.pressReadingAbility >= 8) parts.push('reads the press expertly');
  }

  // Coachability — high value for complex tactical systems
  if (has(p.coachability)) {
    const complexSystem = t.networkDensity > 0.8 || t.style === 'possession';
    const baseline = complexSystem ? 6 : 4;
    score += clamp((p.coachability - baseline) / 5) * 0.15;
    if (p.coachability >= 8) parts.push('highly coachable');
  }

  // Transition reading — for counter and balanced
  if (has(p.transitionReading) && (t.style === 'counter' || t.style === 'balanced')) {
    score += clamp((p.transitionReading - 5) / 4) * 0.15;
  }

  return {
    name: 'Tactical Intelligence',
    score: clamp(score),
    weight: 2.0,
    tier: 3,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Tactical IQ evaluated.',
  };
}

function evalPersonalityCulture(p: PlayerVector, _t: TeamContext): FactorResult | null {
  const available = [
    p.mentality, p.leadershipPresence, p.cultureFit,
    p.mediaHandling, p.adaptability, p.injuryProneness,
  ].filter(has);
  if (available.length < 2) return null;

  let score = 0;
  const parts: string[] = [];

  if (has(p.mentality)) {
    score += clamp((p.mentality - 5) / 4) * 0.25;
    if (p.mentality >= 8) parts.push('winner mentality');
  }

  if (has(p.leadershipPresence)) {
    score += clamp((p.leadershipPresence - 5) / 4) * 0.15;
    if (p.leadershipPresence >= 8) parts.push('natural leader');
  }

  if (has(p.cultureFit)) {
    score += clamp((p.cultureFit - 5) / 4) * 0.2;
    if (p.cultureFit <= 3) parts.push('culture fit concerns');
  }

  if (has(p.adaptability)) {
    score += clamp((p.adaptability - 5) / 4) * 0.15;
  }

  // Injury proneness is a negative: higher = worse
  if (has(p.injuryProneness)) {
    score -= clamp((p.injuryProneness - 3) / 6) * 0.25;
    if (p.injuryProneness >= 7) parts.push('significant injury risk');
  }

  return {
    name: 'Personality & Culture',
    score: clamp(score),
    weight: 2.0,
    tier: 3,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Personality profile evaluated.',
  };
}

function evalRoleSpecificQuality(p: PlayerVector, _t: TeamContext): FactorResult | null {
  const isForward = ['ST', 'LW', 'RW', 'CAM'].includes(p.position);
  const isDefender = ['CB', 'LB', 'RB', 'CDM'].includes(p.position);

  let available: (number | undefined)[];
  if (isForward) {
    available = [p.holdUpPlayQuality, p.aerialPresence, p.runTiming, p.movementInBox];
  } else if (isDefender) {
    available = [p.oneOnOneDefending, p.organizationalVoice, p.recoverySpeed, p.composureUnderPress];
  } else {
    // Midfielders: use a mix
    available = [p.composureUnderPress, p.recoverySpeed, p.runTiming];
  }

  const validCount = available.filter(has).length;
  if (validCount < 2) return null;

  let score = 0;
  const parts: string[] = [];

  if (isForward) {
    if (has(p.movementInBox) && p.movementInBox >= 8) {
      score += 0.3;
      parts.push('intelligent movement in the box');
    }
    if (has(p.runTiming) && p.runTiming >= 7) {
      score += 0.25;
      parts.push('well-timed runs');
    }
    if (has(p.holdUpPlayQuality)) {
      score += clamp((p.holdUpPlayQuality - 5) / 4) * 0.25;
    }
    if (has(p.aerialPresence)) {
      score += clamp((p.aerialPresence - 5) / 4) * 0.2;
    }
  } else if (isDefender) {
    if (has(p.oneOnOneDefending) && p.oneOnOneDefending >= 8) {
      score += 0.3;
      parts.push('elite 1v1 defender');
    }
    if (has(p.organizationalVoice) && p.organizationalVoice >= 7) {
      score += 0.25;
      parts.push('organizes the backline');
    }
    if (has(p.recoverySpeed)) {
      score += clamp((p.recoverySpeed - 5) / 4) * 0.25;
    }
    if (has(p.composureUnderPress)) {
      score += clamp((p.composureUnderPress - 5) / 4) * 0.2;
    }
  } else {
    // Midfielders
    if (has(p.composureUnderPress)) {
      score += clamp((p.composureUnderPress - 5) / 4) * 0.4;
      if (p.composureUnderPress >= 8) parts.push('composed under pressure');
    }
    if (has(p.recoverySpeed)) {
      score += clamp((p.recoverySpeed - 5) / 4) * 0.3;
    }
    if (has(p.runTiming)) {
      score += clamp((p.runTiming - 5) / 4) * 0.3;
    }
  }

  return {
    name: 'Role-Specific Quality',
    score: clamp(score),
    weight: 2.0,
    tier: 3,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Role-specific quality evaluated.',
  };
}

function evalIntangibleValue(p: PlayerVector, _t: TeamContext): FactorResult | null {
  const available = [
    p.clutchFactor, p.dressingRoomEffect, p.fanAppeal, p.agentDifficulty,
  ].filter(has);
  if (available.length < 2) return null;

  let score = 0;
  const parts: string[] = [];

  if (has(p.clutchFactor)) {
    score += clamp((p.clutchFactor - 5) / 4) * 0.3;
    if (p.clutchFactor >= 8) parts.push('elite clutch performer');
  }

  if (has(p.dressingRoomEffect)) {
    score += clamp((p.dressingRoomEffect - 5) / 4) * 0.25;
    if (p.dressingRoomEffect >= 8) parts.push('positive dressing room influence');
    if (p.dressingRoomEffect <= 3) parts.push('dressing room risk');
  }

  if (has(p.fanAppeal)) {
    score += clamp((p.fanAppeal - 5) / 4) * 0.15;
    if (p.fanAppeal >= 8) parts.push('commercial value');
  }

  // Agent difficulty is negative: higher = harder deal
  if (has(p.agentDifficulty)) {
    score -= clamp((p.agentDifficulty - 4) / 5) * 0.3;
    if (p.agentDifficulty >= 8) parts.push('nightmare agent');
  }

  return {
    name: 'Intangible Value',
    score: clamp(score),
    weight: 2.0,
    tier: 3,
    explanation: parts.length > 0 ? parts.join('; ') + '.' : 'Intangible value evaluated.',
  };
}

// ─── Core Valuation Computation ──────────────────────────────────────

/** Maximum possible weight when all 16 factors fire. */
const MAX_POSSIBLE_WEIGHT =
  8 * 1.0 +    // 8 tier-1 factors at weight 1.0 each
  4 * 1.5 +    // 4 tier-2 factors at weight 1.5 each
  4 * 2.0;     // 4 tier-3 factors at weight 2.0 each

export function computeEnhancedValuation(
  player: PlayerVector,
  team: TeamContext,
): EnhancedValuation {
  // Skip if player is already at this club
  if (player.club === team.name) {
    return {
      team: team.name,
      player: player.name,
      position: player.position,
      club: player.club,
      league: player.league,
      age: player.age,
      marketValue: player.marketValue,
      contextValue: player.marketValue,
      multiplier: 1.0,
      verdict: 'fair',
      confidence: 0,
      tierBreakdown: { tier1Score: 0, tier2Score: null, tier3Score: null },
      factors: [],
      topPositive: 'Current club',
      topNegative: 'N/A',
    };
  }

  // Collect all factors (nullable ones are skipped when data is missing)
  const allResults: (FactorResult | null)[] = [
    // Tier 1 (always-on: system fit, redundancy, age/contract)
    evalSystemFit(player, team),
    evalPassingProfile(player, team),
    evalShootingValue(player, team),
    evalCreativeValue(player, team),
    evalDefensiveValue(player, team),
    evalPhysicalProfile(player, team),
    evalRedundancy(player, team),
    evalAgeContract(player, team),
    // Tier 2
    evalSpatialImpact(player, team),
    evalNetworkIntegration(player, team),
    evalStructuralDefense(player, team),
    evalGameStateResilience(player, team),
    // Tier 3
    evalTacticalIntelligence(player, team),
    evalPersonalityCulture(player, team),
    evalRoleSpecificQuality(player, team),
    evalIntangibleValue(player, team),
  ];

  const factors = allResults.filter((f): f is FactorResult => f !== null);

  // Compute tier-level scores
  const tier1Factors = factors.filter(f => f.tier === 1);
  const tier2Factors = factors.filter(f => f.tier === 2);
  const tier3Factors = factors.filter(f => f.tier === 3);

  const tierAvg = (fs: FactorResult[]): number | null => {
    if (fs.length === 0) return null;
    const totalW = fs.reduce((s, f) => s + f.weight, 0);
    return fs.reduce((s, f) => s + f.score * f.weight, 0) / totalW;
  };

  const tier1Score = tierAvg(tier1Factors) ?? 0;
  const tier2Score = tierAvg(tier2Factors);
  const tier3Score = tierAvg(tier3Factors);

  // Weighted total across all active factors
  const activeWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weightedScore = factors.reduce((s, f) => s + f.score * f.weight, 0);
  const norm = activeWeight > 0 ? weightedScore / activeWeight : 0;

  // Confidence: ratio of active weights to maximum possible
  const confidence = Math.min(1, activeWeight / MAX_POSSIBLE_WEIGHT);

  // Multiplier: confidence-scaled exponential
  // Low data => conservative (exponent dampened), high data => full swing
  const exponent = norm * 0.92 * (0.7 + 0.3 * confidence);
  const multiplier = Math.round(Math.exp(exponent) * 100) / 100;
  const contextValue = Math.round(player.marketValue * multiplier * 10) / 10;

  // Verdict
  const verdict: EnhancedValuation['verdict'] =
    multiplier > 1.3 ? 'bargain' :
    multiplier > 0.85 ? 'fair' :
    multiplier > 0.55 ? 'overpay' :
    'avoid';

  // Top positive and negative factors
  const sorted = [...factors].sort((a, b) =>
    (b.score * b.weight) - (a.score * a.weight));
  const topPositive = sorted.length > 0 && sorted[0].score > 0
    ? `${sorted[0].name}: ${sorted[0].explanation}`
    : 'None';
  const reverseSorted = [...factors].sort((a, b) =>
    (a.score * a.weight) - (b.score * b.weight));
  const topNegative = reverseSorted.length > 0 && reverseSorted[0].score < 0
    ? `${reverseSorted[0].name}: ${reverseSorted[0].explanation}`
    : 'None';

  return {
    team: team.name,
    player: player.name,
    position: player.position,
    club: player.club,
    league: player.league,
    age: player.age,
    marketValue: player.marketValue,
    contextValue,
    multiplier,
    verdict,
    confidence,
    tierBreakdown: {
      tier1Score,
      tier2Score,
      tier3Score,
    },
    factors,
    topPositive,
    topNegative,
  };
}

// ─── 5. Runner ───────────────────────────────────────────────────────

function hdr(t: string): void {
  console.log('\n' + '='.repeat(76) + '\n  ' + t + '\n' + '='.repeat(76));
}

function sub(t: string): void {
  console.log('\n-- ' + t + ' ' + '-'.repeat(Math.max(0, 70 - t.length)));
}

export async function main(): Promise<void> {
  const pMod = await import('./data/players-db.js');
  const tMod = await import('./data/teams-db.js');

  const players: ScoutProfile[] = pMod.getPlayerDatabase();
  const teams: TeamContext[] = tMod.getTeamDatabase();

  // Convert all players to the 118-dim vector
  const vectors = players.map(scoutProfileToVector);

  console.log(`Loaded ${players.length} players, converted to 118-dim PlayerVector`);

  // Sample teams for the demo
  const sampleTeams = ['Arsenal', 'Barcelona', 'Bayern Munich'];
  const targetTeams = teams.filter(t => sampleTeams.includes(t.name));

  if (targetTeams.length === 0) {
    console.error('No matching teams found in database.');
    process.exit(1);
  }

  // Show vector completeness for the first player
  const firstVec = vectors[0];
  const comp = vectorCompleteness(firstVec);
  hdr('PLAYER VECTOR COMPLETENESS (converted from ScoutProfile)');
  console.log(`  Sample: ${firstVec.name} (${firstVec.position}, ${firstVec.club})`);
  console.log(`  Tier 1 (Public):     ${comp.tier1}/${TIER1_FIELDS.length} dimensions populated`);
  console.log(`  Tier 2 (Tracking):   ${comp.tier2}/${TIER2_FIELDS.length} dimensions populated`);
  console.log(`  Tier 3 (Subjective): ${comp.tier3}/${TIER3_FIELDS.length} dimensions populated`);
  console.log(`  Total:               ${comp.total}/${comp.maxTotal} (${(comp.total / comp.maxTotal * 100).toFixed(1)}%)`);

  // Run valuations for sample teams x first 10 players
  const samplePlayers = vectors.slice(0, 10);
  const allValuations: EnhancedValuation[] = [];

  const start = Date.now();
  for (const team of targetTeams) {
    for (const player of samplePlayers) {
      const v = computeEnhancedValuation(player, team);
      if (player.club !== team.name) {
        allValuations.push(v);
      }
    }
  }
  const elapsed = Date.now() - start;

  hdr(`ENHANCED VALUATION ENGINE — ${allValuations.length} valuations in ${elapsed}ms`);

  // Per-team results
  for (const teamName of sampleTeams) {
    const teamVals = allValuations
      .filter(v => v.team === teamName)
      .sort((a, b) => b.multiplier - a.multiplier);

    sub(`${teamName} — Top 3 Bargains`);
    const bargains = teamVals.filter(v => v.verdict === 'bargain' || v.multiplier > 1.1);
    const topBargains = bargains.slice(0, 3);

    if (topBargains.length === 0) {
      console.log('  No clear bargains in this sample.');
    }

    for (const v of topBargains) {
      console.log(
        `\n  ${v.player} (${v.position}, ${v.age}) — ${v.club}` +
        `\n    Market: EUR ${v.marketValue}M => Context: EUR ${v.contextValue}M (${v.multiplier.toFixed(2)}x)` +
        `\n    Confidence: ${(v.confidence * 100).toFixed(0)}%  |  Verdict: ${v.verdict.toUpperCase()}` +
        `\n    Tier breakdown: T1=${v.tierBreakdown.tier1Score.toFixed(3)}  ` +
        `T2=${v.tierBreakdown.tier2Score !== null ? v.tierBreakdown.tier2Score.toFixed(3) : 'N/A'}  ` +
        `T3=${v.tierBreakdown.tier3Score !== null ? v.tierBreakdown.tier3Score.toFixed(3) : 'N/A'}` +
        `\n    + ${v.topPositive}` +
        `\n    - ${v.topNegative}`
      );
    }

    // Show all factor details for the top bargain
    if (topBargains.length > 0) {
      const best = topBargains[0];
      console.log(`\n  Factor breakdown for ${best.player} => ${teamName}:`);
      for (const f of best.factors) {
        const bar = f.score > 0 ? '+'.repeat(Math.round(f.score * 5)) : '-'.repeat(Math.round(-f.score * 5));
        console.log(
          `    [T${f.tier}] ${f.name.padEnd(24)} ${(f.score > 0 ? '+' : '') + f.score.toFixed(3)}  ` +
          `(w=${f.weight.toFixed(1)})  ${bar}  ${f.explanation}`
        );
      }
    }
  }

  // Confidence projection
  hdr('CONFIDENCE PROJECTION');
  console.log('  What happens as more data tiers become available:\n');
  console.log('  ' + 'Scenario'.padEnd(32) + 'Confidence'.padStart(12) + 'Multiplier range'.padStart(20));
  console.log('  ' + '-'.repeat(64));

  // Current: only converted ScoutProfile data
  const avgConf = allValuations.reduce((s, v) => s + v.confidence, 0) / allValuations.length;
  const mults = allValuations.map(v => v.multiplier);
  const minMult = Math.min(...mults);
  const maxMult = Math.max(...mults);
  console.log(
    '  ' + 'Current (ScoutProfile only)'.padEnd(32) +
    `${(avgConf * 100).toFixed(0)}%`.padStart(12) +
    `${minMult.toFixed(2)}x - ${maxMult.toFixed(2)}x`.padStart(20)
  );

  // Projected: with full Tier 1
  const projT1Conf = (8 * 1.0) / MAX_POSSIBLE_WEIGHT;
  const projT1Range = 0.92 * (0.7 + 0.3 * projT1Conf);
  console.log(
    '  ' + '+ Full Tier 1 (FBRef/Opta)'.padEnd(32) +
    `${(projT1Conf * 100).toFixed(0)}%`.padStart(12) +
    `${Math.exp(-projT1Range).toFixed(2)}x - ${Math.exp(projT1Range).toFixed(2)}x`.padStart(20)
  );

  // Projected: with full Tier 1 + Tier 2
  const projT12Conf = (8 * 1.0 + 4 * 1.5) / MAX_POSSIBLE_WEIGHT;
  const projT12Range = 0.92 * (0.7 + 0.3 * projT12Conf);
  console.log(
    '  ' + '+ Full Tier 2 (tracking data)'.padEnd(32) +
    `${(projT12Conf * 100).toFixed(0)}%`.padStart(12) +
    `${Math.exp(-projT12Range).toFixed(2)}x - ${Math.exp(projT12Range).toFixed(2)}x`.padStart(20)
  );

  // Projected: full data
  console.log(
    '  ' + '+ Full Tier 3 (scouting)'.padEnd(32) +
    `100%`.padStart(12) +
    `${Math.exp(-0.92).toFixed(2)}x - ${Math.exp(0.92).toFixed(2)}x`.padStart(20)
  );

  console.log(
    '\n  Higher confidence = wider multiplier range = more differentiated valuations.'
  );
  console.log(
    '  With full 118-dim data, the engine can detect value invisible to market pricing.'
  );
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
