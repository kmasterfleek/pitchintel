/**
 * Northbridge United — the fictional "mature PitchIntel club" for the
 * enterprise demo. A well-run, data-driven Premier League side that has
 * used PitchIntel for three seasons: full tracking integration (Tier 2)
 * and a scouting department that files Tier 3 assessments as routine.
 *
 * Exports:
 *   NB_CONTEXT — the club's TeamContext
 *   buildSquad() — 18 players with ALL three tiers populated (~112 dims)
 *   NB_SQUAD_META — narrative flags / recommendations / notes per player
 *   NB_SEED — mature shortlist state (targets from the real player DB,
 *             multi-report histories, authored scout notes)
 *   NB_FEED — "Today" morning-briefing feed + decision log
 */

import type { PlayerVector } from './player-vector.js';
import type { TeamContext } from './data/teams-db.js';

// ─── Club context ─────────────────────────────────────────────────────

export const NB_CONTEXT: TeamContext = {
  name: 'Northbridge United',
  league: 'Premier League',
  budget: 65,
  formation: '4-2-3-1',
  style: 'pressing',
  avgMincut: 0.66,
  networkDensity: 0.8,
  weakestZone: 'right wing',
  hubPlayer: 'Tomas Vrana',
  hubDependency: 0.58,
  pressEfficiency: 0.52,
  positionDepth: new Map([
    ['GK', 2], ['CB', 4], ['LB', 1], ['RB', 2], ['CDM', 2], ['CM', 3],
    ['CAM', 2], ['LM', 2], ['RM', 2], ['LW', 2], ['RW', 1], ['ST', 2],
  ]),
  avgPlayerCentrality: 0.27,
  avgPlayerConnections: 7.2,
};

// ─── Squad definition ─────────────────────────────────────────────────
// quality: 1-10 overall level. overrides: narrative-specific dimensions.

interface SquadDef {
  name: string;
  age: number;
  position: string;
  marketValue: number;
  contractYearsLeft: number;
  nationality: string;
  quality: number;
  overrides?: Partial<PlayerVector>;
}

