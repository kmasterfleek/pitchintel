/**
 * PitchIntel Women — frontier corpus runner.
 *
 * Runs the real valuation engine (player-vector.ts, untouched) over the
 * women's frontier corpus against six frontier-active buyer clubs, and
 * demonstrates the core product loop for scarce-data football:
 *
 *   1. Corpus overview — how much of each player's 118-dim vector the public
 *      record actually supports (the honesty table).
 *   2. Context valuations — value, multiplier, verdict, and CONFIDENCE per
 *      club. Low confidence is not a failure state; it is the product.
 *   3. Scout-trip ROI — a simulated research ladder on the zero-data player:
 *      what one tournament video session, then one in-person Tier-3 report,
 *      does to confidence and context value. Missing dimensions are the
 *      scouting task list.
 *
 * Usage: npm run women
 */

import { getWomensFrontier } from './data/women/frontier.js';
import { getWomensClubs } from './data/women/clubs.js';
import {
  computeEnhancedValuation,
  vectorCompleteness,
  type PlayerVector,
} from './player-vector.js';

const hr = (c = '─') => console.log(c.repeat(78));
const hdr = (t: string) => { console.log(); hr('═'); console.log(`  ${t}`); hr('═'); };

const money = (m: number) => m >= 1 ? `€${m.toFixed(2)}M` : `€${Math.round(m * 1000)}K`;
// The engine rounds contextValue to €0.1M (men's-market resolution); women's
// fees live below that, so display base × unrounded multiplier instead.
const ctxValue = (v: { marketValue: number; multiplier: number }) => v.marketValue * v.multiplier;
const pct = (x: number) => `${Math.round(x * 100)}%`;

const dossiers = getWomensFrontier();
const clubs = getWomensClubs();

console.log('PitchIntel Women — Frontier Corpus');
console.log(`Corpus snapshot: ${dossiers[0].asOf} · ${dossiers.length} players · ${clubs.length} buyer clubs`);
console.log('Research dossiers: intel/2026-08-02-*.md (all claims sourced)');

// ── 1. Corpus overview ──────────────────────────────────────────────
hdr('1. THE HONESTY TABLE — what the public record supports');
console.log('  Player                    Pos  Age  Footprint  Dims (T1/T2/T3)   Vector');
hr();
for (const d of dossiers) {
  const c = vectorCompleteness(d.vector);
  const name = `${d.flag} ${d.vector.name}`.padEnd(27);
  const dims = `${String(c.tier1).padStart(2)}/${String(c.tier2).padStart(2)}/${String(c.tier3).padStart(2)}`;
  console.log(
    `  ${name}${d.vector.position.padEnd(5)}${String(d.vector.age).padEnd(5)}` +
    `${d.footprint.padEnd(11)}${dims.padEnd(18)}${pct(c.total / c.maxTotal)}`,
  );
}
console.log();
console.log('  Rule: a dimension is populated only where evidence supports an estimate.');
console.log('  Empty is honest. The engine prices what it knows and says how much that is.');

// ── 2. Context valuations ───────────────────────────────────────────
hdr('2. CONTEXT VALUATIONS — best fits per player (real engine, no re-implementation)');
for (const d of dossiers) {
  const vals = clubs
    .filter(t => t.name !== d.vector.club)
    .map(t => computeEnhancedValuation(d.vector, t))
    .sort((a, b) => b.multiplier - a.multiplier);
  const best = vals.slice(0, 3);
  const conf = best[0]?.confidence ?? 0;
  console.log();
  console.log(`  ${d.flag} ${d.vector.name} — ${d.vector.position}, ${d.vector.club} (${d.vector.league})`);
  console.log(`     base ${money(d.vector.marketValue)} · engine confidence ${pct(conf)} · ${d.footprint.toUpperCase()}`);
  for (const v of best) {
    const line = `     → ${v.team.padEnd(24)} ${money(ctxValue(v)).padStart(8)}  ${v.multiplier.toFixed(2)}x  ${v.verdict.toUpperCase().padEnd(8)} ${v.factors.length} factors active`;
    console.log(line);
  }
  if (best[0] && best[0].topPositive) console.log(`     driver: ${best[0].topPositive}`);
}

// ── 3. Scout-trip ROI ladder ────────────────────────────────────────
hdr('3. SCOUT-TRIP ROI — Aissatou Fall (CB, 19, Senegalese D1): zero data → priced asset');
console.log('  Every number below stage 0 is a SIMULATED research product, to show what');
console.log('  each unit of scouting work is worth. Stage 1 = one WAFCON video session');
console.log('  (her matches are being broadcast RIGHT NOW — first full footage of her');
console.log('  career). Stage 2 = one in-person Tier-3 scout report.');

const fall = dossiers.find(d => d.vector.name === 'Aissatou Fall')!;

const stage1: PlayerVector = {
  ...fall.vector,
  // Tier 1/2 estimates a video analyst could produce from tournament film
  passCompletionShort: 0.85, passCompletionMedium: 0.8, passCompletionLong: 0.6,
  tacklesPer90: 2.8, interceptionsPer90: 1.8, clearancesPer90: 5.5,
  aerialDuelsWonPct: 0.62, pressuresPer90: 14,
  topSpeed: 30, sprintsPerMatch: 14,
  avgX: -34, avgY: 0,
};

const stage2: PlayerVector = {
  ...stage1,
  // Tier 3 subjective dims from an in-person report
  positionalAwareness: 7, decisionMakingSpeed: 6, pressReadingAbility: 6,
  composureUnderPress: 7, oneOnOneDefending: 7, recoverySpeed: 8,
  aerialPresence: 7, mentality: 8, adaptability: 7, coachability: 8,
  leadershipPresence: 6, injuryProneness: 3,
};

const stages: Array<[string, PlayerVector]> = [
  ['Stage 0 — corpus as-is (identity only)', fall.vector],
  ['Stage 1 — + WAFCON video session (T1/T2 estimates)', stage1],
  ['Stage 2 — + in-person Tier-3 scout report', stage2],
];

for (const [label, vec] of stages) {
  const comp = vectorCompleteness(vec);
  const vals = clubs
    .filter(t => t.name !== vec.club)
    .map(t => computeEnhancedValuation(vec, t))
    .sort((a, b) => b.multiplier - a.multiplier);
  const best = vals[0];
  console.log();
  console.log(`  ${label}`);
  console.log(
    `     dims ${comp.total}/${comp.maxTotal} · best fit ${best.team}: ` +
    `${money(ctxValue(best))} (${best.multiplier.toFixed(2)}x, ${best.verdict.toUpperCase()}) ` +
    `· confidence ${pct(best.confidence)} · ${best.factors.length} factors active`,
  );
  if (best.topPositive) console.log(`     driver: ${best.topPositive}`);
}

console.log();
hr();
console.log('  The loop: research fills dimensions → confidence rises → the valuation');
console.log('  becomes decision-grade. The engine tells the DoF exactly which trip to');
console.log('  fund next. That is PitchIntel Women.');
hr();
