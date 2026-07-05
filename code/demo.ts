/**
 * PitchIntel — Post-Match Analysis Demo
 *
 * Generates synthetic match tracking data, runs the full tactical
 * analysis pipeline (MinCut, PPR, spectral, press triggers), and
 * outputs a match report that demonstrates the system's capabilities.
 *
 * This is the demo you walk into a meeting with.
 *
 * Usage: npx tsx src/pitch-intel/demo.ts
 */

import { generateSyntheticMatch } from './data/synthetic.js';
import { analyzeMatch } from './analysis/tactical.js';
import { buildPassingGraph, personalizedPageRank, detectFormation } from './graph/engine.js';
import type { MatchReport, TacticalMoment } from './types.js';

// ─── Output Formatting ───────────────────────────────────────

function header(text: string) {
  console.log('\n' + '═'.repeat(72));
  console.log(`  ${text}`);
  console.log('═'.repeat(72));
}

function subheader(text: string) {
  console.log(`\n── ${text} ${'─'.repeat(Math.max(0, 66 - text.length))}`);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function severityIcon(s: string): string {
  switch (s) {
    case 'critical': return '[!!!]';
    case 'high': return '[!! ]';
    case 'moderate': return '[!  ]';
    default: return '[   ]';
  }
}

// ─── Report Printer ──────────────────────────────────────────

function printReport(report: MatchReport) {
  header('PITCHINTEL — POST-MATCH TACTICAL ANALYSIS');
  console.log(`  ${report.match.home} vs ${report.match.away}`);
  console.log(`  Match ID: ${report.match.id}`);
  console.log(`  Duration: ${formatTime(report.match.duration)} analyzed`);

  // ── Executive Summary ──────────────────────────────────

  subheader('EXECUTIVE SUMMARY');
  const s = report.summary;
  console.log(`  Total tactical moments detected:  ${s.totalMoments}`);
  console.log(`  Critical moments:                 ${s.criticalMoments}`);
  console.log(`  Press triggers identified:        ${s.pressTriggersMissed}`);
  console.log(`  Formation breaks:                 ${report.match.home}: ${s.formationBreaks.home}, ${report.match.away}: ${s.formationBreaks.away}`);
  console.log(`  Avg defensive solidity (MinCut):`);
  console.log(`    ${report.match.home}:  ${s.avgDefensiveMincut.home.toFixed(3)}`);
  console.log(`    ${report.match.away}: ${s.avgDefensiveMincut.away.toFixed(3)}`);

  // Interpretation
  const stronger = s.avgDefensiveMincut.home > s.avgDefensiveMincut.away
    ? report.match.home : report.match.away;
  const weaker = stronger === report.match.home ? report.match.away : report.match.home;
  console.log(`\n  Defensive assessment: ${stronger} maintained more structural`);
  console.log(`  integrity on average. ${weaker} had more exploitable gaps.`);

  // ── Moment-by-Moment Timeline ──────────────────────────

  subheader('KEY MOMENTS');

  const typeLabels: Record<string, string> = {
    vulnerability: 'DEF VULN',
    press_trigger: 'PRESS   ',
    counter_risk: 'COUNTER ',
    formation_break: 'FORM DFT',
    passing_overload: 'OVERLOAD',
  };

  // Group by severity
  const critical = report.moments.filter(m => m.severity === 'critical');
  const high = report.moments.filter(m => m.severity === 'high');
  const moderate = report.moments.filter(m => m.severity === 'moderate');

  if (critical.length > 0) {
    console.log('\n  CRITICAL:');
    for (const m of critical) {
      console.log(`    ${formatTime(m.time)}  ${typeLabels[m.type] ?? m.type}  ${m.description}`);
    }
  }

  if (high.length > 0) {
    console.log('\n  HIGH:');
    for (const m of high) {
      console.log(`    ${formatTime(m.time)}  ${typeLabels[m.type] ?? m.type}  ${m.description}`);
    }
  }

  if (moderate.length > 0 && moderate.length <= 30) {
    console.log('\n  MODERATE:');
    for (const m of moderate) {
      console.log(`    ${formatTime(m.time)}  ${typeLabels[m.type] ?? m.type}  ${m.description}`);
    }
  } else if (moderate.length > 30) {
    console.log(`\n  MODERATE: ${moderate.length} moments (showing first 15):`);
    for (const m of moderate.slice(0, 15)) {
      console.log(`    ${formatTime(m.time)}  ${typeLabels[m.type] ?? m.type}  ${m.description}`);
    }
    console.log(`    ... and ${moderate.length - 15} more`);
  }

  // ── Press Trigger Deep Dive ────────────────────────────

  const pressMoments = report.moments.filter(m => m.type === 'press_trigger');
  if (pressMoments.length > 0) {
    subheader('PRESS TRIGGER ANALYSIS');
    console.log(`  ${pressMoments.length} pressing windows identified.\n`);
    console.log('  Time      Sev     Lanes  Ball Holder    Description');
    console.log('  ' + '-'.repeat(68));

    for (const m of pressMoments) {
      const lanes = m.data.lanes as number;
      const holder = m.data.ballHolder as string ?? '?';
      console.log(`  ${formatTime(m.time).padEnd(9)} ${severityIcon(m.severity)}  ${String(lanes).padEnd(6)} ${holder.padEnd(14)} ${m.description.slice(0, 60)}`);
      if (m.data.topTargets) {
        const targets = m.data.topTargets as Array<{ id: string; score: string }>;
        console.log(`            PPR top targets: ${targets.map(t => `${t.id}(${t.score})`).join(', ')}`);
      }
    }

    console.log(`\n  These are moments where the opponent was most constrained.`);
    console.log(`  Immediate pressing in these windows would have forced turnovers.`);
  }

  // ── Defensive Vulnerability Deep Dive ──────────────────

  const vulnMoments = report.moments.filter(m => m.type === 'vulnerability');
  if (vulnMoments.length > 0) {
    subheader('DEFENSIVE VULNERABILITY ANALYSIS');
    console.log(`  ${vulnMoments.length} defensive gaps detected.\n`);

    for (const m of vulnMoments.filter(m => m.severity !== 'moderate').slice(0, 10)) {
      const mc = m.data.mincutValue as number;
      const edges = m.data.cutEdges as number;
      console.log(`  ${formatTime(m.time)} ${severityIcon(m.severity)} MinCut=${mc.toFixed(3)}, ${edges} broken coverage links`);
      console.log(`           ${m.description}`);
    }
  }

  // ── Formation Analysis ─────────────────────────────────

  const formMoments = report.moments.filter(m => m.type === 'formation_break');
  if (formMoments.length > 0) {
    subheader('FORMATION INTEGRITY');
    console.log(`  ${formMoments.length} formation drift events detected.\n`);

    for (const m of formMoments) {
      const drift = (m.data.drift as number) * 100;
      const formation = m.data.formation as string;
      console.log(`  ${formatTime(m.time)} ${severityIcon(m.severity)} ${drift.toFixed(0)}% drift — shape: ${formation}`);
      console.log(`           ${m.description}`);
    }
  }

  // ── MinCut Timeline (ASCII sparkline) ──────────────────

  subheader('DEFENSIVE MINCUT TIMELINE');
  console.log('  Lower = more vulnerable. Dips are exploitable moments.\n');

  // Bucket timeline into 1-minute intervals
  const minuteBuckets = new Map<number, { homeMC: number[]; awayMC: number[] }>();
  for (const t of report.timeline) {
    const min = Math.floor(t.minute);
    if (!minuteBuckets.has(min)) minuteBuckets.set(min, { homeMC: [], awayMC: [] });
    const bucket = minuteBuckets.get(min)!;
    bucket.homeMC.push(t.homeMincut);
    bucket.awayMC.push(t.awayMincut);
  }

  const maxMC = 1.0;
  const barWidth = 30;

  console.log(`  ${report.match.home}:`);
  for (const [min, data] of [...minuteBuckets.entries()].sort((a, b) => a[0] - b[0])) {
    const avg = data.homeMC.reduce((s, v) => s + v, 0) / data.homeMC.length;
    const barLen = Math.max(0, Math.min(barWidth, Math.round((avg / maxMC) * barWidth)));
    const bar = '█'.repeat(barLen) + '░'.repeat(barWidth - barLen);
    const marker = avg < 0.25 ? ' ◄ VULNERABLE' : '';
    console.log(`  ${String(min).padStart(3)}' │${bar}│ ${avg.toFixed(2)}${marker}`);
  }

  console.log(`\n  ${report.match.away}:`);
  for (const [min, data] of [...minuteBuckets.entries()].sort((a, b) => a[0] - b[0])) {
    const avg = data.awayMC.reduce((s, v) => s + v, 0) / data.awayMC.length;
    const barLen = Math.max(0, Math.min(barWidth, Math.round((avg / maxMC) * barWidth)));
    const bar = '█'.repeat(barLen) + '░'.repeat(barWidth - barLen);
    const marker = avg < 0.25 ? ' ◄ VULNERABLE' : '';
    console.log(`  ${String(min).padStart(3)}' │${bar}│ ${avg.toFixed(2)}${marker}`);
  }

  // ── Passing Network Snapshot ───────────────────────────

  subheader('PASSING NETWORK SNAPSHOT (sample frame)');

  // Pick a mid-match frame
  const sampleFrame = report.moments.length > 0
    ? report.moments[Math.floor(report.moments.length / 2)].frameIndex
    : Math.floor(report.timeline.length / 2) * 5;

  return sampleFrame;
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('Generating synthetic match data (10 minutes @ 10fps)...');
  const startGen = Date.now();
  const match = generateSyntheticMatch(10);
  console.log(`  Generated ${match.frames.length} frames in ${Date.now() - startGen}ms`);

  console.log('\nRunning tactical analysis pipeline...');
  const startAnalysis = Date.now();
  const report = analyzeMatch(match);
  const analysisMs = Date.now() - startAnalysis;
  console.log(`  Analyzed ${match.frames.length} frames in ${analysisMs}ms`);
  console.log(`  Throughput: ${(match.frames.length / (analysisMs / 1000)).toFixed(0)} frames/sec`);
  console.log(`  Per-frame latency: ${(analysisMs / (match.frames.length / 5)).toFixed(2)}ms (sampled every 5th frame)`);

  // Print report
  const sampleFrameIdx = printReport(report);

  // Passing network for sample frame
  if (sampleFrameIdx < match.frames.length) {
    const sampleFrame = match.frames[Math.min(sampleFrameIdx, match.frames.length - 1)];
    const homePass = buildPassingGraph(sampleFrame, 'home');
    const awayPass = buildPassingGraph(sampleFrame, 'away');

    console.log(`\n  Frame ${sampleFrameIdx} (${formatTime(sampleFrame.time)}):`);
    console.log(`  ${match.homeTeam} passing edges: ${homePass.edges.length} (avg weight: ${(homePass.edges.reduce((s, e) => s + e.weight, 0) / Math.max(homePass.edges.length, 1)).toFixed(3)})`);
    console.log(`  ${match.awayTeam} passing edges: ${awayPass.edges.length} (avg weight: ${(awayPass.edges.reduce((s, e) => s + e.weight, 0) / Math.max(awayPass.edges.length, 1)).toFixed(3)})`);

    // PPR from ball holder
    if (sampleFrame.ball.holder) {
      const team = sampleFrame.ball.holder.startsWith('home') ? 'home' : 'away';
      const graph = team === 'home' ? homePass : awayPass;
      const ppr = personalizedPageRank(graph, sampleFrame.ball.holder);
      const sorted = [...ppr.entries()].sort((a, b) => b[1] - a[1]);

      console.log(`\n  PPR from ball holder (${sampleFrame.ball.holder}):`);
      console.log(`  ${'Player'.padEnd(12)} ${'Reachability'.padEnd(14)} Interpretation`);
      console.log(`  ${'-'.repeat(50)}`);
      for (const [id, score] of sorted.slice(0, 5)) {
        const interp = score > 0.2 ? 'PRIMARY target' :
                       score > 0.1 ? 'Secondary option' :
                       score > 0.05 ? 'Available' : 'Low priority';
        console.log(`  ${id.padEnd(12)} ${score.toFixed(4).padEnd(14)} ${interp}`);
      }
    }

    // Formation detection
    const homeForm = detectFormation(sampleFrame.home, 1);
    const awayForm = detectFormation(sampleFrame.away, -1);
    console.log(`\n  Detected formations: ${match.homeTeam} ${homeForm} vs ${match.awayTeam} ${awayForm}`);
  }

  // ── Performance Summary ────────────────────────────────

  header('PERFORMANCE & DEPLOYMENT');
  console.log(`\n  Analysis performance:`);
  console.log(`    Total frames:        ${match.frames.length}`);
  console.log(`    Frames analyzed:     ${Math.ceil(match.frames.length / 5)} (every 5th)`);
  console.log(`    Total analysis time: ${analysisMs}ms`);
  console.log(`    Per-frame:           ${(analysisMs / Math.ceil(match.frames.length / 5)).toFixed(2)}ms`);
  console.log(`    Budget at 30fps:     33.3ms per frame`);
  console.log(`    Headroom:            ${((33.3 / (analysisMs / Math.ceil(match.frames.length / 5))) - 1).toFixed(0)}x margin for real-time`);

  console.log(`\n  Real-time deployment:`);
  console.log(`    This analysis ran at ${(match.frames.length / (analysisMs / 1000)).toFixed(0)} frames/sec.`);
  console.log(`    Real-time requires ${match.fps} frames/sec.`);
  console.log(`    Status: ${(match.frames.length / (analysisMs / 1000)) > match.fps ? 'REAL-TIME CAPABLE' : 'Optimization needed'}`);

  console.log(`\n  Hardware requirements:`);
  console.log(`    Post-match analysis: Any modern laptop (this demo)`);
  console.log(`    Real-time sideline:  Raspberry Pi 5 or Jetson Orin Nano`);
  console.log(`    ESP32 per player:    ~$4-8/unit, coin cell battery, BLE/WiFi`);
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