const SQUAD: SquadDef[] = [
  { name: 'Emil Brandt', age: 28, position: 'GK', marketValue: 18, contractYearsLeft: 3, nationality: 'Denmark', quality: 7 },
  { name: 'Aleks Nowak', age: 21, position: 'GK', marketValue: 4, contractYearsLeft: 4, nationality: 'Poland', quality: 5 },
  { name: 'Kofi Mensah', age: 24, position: 'RB', marketValue: 22, contractYearsLeft: 4, nationality: 'Ghana', quality: 7,
    overrides: { topSpeed: 35.1, sprintsPerMatch: 31, runsBehindLinePer90: 4.2 } },
  { name: 'Liam Carter', age: 20, position: 'RB', marketValue: 6, contractYearsLeft: 3, nationality: 'England', quality: 5,
    overrides: { coachability: 9 } },
  { name: 'Dario Kovac', age: 31, position: 'LB', marketValue: 8, contractYearsLeft: 1, nationality: 'Croatia', quality: 6,
    overrides: { recoverySpeed: 4, topSpeed: 31.2, injuryProneness: 6, positionalAwareness: 9, leadershipPresence: 8 } },
  { name: 'Marcus Whitfield', age: 32, position: 'CB', marketValue: 6, contractYearsLeft: 1, nationality: 'England', quality: 6,
    overrides: { organizationalVoice: 10, leadershipPresence: 10, dressingRoomEffect: 9, mentality: 9,
                 recoverySpeed: 3, topSpeed: 30.4, positionalAwareness: 9, oneOnOneDefending: 6 } },
  { name: 'Youssef Benali', age: 23, position: 'CB', marketValue: 32, contractYearsLeft: 4, nationality: 'Morocco', quality: 8,
    overrides: { recoverySpeed: 9, composureUnderPress: 8, topSpeed: 34.6 } },
  { name: 'Jonas Weiss', age: 26, position: 'CB', marketValue: 15, contractYearsLeft: 3, nationality: 'Austria', quality: 6 },
  { name: 'Ed Hartley', age: 22, position: 'CB', marketValue: 8, contractYearsLeft: 4, nationality: 'England', quality: 5,
    overrides: { coachability: 9, aerialPresence: 8 } },
  { name: 'Tomas Vrana', age: 27, position: 'CDM', marketValue: 38, contractYearsLeft: 3, nationality: 'Czechia', quality: 8,
    overrides: { pageRankCentrality: 0.34, betweennessCentrality: 0.41, passingConnections: 10.8,
                 networkImpactOnRemoval: 0.31, hubScore: 0.86, pressReadingAbility: 9,
                 decisionMakingSpeed: 9, passUnderPressureAccuracy: 0.91 } },
  { name: 'Ibrahim Sylla', age: 24, position: 'CDM', marketValue: 14, contractYearsLeft: 4, nationality: 'Senegal', quality: 6 },
  { name: 'Jesper Lindholm', age: 25, position: 'CM', marketValue: 24, contractYearsLeft: 4, nationality: 'Sweden', quality: 7,
    overrides: { pressuresPer90: 26.4, counterpressingRecoveries: 8.1, pressingChainParticipation: 0.74 } },
  { name: 'Rafa Ortiz', age: 29, position: 'CM', marketValue: 12, contractYearsLeft: 2, nationality: 'Spain', quality: 6 },
  { name: 'Santi Herrera', age: 22, position: 'CAM', marketValue: 45, contractYearsLeft: 4, nationality: 'Uruguay', quality: 9,
    overrides: { clutchFactor: 9, performanceInBigMoments: 0.86, keyPassesPer90: 3.1, xAper90: 0.42,
                 fanAppeal: 9, mentality: 9, performanceVsTopTeams: 0.78 } },
  { name: 'Adama Diallo', age: 21, position: 'LW', marketValue: 18, contractYearsLeft: 5, nationality: 'Mali', quality: 7,
    overrides: { coachability: 9, topSpeed: 35.4, dribblesPer90: 4.6, dribbleSuccessRate: 0.58 } },
  { name: 'Charlie Dunn', age: 19, position: 'RW', marketValue: 5, contractYearsLeft: 4, nationality: 'England', quality: 4,
    overrides: { coachability: 8, decisionMakingSpeed: 4 } },
  { name: 'Viktor Petrov', age: 29, position: 'ST', marketValue: 28, contractYearsLeft: 2, nationality: 'Bulgaria', quality: 7,
    overrides: { holdUpPlayQuality: 8, movementInBox: 8, xGper90: 0.58, goalsMinusXG: 3.2 } },
  { name: 'Danilo Rocha', age: 20, position: 'ST', marketValue: 9, contractYearsLeft: 5, nationality: 'Brazil', quality: 5,
    overrides: { runTiming: 7, coachability: 8 } },
];

// ─── Full-vector generator ────────────────────────────────────────────
// Deterministic: same input → same squad. Quality scales the level,
// per-field jitter keeps it organic, overrides carry the narrative.

function mkRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

type Role = 'GK' | 'DEF' | 'FB' | 'DM' | 'MID' | 'AM' | 'W' | 'ST';
function roleOf(pos: string): Role {
  if (pos === 'GK') return 'GK';
  if (pos === 'CB') return 'DEF';
  if (pos === 'LB' || pos === 'RB') return 'FB';
  if (pos === 'CDM') return 'DM';
  if (pos === 'CM') return 'MID';
  if (pos === 'CAM') return 'AM';
  if (pos === 'LW' || pos === 'RW' || pos === 'LM' || pos === 'RM') return 'W';
  return 'ST';
}

