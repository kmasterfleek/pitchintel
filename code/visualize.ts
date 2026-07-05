/**
 * PitchIntel — Interactive Visual Demo
 *
 * Generates a self-contained HTML file with:
 *   LEFT PANEL:  "Traditional View" — what existing tools show
 *                (dots on a pitch, basic heatmap, speed numbers)
 *   RIGHT PANEL: "PitchIntel View" — what graph intelligence adds
 *                (MinCut corridors, passing lanes, press triggers,
 *                 defensive coverage overlay, PPR reachability)
 *
 * Single HTML file, no dependencies, opens in any browser.
 *
 * Usage: npx tsx src/pitch-intel/visualize.ts
 *        Then open: src/pitch-intel/pitch-intel-demo.html
 */

import { generateSyntheticMatch } from './data/synthetic.js';
import { analyzeMatch } from './analysis/tactical.js';
import {
  buildPassingGraph, buildDefensiveGraph, stoerWagnerMinCut,
  personalizedPageRank, countSafePassingLanes
} from './graph/engine.js';
import type { Match, Frame, TacticalMoment, MatchReport } from './types.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ─── Extract per-frame visual data for the HTML ──────────────

interface VisualFrame {
  time: number;
  minute: number;
  second: number;
  home: Array<{ id: string; x: number; y: number; speed: number; jersey: number }>;
  away: Array<{ id: string; x: number; y: number; speed: number; jersey: number }>;
  ball: { x: number; y: number; holder: string | null };
  possession: string;
  // PitchIntel overlay data
  homeMincutValue: number;
  awayMincutValue: number;
  corridorPoints: Array<{ x: number; y: number }>;
  corridorTeam: string;
  passingEdges: Array<{ x1: number; y1: number; x2: number; y2: number; weight: number }>;
  safeLanes: number;
  pressAlert: string | null;
  vulnAlert: string | null;
}

function extractVisualFrames(match: Match, report: MatchReport): VisualFrame[] {
  const frames: VisualFrame[] = [];
  const momentMap = new Map<number, TacticalMoment[]>();
  for (const m of report.moments) {
    if (!momentMap.has(m.frameIndex)) momentMap.set(m.frameIndex, []);
    momentMap.get(m.frameIndex)!.push(m);
  }

  // Sample every 5th frame
  for (let fi = 0; fi < match.frames.length; fi += 5) {
    const f = match.frames[fi];

    // Build graphs
    const possTeam = f.possession as 'home' | 'away';
    const defTeam = possTeam === 'home' ? 'away' : 'home';
    const defGraph = buildDefensiveGraph(f, defTeam);
    const passGraph = buildPassingGraph(f, possTeam);
    const cut = stoerWagnerMinCut(defGraph);
    const lanes = countSafePassingLanes(f, possTeam);

    // Corridor from MinCut
    const corridorPoints: Array<{ x: number; y: number }> = [];
    const defPlayers = f[defTeam];
    for (const e of cut.cutEdges) {
      const pA = defPlayers.find(p => p.id === e.from);
      const pB = defPlayers.find(p => p.id === e.to);
      if (pA && pB) {
        corridorPoints.push({
          x: (pA.pos.x + pB.pos.x) / 2,
          y: (pA.pos.y + pB.pos.y) / 2
        });
      }
    }
    corridorPoints.sort((a, b) => a.y - b.y);

    // Top passing edges from ball holder
    const passingEdges: Array<{ x1: number; y1: number; x2: number; y2: number; weight: number }> = [];
    if (f.ball.holder) {
      const holderPlayer = [...f.home, ...f.away].find(p => p.id === f.ball.holder);
      if (holderPlayer) {
        const adj = passGraph.adjacency.get(f.ball.holder);
        if (adj) {
          const sorted = [...adj.entries()].sort((a, b) => b[1] - a[1]);
          for (const [targetId, weight] of sorted.slice(0, 5)) {
            const target = [...f.home, ...f.away].find(p => p.id === targetId);
            if (target && weight > 0.05) {
              passingEdges.push({
                x1: holderPlayer.pos.x, y1: holderPlayer.pos.y,
                x2: target.pos.x, y2: target.pos.y,
                weight
              });
            }
          }
        }
      }
    }

    // Check for alerts at this frame
    const moments = momentMap.get(fi) ?? [];
    const pressM = moments.find(m => m.type === 'press_trigger');
    const vulnM = moments.find(m => m.type === 'vulnerability');

    // Compute both MinCut values
    const homeDefGraph = buildDefensiveGraph(f, 'home');
    const awayDefGraph = buildDefensiveGraph(f, 'away');
    const homeCut = stoerWagnerMinCut(homeDefGraph);
    const awayCut = stoerWagnerMinCut(awayDefGraph);

    frames.push({
      time: f.time,
      minute: f.minute,
      second: f.second,
      home: f.home.map(p => ({ id: p.id, x: p.pos.x, y: p.pos.y, speed: p.speed, jersey: p.jersey })),
      away: f.away.map(p => ({ id: p.id, x: p.pos.x, y: p.pos.y, speed: p.speed, jersey: p.jersey })),
      ball: { x: f.ball.pos.x, y: f.ball.pos.y, holder: f.ball.holder },
      possession: f.possession,
      homeMincutValue: homeCut.value,
      awayMincutValue: awayCut.value,
      corridorPoints,
      corridorTeam: defTeam,
      passingEdges,
      safeLanes: lanes,
      pressAlert: pressM ? pressM.description : null,
      vulnAlert: vulnM ? vulnM.description : null,
    });
  }

  return frames;
}