export function buildSquad(): PlayerVector[] {
  return SQUAD.map(def => {
    const rand = mkRand('northbridge:' + def.name);
    const q = def.quality / 10; // 0.4 - 0.9
    const role = roleOf(def.position);
    // v(lo, hi, dp): quality-scaled value with jitter
    const v = (lo: number, hi: number, dp = 2) => {
      const x = lo + (hi - lo) * (0.35 * rand() + 0.65 * q);
      const m = Math.pow(10, dp);
      return Math.round(x * m) / m;
    };
    const ten = (lo = 4, hi = 9) => Math.max(1, Math.min(10, Math.round(v(lo, hi, 0))));
    const def_ = role === 'DEF' || role === 'FB' || role === 'DM';
    const att = role === 'W' || role === 'ST' || role === 'AM';

    const vec: PlayerVector = {
      name: def.name,
      age: def.age,
      position: def.position,
      club: 'Northbridge United',
      league: 'Premier League',
      nationality: def.nationality,
      marketValue: def.marketValue,
      contractYearsLeft: def.contractYearsLeft,

      // Tier 1 — passing
      passCompletionShort: v(0.82, 0.93),
      passCompletionMedium: v(0.76, 0.89),
      passCompletionLong: v(0.52, 0.74),
      progressivePassesPer90: v(def_ ? 3.5 : 4.5, def_ ? 7 : 9, 1),
      keyPassesPer90: v(att ? 1.4 : 0.4, att ? 3 : 1.6, 1),
      throughBallsPer90: v(att ? 0.4 : 0.1, att ? 1.4 : 0.5, 1),
      crossesPer90: v(role === 'FB' || role === 'W' ? 2.5 : 0.3, role === 'FB' || role === 'W' ? 6 : 1.5, 1),
      crossAccuracy: v(0.2, 0.38),
      switchPlayPer90: v(0.5, 2.5, 1),
      passesIntoFinalThird: v(def_ ? 4 : 3, def_ ? 9 : 8, 1),
      passesIntoPenaltyArea: v(att ? 1.5 : 0.4, att ? 4 : 1.8, 1),
      avgPassDistance: v(role === 'DEF' ? 16 : 10, role === 'DEF' ? 24 : 16, 1),
      // shooting
      xGper90: v(role === 'ST' ? 0.42 : att ? 0.25 : 0.04, role === 'ST' ? 0.68 : att ? 0.48 : 0.14),
      xGperShot: v(0.08, 0.16),
      goalsMinusXG: v(-1.5, 3, 1),
      shotsOnTargetPct: v(0.3, 0.48),
      shotDistanceAvg: v(12, 19, 1),
      shotsFromInsideBoxPct: v(0.5, 0.8),
      freeKickGoals: Math.round(v(0, 2, 0)),
      penaltyConversion: v(0.7, 0.9),
      // creation
      xAper90: v(att ? 0.18 : 0.04, att ? 0.38 : 0.14),
      shotCreatingActionsPer90: v(att ? 3 : 1, att ? 5.5 : 2.5, 1),
      goalCreatingActionsPer90: v(att ? 0.5 : 0.1, att ? 1.1 : 0.4, 1),
      progressiveCarriesPer90: v(att ? 4 : 1.5, att ? 8 : 4, 1),
      carriesIntoFinalThird: v(1, 4, 1),
      carriesIntoPenaltyArea: v(att ? 1 : 0.2, att ? 3 : 0.8, 1),
      dribbleSuccessRate: v(0.42, 0.6),
      dribblesPer90: v(att ? 2 : 0.5, att ? 4.5 : 1.5, 1),
      // defending
      tacklesPer90: v(def_ ? 2.2 : 0.8, def_ ? 3.8 : 2, 1),
      tackleWinPct: v(0.55, 0.72),
      interceptionsPer90: v(def_ ? 1.4 : 0.4, def_ ? 2.4 : 1.1, 1),
      blocksPer90: v(def_ ? 1 : 0.2, def_ ? 2 : 0.8, 1),
      clearancesPer90: v(role === 'DEF' ? 3.5 : 0.5, role === 'DEF' ? 6 : 1.5, 1),
      aerialDuelsWonPct: v(role === 'DEF' || role === 'ST' ? 0.55 : 0.4, role === 'DEF' || role === 'ST' ? 0.72 : 0.55),
      foulsCommittedPer90: v(0.6, 1.6, 1),
      yellowCardsPer90: v(0.08, 0.28),
      dribblersTackledPct: v(0.5, 0.68),
      challengesLostPer90: v(0.6, 1.4, 1),
      // pressing (we are a pressing side — everyone works)
      pressuresPer90: v(14, 24, 1),
      pressureSuccessRate: v(0.28, 0.4),
      pressuresAttThirdPct: v(att ? 0.35 : 0.12, att ? 0.5 : 0.25),
      pressuresMidThirdPct: v(0.35, 0.5),
      pressuresDefThirdPct: v(def_ ? 0.35 : 0.15, def_ ? 0.5 : 0.3),
      counterpressingRecoveries: v(4, 7.5, 1),
      ppda: v(8, 12, 1),
      pressureTriggerRate: v(0.4, 0.62),
      // physical
      topSpeed: v(31.5, 35, 1),
      avgMatchSpeed: v(6.8, 7.6, 1),
      sprintsPerMatch: Math.round(v(16, 28, 0)),
      highSpeedRunsPerMatch: Math.round(v(35, 60, 0)),
      distancePerMatch: v(9.8, 11.8, 1),
      accelerationsPer90: Math.round(v(30, 55, 0)),

      // Tier 2 — tracking-derived (we own this data)
      avgX: role === 'GK' ? -48 : role === 'DEF' ? v(-38, -28, 0) : role === 'FB' ? v(-25, -10, 0)
        : role === 'DM' ? v(-15, -5, 0) : role === 'MID' ? v(-5, 5, 0) : role === 'AM' ? v(8, 18, 0)
        : role === 'W' ? v(12, 24, 0) : v(22, 32, 0),
      avgY: v(-20, 20, 0),
      positionHeatmapEntropy: v(0.45, 0.75),
      territoryControlled: v(80, 160, 0),
      spaceCreatedPerRun: v(2, 6, 1),
      offBallRunsPerMatch: Math.round(v(12, 30, 0)),
      runsBehindLinePer90: v(att ? 2 : 0.3, att ? 5 : 1.5, 1),
      avgDistFromBall: v(18, 30, 1),
      avgDistFromTeamCentroid: v(8, 20, 1),
      widthContribution: v(0.2, role === 'FB' || role === 'W' ? 0.85 : 0.5),
      depthContribution: v(0.2, att ? 0.8 : 0.45),
      defensiveLineHeight: v(0.55, 0.75),
      pageRankCentrality: v(0.14, 0.3),
      betweennessCentrality: v(0.1, 0.35),
      clusteringCoefficient: v(0.4, 0.65),
      passingConnections: v(5.5, 9.5, 1),
      avgPassEdgeWeight: v(0.24, 0.4),
      receivingFrequency: v(0.5, 0.9),
      passUnderPressureRate: v(0.2, 0.4),
      passUnderPressureAccuracy: v(0.7, 0.88),
      networkImpactOnRemoval: v(0.05, 0.22),
      hubScore: v(0.3, 0.65),
      teamMincutWith: v(0.62, 0.7),
      teamMincutWithout: v(0.55, 0.66),
      mincutContribution: v(0.02, 0.1),
      formationComplianceScore: v(0.72, 0.93),
      coverShadowArea: v(20, 45, 0),
      pressingChainParticipation: v(0.45, 0.7),
      defensiveTransitionSpeed: v(3.5, 5.5, 1),
      offensiveTransitionSpeed: v(3.5, 5.8, 1),
      performanceWhenWinning: v(0.55, 0.75),
      performanceWhenLosing: v(0.45, 0.7),
      performanceWhenDrawing: v(0.5, 0.72),
      last15minPerformance: v(0.45, 0.72),
      performanceVsTopTeams: v(0.42, 0.68),
      performanceInBigMoments: v(0.45, 0.72),

      // Tier 3 — three seasons of internal scouting
      positionalAwareness: ten(),
      decisionMakingSpeed: ten(),
      pressReadingAbility: ten(5, 9),
      transitionReading: ten(),
      setPlayIntelligence: ten(),
      coachability: ten(5, 9),
      mentality: ten(),
      leadershipPresence: ten(3, 8),
      cultureFit: ten(6, 9),
      mediaHandling: ten(4, 8),
      adaptability: ten(),
      injuryProneness: Math.max(1, Math.min(10, Math.round(2 + rand() * 4))),
      holdUpPlayQuality: ten(),
      aerialPresence: ten(),
      runTiming: ten(),
      movementInBox: ten(),
      oneOnOneDefending: ten(),
      organizationalVoice: ten(3, 8),
      recoverySpeed: ten(),
      composureUnderPress: ten(),
      clutchFactor: ten(4, 8),
      dressingRoomEffect: ten(5, 9),
      fanAppeal: ten(3, 8),
      agentDifficulty: Math.max(1, Math.min(10, Math.round(2 + rand() * 5))),
    };
    return Object.assign(vec, def.overrides || {});
  });
}

// ─── Squad narrative metadata ─────────────────────────────────────────

export interface SquadMeta {
  flags: string[];
  rec: { label: string; cls: 'green' | 'gold' | 'red' | 'blue' };
  note: string;
}

export const NB_SQUAD_META: Record<string, SquadMeta> = {
  'Emil Brandt': { flags: [], rec: { label: 'HOLD', cls: 'blue' },
    note: 'Steady. Distribution suits the press-resistant build-up. No action needed.' },
  'Aleks Nowak': { flags: ['academy'], rec: { label: 'DEVELOP', cls: 'blue' },
    note: 'Loan with a recall clause discussed for January if minutes stay scarce.' },
  'Kofi Mensah': { flags: ['tier-2 standout'], rec: { label: 'EXTEND', cls: 'green' },
    note: 'Tracking data shows elite recovery sprints. Extend before the market notices.' },
  'Liam Carter': { flags: ['academy'], rec: { label: 'DEVELOP', cls: 'blue' },
    note: 'High coachability score. Ready for cup starts.' },
  'Dario Kovac': { flags: ['aging', 'final year'], rec: { label: 'SUCCESSION', cls: 'gold' },
    note: 'Recovery speed now 4/10 and the league is getting faster. Succession is this window’s priority — see LB shortlist.' },
  'Marcus Whitfield': { flags: ['captain', 'aging', 'final year'], rec: { label: 'EXTEND 1YR (MENTOR)', cls: 'gold' },
    note: 'Organizational voice 10/10 — the engine measures his absence in MinCut. Extend as third CB and dressing-room anchor while Benali inherits the line.' },
  'Youssef Benali': { flags: ['rising', 'wanted'], rec: { label: 'HOLD — NOT FOR SALE', cls: 'green' },
    note: 'Signed €18M (Jan 2025) on a 4-report consensus; internal valuation now €42M. Two top-6 clubs sniffing. Do not engage below €55M.' },
  'Jonas Weiss': { flags: [], rec: { label: 'HOLD', cls: 'blue' },
    note: 'Reliable rotation. Profile overlaps Hartley long-term — one of them moves in 2027.' },
  'Ed Hartley': { flags: ['academy'], rec: { label: 'DEVELOP', cls: 'blue' },
    note: 'Aerial presence already senior-level. Whitfield is personally mentoring him.' },
  'Tomas Vrana': { flags: ['hub', 'dependency risk'], rec: { label: 'EXTEND + INSURE', cls: 'gold' },
    note: 'Highest network-removal impact in the squad (0.31). The engine has flagged hub dependency for two seasons — Sylla’s minutes are the mitigation plan.' },
  'Ibrahim Sylla': { flags: [], rec: { label: 'HOLD', cls: 'blue' },
    note: 'The Vrana insurance policy. Needs 1,200+ minutes this season by plan.' },
  'Jesper Lindholm': { flags: ['pressing engine'], rec: { label: 'EXTEND', cls: 'green' },
    note: 'Top-1% counterpressing recoveries. Exactly why we bought him — resign to 2030.' },
  'Rafa Ortiz': { flags: [], rec: { label: 'SELL IF €10M+', cls: 'red' },
    note: 'Good pro, but the squad profile is younger and faster now. Fair offer moves him.' },
  'Santi Herrera': { flags: ['crown jewel', 'bid expected'], rec: { label: 'HOLD UNLESS €80M+', cls: 'green' },
    note: 'Internal valuation €68M vs €45M market — clutch factor 9, big-moment performance 0.86. A €60M bid is expected this week; the board one-pager is ready.' },
  'Adama Diallo': { flags: ['academy graduate', 'breakout'], rec: { label: 'EXTEND NOW', cls: 'green' },
    note: 'Cost the academy nothing; internal valuation already 1.3x market and climbing. New deal before agents restructure.' },
  'Charlie Dunn': { flags: ['academy', 'not ready'], rec: { label: 'LOAN', cls: 'blue' },
    note: 'Decision-making 4/10 needs senior football. Championship loan lined up — which is why RW is a shortlist priority.' },
  'Viktor Petrov': { flags: ['contract decision'], rec: { label: 'EXTEND 2YR', cls: 'gold' },
    note: '18 goals, hold-up 8/10, and the pressing numbers still hold. Two years, not four — age curve says decline from 31.' },
  'Danilo Rocha': { flags: ['project'], rec: { label: 'DEVELOP', cls: 'blue' },
    note: 'Run timing already 7/10. The plan: 900 league minutes this season behind Petrov.' },
};