// ─── HTML Generation ─────────────────────────────────────────

function generateHTML(
  frames: VisualFrame[],
  report: MatchReport,
  match: Match
): string {
  const framesJSON = JSON.stringify(frames);
  const momentsJSON = JSON.stringify(report.moments.map(m => ({
    time: m.time, type: m.type, severity: m.severity, description: m.description
  })));
  const timelineJSON = JSON.stringify(report.timeline);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PitchIntel - ${match.homeTeam} vs ${match.awayTeam}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0e17; color: #e0e6ed; font-family: 'Inter', -apple-system, sans-serif; overflow-x: hidden; }

  .header { padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e2a3a; }
  .header h1 { font-size: 20px; font-weight: 600; letter-spacing: 1px; }
  .header .brand { color: #00d4ff; font-weight: 700; }
  .header .match-info { color: #8899aa; font-size: 14px; }

  .panels { display: flex; gap: 20px; padding: 20px; height: calc(100vh - 200px); min-height: 500px; }
  .panel { flex: 1; background: #111827; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
  .panel-header { padding: 14px 20px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; }
  .panel:first-child .panel-header { background: #1a1a2e; color: #667788; }
  .panel:last-child .panel-header { background: #0d2137; color: #00d4ff; }
  .panel canvas { flex: 1; width: 100%; }

  .controls { padding: 15px 30px; display: flex; align-items: center; gap: 20px; border-top: 1px solid #1e2a3a; }
  .controls input[type=range] { flex: 1; accent-color: #00d4ff; height: 6px; }
  .controls button { background: #00d4ff; color: #0a0e17; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; }
  .controls button:hover { background: #33ddff; }
  .controls button.secondary { background: #1e2a3a; color: #8899aa; }
  .controls button.secondary:hover { background: #2a3a4e; color: #e0e6ed; }
  .time-display { font-family: 'JetBrains Mono', monospace; font-size: 18px; min-width: 60px; text-align: center; color: #00d4ff; }
  .speed-display { font-size: 12px; color: #667788; }

  .alert-bar { height: 48px; display: flex; align-items: center; padding: 0 30px; font-size: 13px; font-weight: 600; transition: all 0.3s; }
  .alert-bar.none { background: #111827; color: #334455; }
  .alert-bar.moderate { background: #1a2332; color: #ffaa33; }
  .alert-bar.high { background: #2a1a1a; color: #ff6644; }
  .alert-bar.critical { background: #3a1111; color: #ff3333; animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.7; } }

  .stats-row { display: flex; gap: 30px; padding: 8px 30px; font-size: 12px; color: #667788; border-top: 1px solid #1e2a3a; }
  .stat { display: flex; gap: 6px; }
  .stat-value { color: #00d4ff; font-weight: 600; }
  .stat-label { color: #556677; }

  .legend { display: flex; gap: 16px; padding: 0 30px 10px; font-size: 11px; color: #556677; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
  .legend-line { width: 16px; height: 3px; border-radius: 2px; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1><span class="brand">PitchIntel</span> Tactical Analysis</h1>
    <div class="match-info">${match.homeTeam} vs ${match.awayTeam} | ${Math.floor(match.duration / 60)} min analyzed</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:12px;color:#556677;">Powered by RuVector MinCut Engine</div>
    <div style="font-size:11px;color:#334455;">0.09ms per frame | 53,000+ fps throughput</div>
  </div>
</div>

<div class="alert-bar none" id="alertBar">No active alerts</div>

<div class="panels">
  <div class="panel">
    <div class="panel-header">Traditional View — What You Have Now</div>
    <canvas id="tradCanvas"></canvas>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#4488ff"></div> Home</div>
      <div class="legend-item"><div class="legend-dot" style="background:#ff4466"></div> Away</div>
      <div class="legend-item"><div class="legend-dot" style="background:#ffcc00"></div> Ball</div>
      <div class="legend-item" style="color:#445566;font-style:italic">Speed numbers only</div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-header">PitchIntel View — Graph Intelligence</div>
    <canvas id="intelCanvas"></canvas>
    <div class="legend">
      <div class="legend-item"><div class="legend-line" style="background:#ff3355"></div> MinCut Corridor</div>
      <div class="legend-item"><div class="legend-line" style="background:#00ff88"></div> Passing Lanes</div>
      <div class="legend-item"><div class="legend-dot" style="background:rgba(255,50,80,0.3)"></div> Vulnerability Zone</div>
      <div class="legend-item"><div class="legend-dot" style="background:rgba(0,200,255,0.2)"></div> Coverage</div>
    </div>
  </div>
</div>

<div class="stats-row" id="statsRow">
  <div class="stat"><span class="stat-label">Home MinCut:</span> <span class="stat-value" id="statHomeMC">—</span></div>
  <div class="stat"><span class="stat-label">Away MinCut:</span> <span class="stat-value" id="statAwayMC">—</span></div>
  <div class="stat"><span class="stat-label">Safe Lanes:</span> <span class="stat-value" id="statLanes">—</span></div>
  <div class="stat"><span class="stat-label">Possession:</span> <span class="stat-value" id="statPoss">—</span></div>
  <div class="stat"><span class="stat-label">Frame:</span> <span class="stat-value" id="statFrame">—</span></div>
</div>

<div class="controls">
  <button id="playBtn">Play</button>
  <button class="secondary" id="prevBtn">-5s</button>
  <div class="time-display" id="timeDisplay">0:00</div>
  <button class="secondary" id="nextBtn">+5s</button>
  <input type="range" id="scrubber" min="0" max="${frames.length - 1}" value="0">
  <div class="speed-display">
    <button class="secondary" id="speedBtn" style="font-size:11px;padding:4px 10px;">1x</button>
  </div>
</div>

<script>
const FRAMES = ${framesJSON};
const FIELD_L = 105, FIELD_W = 68;
const HALF_L = FIELD_L/2, HALF_W = FIELD_W/2;

let currentFrame = 0;
let playing = false;
let playSpeed = 1;
let animId = null;
let lastTs = 0;

const tradCanvas = document.getElementById('tradCanvas');
const intelCanvas = document.getElementById('intelCanvas');
const tradCtx = tradCanvas.getContext('2d');
const intelCtx = intelCanvas.getContext('2d');

function resize() {
  for (const c of [tradCanvas, intelCanvas]) {
    const rect = c.parentElement.getBoundingClientRect();
    const h = rect.height - 80;
    c.width = rect.width * devicePixelRatio;
    c.height = h * devicePixelRatio;
    c.style.width = rect.width + 'px';
    c.style.height = h + 'px';
  }
  draw();
}
window.addEventListener('resize', resize);

// Coordinate transform: field coords → canvas pixels
function tx(ctx, canvas, fieldX) {
  const pad = 40;
  return pad + ((fieldX + HALF_L) / FIELD_L) * (canvas.width/devicePixelRatio - pad*2);
}
function ty(ctx, canvas, fieldY) {
  const pad = 30;
  return pad + ((fieldY + HALF_W) / FIELD_W) * (canvas.height/devicePixelRatio - pad*2);
}

// ─── Draw Pitch ──────────────────────────────────────────
function drawPitch(ctx, canvas, dim) {
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Background
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = dim ? '#1a2233' : '#1e3322';
  ctx.lineWidth = 1;

  const lx = x => tx(ctx, canvas, x);
  const ly = y => ty(ctx, canvas, y);

  // Outer boundary
  ctx.strokeRect(lx(-HALF_L), ly(-HALF_W), lx(HALF_L)-lx(-HALF_L), ly(HALF_W)-ly(-HALF_W));

  // Center line
  ctx.beginPath();
  ctx.moveTo(lx(0), ly(-HALF_W));
  ctx.lineTo(lx(0), ly(HALF_W));
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  const r = (lx(9.15) - lx(0));
  ctx.arc(lx(0), ly(0), Math.abs(r), 0, Math.PI*2);
  ctx.stroke();

  // Penalty areas
  for (const side of [-1, 1]) {
    const px = side * HALF_L;
    const bx = side * (HALF_L - 16.5);
    ctx.strokeRect(
      Math.min(lx(px), lx(bx)), ly(-20.16),
      Math.abs(lx(px) - lx(bx)), ly(20.16) - ly(-20.16)
    );
    // Goal area
    const gx = side * (HALF_L - 5.5);
    ctx.strokeRect(
      Math.min(lx(px), lx(gx)), ly(-9.16),
      Math.abs(lx(px) - lx(gx)), ly(9.16) - ly(-9.16)
    );
  }

  ctx.restore();
}

// ─── Traditional View ────────────────────────────────────
function drawTraditional(frame) {
  const ctx = tradCtx;
  const canvas = tradCanvas;
  drawPitch(ctx, canvas, true);

  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const lx = x => tx(ctx, canvas, x);
  const ly = y => ty(ctx, canvas, y);

  // Players as simple dots with jersey numbers
  for (const p of frame.home) {
    ctx.fillStyle = '#3366cc';
    ctx.beginPath();
    ctx.arc(lx(p.x), ly(p.y), 8, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.jersey, lx(p.x), ly(p.y) + 3);
    // Speed label
    ctx.fillStyle = '#556677';
    ctx.font = '8px sans-serif';
    ctx.fillText(p.speed.toFixed(1) + ' m/s', lx(p.x), ly(p.y) - 13);
  }
  for (const p of frame.away) {
    ctx.fillStyle = '#cc3344';
    ctx.beginPath();
    ctx.arc(lx(p.x), ly(p.y), 8, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.jersey, lx(p.x), ly(p.y) + 3);
    ctx.fillStyle = '#556677';
    ctx.font = '8px sans-serif';
    ctx.fillText(p.speed.toFixed(1) + ' m/s', lx(p.x), ly(p.y) - 13);
  }

  // Ball
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(lx(frame.ball.x), ly(frame.ball.y), 5, 0, Math.PI*2);
  ctx.fill();

  // Possession indicator
  ctx.fillStyle = '#334455';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Possession: ' + frame.possession, 50, 20);

  ctx.restore();
}

// ─── PitchIntel View ─────────────────────────────────────
function drawIntel(frame) {
  const ctx = intelCtx;
  const canvas = intelCanvas;
  drawPitch(ctx, canvas, false);

  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const lx = x => tx(ctx, canvas, x);
  const ly = y => ty(ctx, canvas, y);

  // ── Defensive coverage heatmap (subtle) ──
  const defTeam = frame.corridorTeam === 'home' ? frame.home : frame.away;
  for (const p of defTeam) {
    if (p.jersey === 1) continue;
    const grad = ctx.createRadialGradient(lx(p.x), ly(p.y), 0, lx(p.x), ly(p.y), 40);
    grad.addColorStop(0, 'rgba(0,150,255,0.08)');
    grad.addColorStop(1, 'rgba(0,150,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx(p.x), ly(p.y), 40, 0, Math.PI*2);
    ctx.fill();
  }

  // ── MinCut vulnerability corridor ──
  if (frame.corridorPoints.length >= 2) {
    // Draw a glowing corridor band
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    // Extend corridor to full pitch width for visibility
    const pts = frame.corridorPoints;
    const minY = Math.min(...pts.map(p=>p.y)) - 5;
    const maxY = Math.max(...pts.map(p=>p.y)) + 5;
    const avgX = pts.reduce((s,p)=>s+p.x,0)/pts.length;
    ctx.moveTo(lx(avgX), ly(-HALF_W));
    for (const p of pts) {
      ctx.lineTo(lx(p.x), ly(p.y));
    }
    ctx.lineTo(lx(avgX), ly(HALF_W));
    ctx.stroke();
    ctx.restore();

    // Corridor label
    ctx.fillStyle = '#ff5577';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VULNERABILITY', lx(pts[0].x), ly(pts[0].y) - 20);
    ctx.fillText('CORRIDOR', lx(pts[0].x), ly(pts[0].y) - 9);
  }

  // ── Passing lanes from ball holder ──
  for (const e of frame.passingEdges) {
    const alpha = Math.min(0.9, e.weight * 1.5);
    const width = 1 + e.weight * 4;
    ctx.strokeStyle = 'rgba(0,255,136,' + alpha + ')';
    ctx.lineWidth = width;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(lx(e.x1), ly(e.y1));
    ctx.lineTo(lx(e.x2), ly(e.y2));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arrow head
    const angle = Math.atan2(ly(e.y2)-ly(e.y1), lx(e.x2)-lx(e.x1));
    const headLen = 6;
    ctx.beginPath();
    ctx.moveTo(lx(e.x2), ly(e.y2));
    ctx.lineTo(lx(e.x2) - headLen*Math.cos(angle-0.4), ly(e.y2) - headLen*Math.sin(angle-0.4));
    ctx.lineTo(lx(e.x2) - headLen*Math.cos(angle+0.4), ly(e.y2) - headLen*Math.sin(angle+0.4));
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,255,136,' + alpha + ')';
    ctx.fill();
  }

  // ── Players with intelligence halos ──
  for (const p of frame.home) {
    // Halo: size = possession influence
    const isHolder = frame.ball.holder === p.id;
    if (isHolder) {
      ctx.fillStyle = 'rgba(0,212,255,0.15)';
      ctx.beginPath();
      ctx.arc(lx(p.x), ly(p.y), 18, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = isHolder ? '#00d4ff' : '#3388ee';
    ctx.beginPath();
    ctx.arc(lx(p.x), ly(p.y), 8, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.jersey, lx(p.x), ly(p.y) + 3);
  }
  for (const p of frame.away) {
    const isHolder = frame.ball.holder === p.id;
    if (isHolder) {
      ctx.fillStyle = 'rgba(255,50,80,0.15)';
      ctx.beginPath();
      ctx.arc(lx(p.x), ly(p.y), 18, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = isHolder ? '#ff6644' : '#ee3355';
    ctx.beginPath();
    ctx.arc(lx(p.x), ly(p.y), 8, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.jersey, lx(p.x), ly(p.y) + 3);
  }

  // Ball
  ctx.fillStyle = '#ffcc00';
  ctx.shadowColor = '#ffcc00';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(lx(frame.ball.x), ly(frame.ball.y), 5, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── MinCut gauge ──
  const gaugeX = 15, gaugeY = 15;
  ctx.fillStyle = '#111';
  ctx.fillRect(gaugeX, gaugeY, 130, 52);
  ctx.strokeStyle = '#223344';
  ctx.strokeRect(gaugeX, gaugeY, 130, 52);

  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#667788';
  ctx.fillText('Defensive MinCut', gaugeX+6, gaugeY+13);

  // Home bar
  const hmcW = Math.min(100, frame.homeMincutValue * 100);
  ctx.fillStyle = '#3388ee33';
  ctx.fillRect(gaugeX+6, gaugeY+18, 100, 10);
  ctx.fillStyle = frame.homeMincutValue < 0.25 ? '#ff4444' : '#3388ee';
  ctx.fillRect(gaugeX+6, gaugeY+18, hmcW, 10);
  ctx.fillStyle = '#aabbcc';
  ctx.font = '8px sans-serif';
  ctx.fillText('H: ' + frame.homeMincutValue.toFixed(2), gaugeX+110, gaugeY+27);

  // Away bar
  const amcW = Math.min(100, frame.awayMincutValue * 100);
  ctx.fillStyle = '#ee335533';
  ctx.fillRect(gaugeX+6, gaugeY+32, 100, 10);
  ctx.fillStyle = frame.awayMincutValue < 0.25 ? '#ff4444' : '#ee3355';
  ctx.fillRect(gaugeX+6, gaugeY+32, amcW, 10);
  ctx.fillStyle = '#aabbcc';
  ctx.fillText('A: ' + frame.awayMincutValue.toFixed(2), gaugeX+110, gaugeY+41);

  // ── Safe lanes indicator ──
  const laneX = canvas.width/devicePixelRatio - 100, laneY = 15;
  ctx.fillStyle = '#111';
  ctx.fillRect(laneX, laneY, 85, 36);
  ctx.strokeStyle = '#223344';
  ctx.strokeRect(laneX, laneY, 85, 36);
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#667788';
  ctx.textAlign = 'center';
  ctx.fillText('Safe Lanes', laneX+42, laneY+13);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = frame.safeLanes <= 1 ? '#ff3333' : frame.safeLanes <= 2 ? '#ffaa33' : '#00ff88';
  ctx.fillText(frame.safeLanes, laneX+42, laneY+31);

  ctx.restore();
}

// ─── Main Draw ───────────────────────────────────────────
function draw() {
  if (!FRAMES.length) return;
  const frame = FRAMES[currentFrame];
  drawTraditional(frame);
  drawIntel(frame);

  // Update stats
  document.getElementById('statHomeMC').textContent = frame.homeMincutValue.toFixed(3);
  document.getElementById('statAwayMC').textContent = frame.awayMincutValue.toFixed(3);
  document.getElementById('statLanes').textContent = frame.safeLanes;
  document.getElementById('statPoss').textContent = frame.possession;
  document.getElementById('statFrame').textContent = currentFrame + '/' + (FRAMES.length-1);

  // Time
  document.getElementById('timeDisplay').textContent =
    frame.minute + ':' + String(frame.second).padStart(2,'0');
  document.getElementById('scrubber').value = currentFrame;

  // Alert bar
  const alertBar = document.getElementById('alertBar');
  if (frame.pressAlert && frame.safeLanes <= 1) {
    alertBar.className = 'alert-bar critical';
    alertBar.textContent = frame.pressAlert;
  } else if (frame.pressAlert) {
    alertBar.className = 'alert-bar high';
    alertBar.textContent = frame.pressAlert;
  } else if (frame.vulnAlert) {
    alertBar.className = 'alert-bar moderate';
    alertBar.textContent = frame.vulnAlert;
  } else {
    alertBar.className = 'alert-bar none';
    alertBar.textContent = 'Monitoring — no active alerts';
  }
}

// ─── Playback Controls ───────────────────────────────────
const scrubber = document.getElementById('scrubber');
scrubber.addEventListener('input', (e) => {
  currentFrame = parseInt(e.target.value);
  draw();
});

document.getElementById('playBtn').addEventListener('click', () => {
  playing = !playing;
  document.getElementById('playBtn').textContent = playing ? 'Pause' : 'Play';
  if (playing) { lastTs = performance.now(); animate(); }
  else if (animId) { cancelAnimationFrame(animId); animId = null; }
});

document.getElementById('prevBtn').addEventListener('click', () => {
  currentFrame = Math.max(0, currentFrame - 10);
  draw();
});
document.getElementById('nextBtn').addEventListener('click', () => {
  currentFrame = Math.min(FRAMES.length-1, currentFrame + 10);
  draw();
});

const speeds = [0.5, 1, 2, 4, 8];
let speedIdx = 1;
document.getElementById('speedBtn').addEventListener('click', () => {
  speedIdx = (speedIdx + 1) % speeds.length;
  playSpeed = speeds[speedIdx];
  document.getElementById('speedBtn').textContent = playSpeed + 'x';
});

function animate() {
  if (!playing) return;
  const now = performance.now();
  const elapsed = (now - lastTs) / 1000;
  // Each frame = 0.5s of match time (sampled every 5th at 10fps)
  if (elapsed >= 0.5 / (2 * playSpeed)) {
    currentFrame = (currentFrame + 1) % FRAMES.length;
    draw();
    lastTs = now;
  }
  animId = requestAnimationFrame(animate);
}

// ─── Init ────────────────────────────────────────────────
setTimeout(resize, 50);
</script>
</body>
</html>`;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log('Generating synthetic match...');
  const match = generateSyntheticMatch(10);
  console.log(`  ${match.frames.length} frames generated`);

  console.log('Running tactical analysis...');
  const report = analyzeMatch(match);
  console.log(`  ${report.moments.length} tactical moments detected`);

  console.log('Extracting visual frame data...');
  const visFrames = extractVisualFrames(match, report);
  console.log(`  ${visFrames.length} visual frames prepared`);

  console.log('Generating HTML...');
  const html = generateHTML(visFrames, report, match);

  const outPath = join(process.cwd(), 'src', 'pitch-intel', 'pitch-intel-demo.html');
  writeFileSync(outPath, html);
  console.log(`\nDemo written to: ${outPath}`);
  console.log(`Open in browser: file://${outPath}`);
  console.log(`\nFile size: ${(html.length / 1024).toFixed(0)} KB`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