export const NB_SQUAD_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

// ─── Mature shortlist seed ────────────────────────────────────────────
// Targets are real players from the curated DB, resolved by name at
// runtime. flavor drives the generated Tier 3 values; notes are authored.

export interface SeedReport { scout: string; date: string; flavor: string; note: string; }
export interface SeedTarget { player: string; scout: string; reports: SeedReport[]; }

export const NB_SEED: SeedTarget[] = [
  { player: 'Federico Chiesa', scout: 'mv', reports: [
    { scout: 'mv', date: '14 May', flavor: 'gem',
      note: 'First live viewing, 90 minutes vs Roma. The public numbers undersell him — movement between the lines is elite and he presses like one of ours already. Fitness record is the only question.' },
    { scout: 'so', date: '2 Jun', flavor: 'gem',
      note: 'Second opinion as requested. Agree with Marta on almost everything. Right side is clearly his best role — fits our RW hole exactly. Personality checks clean, hungry after a stop-start season.' },
    { scout: 'jb', date: '28 Jun', flavor: 'solid',
      note: 'Devil’s advocate viewing. Still very good, but I’d flag the injury history harder than the room is — structure the deal with appearance clauses and we’re covered.' },
  ]},
  { player: 'Mohamed-Ali Cho', scout: 'll', reports: [
    { scout: 'll', date: '20 May', flavor: 'gem',
      note: 'The upside bet. At 20 he already does two things at elite level: first touch under pressure and the blind-side run. €18M is a rounding error if the curve holds.' },
    { scout: 'mv', date: '11 Jun', flavor: 'split-low',
      note: 'Cooler on him than Lars. The tools are real but decision-making under fatigue drops sharply after 60 minutes. Development buy, not a starter this season. Don’t pay starter money.' },
  ]},
  { player: 'Ademola Lookman', scout: 'so', reports: [
    { scout: 'so', date: '18 Jun', flavor: 'solid',
      note: 'Ready-now option. Final-third production is genuine and repeatable. But €55M takes most of the window budget — only makes sense if the Herrera bid lands and we reinvest.' },
  ]},
  { player: 'Nico Schlotterbeck', scout: 'll', reports: [
    { scout: 'll', date: '25 May', flavor: 'gem',
      note: 'The Whitfield succession answer. Left-footed, aggressive front-defending, exactly the high-line profile. Vocal for his age — the leadership tier-3s are not a projection, I watched him organize a back line at 1-0 down away.' },
    { scout: 'jb', date: '15 Jun', flavor: 'solid',
      note: 'Confirmed. Occasional rush of blood — one red-zone error per ~6 matches in my sample — but Whitfield mentoring him for a season fixes that. Push before a top-6 club moves.' },
  ]},
  { player: 'Castello Lukeba', scout: 'mv', reports: [
    { scout: 'mv', date: '30 Jun', flavor: 'solid',
      note: 'Younger alternative to Schlotterbeck. Higher ceiling, lower floor. If we miss on Nico, this is the pivot — do not enter a bidding war for both.' },
  ]},
  { player: 'Alejandro Grimaldo', scout: 'jb', reports: [
    { scout: 'jb', date: '8 Jun', flavor: 'solid',
      note: 'The LB market is thin this window — he’s the only scouted option that clearly upgrades Kovac. At 29 the fee needs to reflect resale zero. Set-piece delivery alone changes our xG on dead balls.' },
    { scout: 'll', date: '1 Jul', flavor: 'solid',
      note: 'Agree on quality, flag on age curve. My recommendation: 2 years + option, €30M ceiling. If Leverkusen hold at €40M, we wait for January.' },
  ]},
  { player: 'Jonathan Tah', scout: 'so', reports: [
    { scout: 'so', date: '22 Apr', flavor: 'kill',
      note: 'KILLED after full workup. Player is fine; the deal is not. Profile duplicates Weiss, wage demand breaks our structure, and the agent wants a release clause we’d regret. Engine agrees — redundancy factor deeply negative. Money saved: ~€30M. Moving on.' },
  ]},
  { player: 'Elye Wahi', scout: 'jb', reports: [] },
];

// ─── Today briefing feed ──────────────────────────────────────────────

export interface FeedItem {
  time: string;
  icon: string;
  title: string;
  body: string;
  action?: { label: string; view?: string; player?: string };
}

export const NB_FEED: FeedItem[] = [
  { time: '07:42', icon: '&#128225;',
    title: 'New report: Grimaldo (report #2, Lars Lindqvist)',
    body: 'Filed overnight after the full 90 in Leverkusen’s friendly. Agrees on quality, flags the age curve — recommends 2yr + option at a €30M ceiling.',
    action: { label: 'Review on dashboard', player: 'Alejandro Grimaldo' } },
  { time: '07:15', icon: '&#9888;&#65039;',
    title: 'Contract alert: Dario Kovac enters final 12 months',
    body: 'Succession pipeline has one scouted LB (Grimaldo, 2 reports). Market is thin — decision needed before the window closes.',
    action: { label: 'Open LB shortlist', view: 'dashboard' } },
  { time: '06:50', icon: '&#128176;',
    title: 'Board query: Herrera valuation one-pager',
    body: 'A €60M bid is expected this week. Internal valuation €68M (confidence 100%, full 118-dim). Recommendation stands: hold unless €80M+.',
    action: { label: 'Open squad card', view: 'squad' } },
  { time: 'yesterday', icon: '&#128200;',
    title: 'Wahi assigned to Jimmy Barnes',
    body: 'Opportunistic ST tracking — Petrov extension talks are open, but cover the downside. First report due after Saturday’s match.',
    action: { label: 'Scouting desk', view: 'assignments' } },
  { time: 'yesterday', icon: '&#9989;',
    title: 'Chiesa file complete: 3 reports, consensus BARGAIN',
    body: 'All three scouts aligned (Jimmy with clauses). File is board-ready — recommend opening talks with Liverpool this week.',
    action: { label: 'Review file', player: 'Federico Chiesa' } },
];

export const NB_DECISIONS: { date: string; text: string }[] = [
  { date: 'Jan 2026', text: 'Sold Nico Reyes (RW) €35M — bought €9M in 2023. Engine flagged redundancy with Diallo’s emergence; proceeds fund this window.' },
  { date: 'Jan 2025', text: 'Signed Youssef Benali (CB) €18M on 4-report consensus. Internal valuation today: €42M (+133%).' },
  { date: 'Aug 2024', text: 'Passed on €48M striker the room loved. Engine: dependency risk + redundancy. He has 4 goals in 18 months since.' },
  { date: 'Aug 2024', text: 'Signed Jesper Lindholm (CM) €11M — tier-2 pressing metrics top-1%. Now valued €24M.' },
];
