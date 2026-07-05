/**
 * PitchIntel Web Application Generator
 *
 * Generates a single, self-contained HTML file (pitchintel-app.html) that
 * embeds the player database, team database, coach database, and valuation
 * engine as inline JavaScript. Runs entirely client-side, no server needed.
 *
 * Usage: npx tsx src/pitch-intel/app.ts
 * Output: src/pitch-intel/pitchintel-app.html
 */

import { getPlayerDatabase } from './data/players-db.js';
import { getTeamDatabase } from './data/teams-db.js';
import { getCoachDatabase } from './coach-vector.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

function serializeTeams(teams: ReturnType<typeof getTeamDatabase>): string {
  const serializable = teams.map(t => ({
    ...t,
    positionDepth: Array.from(t.positionDepth.entries()),
  }));
  return JSON.stringify(serializable);
}

async function main() {
  const players = getPlayerDatabase();
  const teams = getTeamDatabase();
  const coaches = getCoachDatabase();

  console.log(`Loaded ${players.length} players, ${teams.length} teams, ${coaches.length} coaches`);

  const playersJSON = JSON.stringify(players);
  const teamsJSON = serializeTeams(teams);
  const coachesJSON = JSON.stringify(coaches);

  const html = generateHTML(playersJSON, teamsJSON, coachesJSON);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const outPath = join(__dirname, 'pitchintel-app.html');
  writeFileSync(outPath, html, 'utf-8');
  console.log(`Written to ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
}

function generateHTML(
  playersJSON: string,
  teamsJSON: string,
  coachesJSON: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PitchIntel - Context-Adjusted Transfer Intelligence</title>
<style>
${getCSS()}
</style>
</head>
<body>
<div id="app">
  <header id="header">
    <div class="header-inner">
      <div class="logo"><span class="logo-pitch">Pitch</span><span class="logo-intel">Intel</span></div>
      <nav class="tab-bar" id="tabBar">
        <button class="tab active" data-tab="gems">&#9670; Hidden Gems</button>
        <button class="tab" data-tab="player">&#9733; Player Lookup</button>
        <button class="tab" data-tab="coach">&#9814; Coach Fit</button>
        <button class="tab" data-tab="scout">&#9881; Scout Mode</button>
      </nav>
    </div>
  </header>

  <main id="content">
    <!-- Gems View -->
    <section id="view-gems" class="view active">
      <div class="view-header">
        <h2>Hidden Gems Scanner</h2>
        <p class="subtitle">Find undervalued players for any club using context-adjusted valuation</p>
      </div>
      <div class="selector-row">
        <div class="search-dropdown" id="gems-club-dropdown">
          <input type="text" class="dropdown-search" id="gems-club-search" placeholder="Select a club..." autocomplete="off">
          <div class="dropdown-list" id="gems-club-list"></div>
        </div>
      </div>
      <div id="gems-results"></div>
    </section>

    <!-- Player View -->
    <section id="view-player" class="view">
      <div class="view-header">
        <h2>Player Lookup</h2>
        <p class="subtitle">See how any player is valued across all 30 clubs</p>
      </div>
      <div class="selector-row">
        <div class="search-dropdown" id="player-dropdown">
          <input type="text" class="dropdown-search" id="player-search" placeholder="Search for a player..." autocomplete="off">
          <div class="dropdown-list" id="player-list"></div>
        </div>
      </div>
      <div id="player-results"></div>
    </section>

    <!-- Coach View -->
    <section id="view-coach" class="view">
      <div class="view-header">
        <h2>Coach Fit Analysis</h2>
        <p class="subtitle">Which manager is the best structural fit for each club?</p>
      </div>
      <div class="selector-row">
        <div class="search-dropdown" id="coach-club-dropdown">
          <input type="text" class="dropdown-search" id="coach-club-search" placeholder="Select a club..." autocomplete="off">
          <div class="dropdown-list" id="coach-club-list"></div>
        </div>
      </div>
      <div id="coach-results"></div>
      <div class="coach-similarity-section" id="coach-similarity" style="display:none;">
        <h3>Coach Similarity Comparison</h3>
        <div class="selector-row dual">
          <div class="search-dropdown" id="coach-a-dropdown">
            <input type="text" class="dropdown-search" id="coach-a-search" placeholder="Coach A..." autocomplete="off">
            <div class="dropdown-list" id="coach-a-list"></div>
          </div>
          <span class="vs-label">vs</span>
          <div class="search-dropdown" id="coach-b-dropdown">
            <input type="text" class="dropdown-search" id="coach-b-search" placeholder="Coach B..." autocomplete="off">
            <div class="dropdown-list" id="coach-b-list"></div>
          </div>
        </div>
        <div id="similarity-result"></div>
      </div>
    </section>

    <!-- Scout View -->
    <section id="view-scout" class="view">
      <div class="view-header">
        <h2>Scout Mode</h2>
        <p class="subtitle">Custom dimension editor with live valuation</p>
      </div>
      <div class="pro-banner">This is free in the demo &mdash; full version saves your assessments across sessions</div>
      <div class="selector-row dual">
        <div class="search-dropdown" id="scout-player-dropdown">
          <input type="text" class="dropdown-search" id="scout-player-search" placeholder="Select a player..." autocomplete="off">
          <div class="dropdown-list" id="scout-player-list"></div>
        </div>
        <div class="search-dropdown" id="scout-team-dropdown">
          <input type="text" class="dropdown-search" id="scout-team-search" placeholder="Select a team..." autocomplete="off">
          <div class="dropdown-list" id="scout-team-list"></div>
        </div>
      </div>
      <div id="scout-sliders"></div>
      <div id="scout-result"></div>
    </section>
  </main>

  <footer>
    <span>Powered by <a href="#">RuVector Graph Engine</a></span>
  </footer>
</div>

<div id="toast" class="toast"></div>

<script>
// ── Embedded Data ──────────────────────────────────────────────
const PLAYERS_RAW = ${playersJSON};
const TEAMS_RAW = ${teamsJSON};
const COACHES_RAW = ${coachesJSON};

// Reconstruct Maps for teams
const PLAYERS = PLAYERS_RAW;
const TEAMS = TEAMS_RAW.map(function(t) {
  t.positionDepth = new Map(t.positionDepth);
  return t;
});
const COACHES = COACHES_RAW;

${getEngineJS()}
${getUIJS()}
</script>
</body>
</html>`;
}

function getCSS(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#06080c;--bg2:#0d1117;--card:#111827;--card-hover:#161e2e;
  --border:#1a2236;--border-light:#243049;
  --text:#c8d4e0;--text-dim:#6b7d94;--text-bright:#e8eef4;
  --accent:#00b4ff;--accent-dim:rgba(0,180,255,0.15);
  --green:#00e88a;--green-dim:rgba(0,232,138,0.15);
  --red:#ff3860;--red-dim:rgba(255,56,96,0.12);
  --gold:#ffb800;--gold-dim:rgba(255,184,0,0.12);
  --orange:#ff8c42;
  --font:'Inter',system-ui,-apple-system,sans-serif;
}
html{font-size:14px}
body{background:var(--bg);color:var(--text);font-family:var(--font);line-height:1.5;min-height:100vh;overflow-x:hidden}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}

/* Header */
#header{position:sticky;top:0;z-index:100;background:rgba(6,8,12,0.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 1rem}
.header-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:2rem;height:56px}
.logo{font-size:1.4rem;font-weight:800;letter-spacing:-0.5px;white-space:nowrap}
.logo-pitch{color:var(--text-bright)}
.logo-intel{color:var(--accent)}
.tab-bar{display:flex;gap:0.25rem;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.tab-bar::-webkit-scrollbar{display:none}
.tab{background:none;border:none;color:var(--text-dim);font-family:var(--font);font-size:0.85rem;font-weight:600;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;white-space:nowrap;transition:all 0.15s}
.tab:hover{color:var(--text);background:rgba(255,255,255,0.04)}
.tab.active{color:var(--accent);background:var(--accent-dim)}

/* Content */
#content{max-width:1200px;margin:0 auto;padding:1.5rem 1rem 4rem}
.view{display:none}
.view.active{display:block}
.view-header{margin-bottom:1.5rem}
.view-header h2{font-size:1.6rem;font-weight:800;color:var(--text-bright);margin-bottom:0.25rem}
.subtitle{color:var(--text-dim);font-size:0.95rem}

/* Selector */
.selector-row{display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;align-items:center}
.selector-row.dual{display:flex;gap:0.75rem;align-items:center}
.vs-label{color:var(--text-dim);font-weight:700;font-size:0.9rem}
.search-dropdown{position:relative;width:320px;max-width:100%}
.dropdown-search{width:100%;padding:0.6rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text-bright);font-family:var(--font);font-size:0.9rem;outline:none;transition:border-color 0.15s}
.dropdown-search:focus{border-color:var(--accent)}
.dropdown-search::placeholder{color:var(--text-dim)}
.dropdown-list{position:absolute;top:100%;left:0;right:0;background:var(--card);border:1px solid var(--border);border-radius:8px;margin-top:4px;max-height:260px;overflow-y:auto;display:none;z-index:50;box-shadow:0 8px 32px rgba(0,0,0,0.5)}
.dropdown-list.open{display:block}
.dropdown-item{padding:0.5rem 1rem;cursor:pointer;font-size:0.88rem;color:var(--text);transition:background 0.1s}
.dropdown-item:hover,.dropdown-item.selected{background:var(--accent-dim);color:var(--accent)}
.dropdown-item .league-tag{font-size:0.72rem;color:var(--text-dim);margin-left:0.5rem}
.dropdown-list::-webkit-scrollbar{width:6px}
.dropdown-list::-webkit-scrollbar-track{background:transparent}
.dropdown-list::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:3px}

/* Cards */
.gem-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1rem;transition:border-color 0.2s,transform 0.15s}
.gem-card:hover{border-color:var(--border-light);transform:translateY(-1px)}
.gem-card.locked{position:relative;overflow:hidden}
.gem-card.locked .card-body{filter:blur(6px);pointer-events:none;user-select:none}
.lock-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(6,8,12,0.65);backdrop-filter:blur(2px);z-index:2;border-radius:12px}
.lock-overlay .lock-icon{font-size:1.8rem;margin-bottom:0.5rem}
.lock-overlay .lock-btn{background:var(--accent);color:#fff;border:none;padding:0.5rem 1.5rem;border-radius:6px;font-family:var(--font);font-weight:600;font-size:0.85rem;cursor:pointer}
.lock-overlay .lock-btn:hover{opacity:0.9}
.card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;gap:1rem;flex-wrap:wrap}
.card-player-info h3{font-size:1.15rem;font-weight:700;color:var(--text-bright);margin-bottom:0.15rem}
.card-meta{display:flex;gap:0.75rem;flex-wrap:wrap;font-size:0.82rem;color:var(--text-dim)}
.card-meta span{display:inline-flex;align-items:center;gap:0.25rem}
.multiplier-badge{font-size:1.8rem;font-weight:800;line-height:1;padding:0.25rem 0.6rem;border-radius:8px;text-align:center;min-width:72px}
.multiplier-badge.green{color:var(--green);background:var(--green-dim)}
.multiplier-badge.blue{color:var(--accent);background:var(--accent-dim)}
.multiplier-badge.gray{color:var(--text-dim);background:rgba(107,125,148,0.12)}
.multiplier-badge.red{color:var(--red);background:var(--red-dim)}
.multiplier-badge .badge-label{font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-top:2px}
.card-values{display:flex;gap:1.5rem;margin-bottom:0.75rem;flex-wrap:wrap}
.val-item{display:flex;flex-direction:column}
.val-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-dim);margin-bottom:0.1rem}
.val-number{font-size:1rem;font-weight:700;color:var(--text-bright)}
.val-number.context{color:var(--green)}
.card-explanation{font-size:0.88rem;color:var(--text-dim);line-height:1.55;margin-bottom:0.75rem}
.factor-bars{display:flex;flex-direction:column;gap:0.35rem}
.factor-row{display:flex;align-items:center;gap:0.5rem;font-size:0.78rem}
.factor-name{width:120px;color:var(--text-dim);text-align:right;flex-shrink:0}
.factor-bar-bg{flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;position:relative;overflow:hidden;max-width:200px}
.factor-bar-fill{position:absolute;top:0;height:100%;border-radius:3px;transition:width 0.3s}
.factor-bar-fill.positive{background:var(--green);right:50%;left:auto}
.factor-bar-fill.negative{background:var(--red);left:50%;right:auto}
.factor-center{position:absolute;left:50%;top:-1px;bottom:-1px;width:1px;background:rgba(255,255,255,0.15)}
.factor-score{width:40px;font-size:0.75rem;font-weight:600}
.factor-score.pos{color:var(--green)}
.factor-score.neg{color:var(--red)}
.factor-score.zero{color:var(--text-dim)}
.share-btn{display:inline-flex;align-items:center;gap:0.4rem;background:rgba(255,255,255,0.06);border:1px solid var(--border);color:var(--text);padding:0.4rem 0.9rem;border-radius:6px;font-family:var(--font);font-size:0.8rem;cursor:pointer;transition:all 0.15s}
.share-btn:hover{background:var(--accent-dim);border-color:var(--accent);color:var(--accent)}

/* Player View Table */
.player-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;margin-bottom:1.5rem}
.player-card h3{font-size:1.3rem;font-weight:700;color:var(--text-bright);margin-bottom:0.5rem}
.player-stats{display:flex;gap:1.5rem;flex-wrap:wrap}
.player-stat{display:flex;flex-direction:column}
.player-stat .stat-val{font-weight:700;font-size:1.05rem;color:var(--text-bright)}
.player-stat .stat-lbl{font-size:0.7rem;text-transform:uppercase;color:var(--text-dim);letter-spacing:0.5px}
.valuation-table{width:100%;border-collapse:collapse;font-size:0.85rem}
.valuation-table th{text-align:left;padding:0.6rem 0.8rem;border-bottom:2px solid var(--border);color:var(--text-dim);font-weight:600;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;position:sticky;top:0;background:var(--bg)}
.valuation-table td{padding:0.55rem 0.8rem;border-bottom:1px solid var(--border)}
.valuation-table tr:hover td{background:rgba(255,255,255,0.02)}
.valuation-table tr.bargain td{border-left:3px solid var(--green)}
.valuation-table tr.fair td{border-left:3px solid var(--accent)}
.valuation-table tr.overpay td{border-left:3px solid var(--orange)}
.valuation-table tr.avoid td{border-left:3px solid var(--red)}
.verdict-tag{display:inline-block;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:600;text-transform:uppercase}
.verdict-tag.bargain{background:var(--green-dim);color:var(--green)}
.verdict-tag.fair{background:var(--accent-dim);color:var(--accent)}
.verdict-tag.overpay{background:var(--gold-dim);color:var(--gold)}
.verdict-tag.avoid{background:var(--red-dim);color:var(--red)}
.table-blur-wrap{position:relative}
.table-blur-wrap .blur-rows{filter:blur(5px);pointer-events:none;user-select:none}
.table-blur-overlay{position:absolute;bottom:0;left:0;right:0;height:180px;display:flex;align-items:center;justify-content:center;background:linear-gradient(transparent,rgba(6,8,12,0.85));z-index:2}
.show-all-btn{background:var(--accent);color:#fff;border:none;padding:0.6rem 2rem;border-radius:8px;font-family:var(--font);font-weight:600;font-size:0.9rem;cursor:pointer}
.show-all-btn:hover{opacity:0.9}

/* Coach View */
.coach-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1rem}
.coach-card.worst{border-color:var(--red);border-style:dashed}
.coach-card h3{font-size:1.1rem;font-weight:700;color:var(--text-bright);margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem}
.fit-bar-wrap{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem}
.fit-bar-outer{flex:1;height:10px;background:rgba(255,255,255,0.06);border-radius:5px;max-width:300px;overflow:hidden}
.fit-bar-inner{height:100%;border-radius:5px;transition:width 0.4s}
.fit-score-num{font-size:1.3rem;font-weight:800;min-width:50px}
.fit-score-num.perfect{color:var(--green)}
.fit-score-num.strong{color:#4ade80}
.fit-score-num.good{color:var(--accent)}
.fit-score-num.moderate{color:var(--gold)}
.fit-score-num.poor{color:var(--orange)}
.fit-score-num.mismatch{color:var(--red)}
.coach-verdict{display:inline-block;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.72rem;font-weight:700;text-transform:uppercase;margin-left:0.5rem}
.coach-verdict.perfect{background:var(--green-dim);color:var(--green)}
.coach-verdict.strong{background:rgba(74,222,128,0.12);color:#4ade80}
.coach-verdict.good{background:var(--accent-dim);color:var(--accent)}
.coach-verdict.moderate{background:var(--gold-dim);color:var(--gold)}
.coach-verdict.poor{background:rgba(255,140,66,0.12);color:var(--orange)}
.coach-verdict.mismatch{background:var(--red-dim);color:var(--red)}
.coach-narrative{font-size:0.88rem;color:var(--text-dim);line-height:1.55;margin-top:0.5rem}
.coach-similarity-section{margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border)}
.coach-similarity-section h3{font-size:1.1rem;font-weight:700;color:var(--text-bright);margin-bottom:1rem}
.similarity-result{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;text-align:center}
.similarity-pct{font-size:3rem;font-weight:800;color:var(--accent);margin-bottom:0.25rem}
.similarity-label{color:var(--text-dim);font-size:0.9rem}

/* Scout Mode */
.pro-banner{background:linear-gradient(135deg,var(--accent-dim),var(--green-dim));border:1px solid var(--border);border-radius:10px;padding:0.9rem 1.5rem;text-align:center;color:var(--text-bright);font-weight:600;font-size:0.92rem;margin-bottom:1.5rem}
.slider-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin-bottom:1.5rem}
.slider-card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:1rem 1.25rem}
.slider-card label{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-bright)}
.slider-card label span.slider-val{color:var(--accent);font-weight:700;min-width:28px;text-align:right}
.slider-card input[type=range]{width:100%;-webkit-appearance:none;appearance:none;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;outline:none}
.slider-card input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);cursor:pointer;border:2px solid var(--bg);box-shadow:0 0 6px rgba(0,180,255,0.3)}
.slider-card input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--accent);cursor:pointer;border:2px solid var(--bg)}
.slider-desc{font-size:0.72rem;color:var(--text-dim);margin-top:0.35rem}
.scout-valuation{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;text-align:center}
.scout-valuation .big-multi{font-size:3.5rem;font-weight:800;line-height:1.1}
.scout-valuation .big-multi.green{color:var(--green)}
.scout-valuation .big-multi.blue{color:var(--accent)}
.scout-valuation .big-multi.gray{color:var(--text-dim)}
.scout-val-row{display:flex;justify-content:center;gap:2rem;margin-top:0.75rem;flex-wrap:wrap}
.scout-val-item .s-label{font-size:0.7rem;text-transform:uppercase;color:var(--text-dim);letter-spacing:0.5px}
.scout-val-item .s-value{font-size:1.2rem;font-weight:700;color:var(--text-bright)}

/* Footer */
footer{text-align:center;padding:2rem 1rem;border-top:1px solid var(--border);color:var(--text-dim);font-size:0.8rem;margin-top:2rem}

/* Toast */
.toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(120px);background:var(--card);border:1px solid var(--accent);color:var(--accent);padding:0.7rem 1.5rem;border-radius:8px;font-family:var(--font);font-size:0.88rem;font-weight:600;z-index:200;transition:transform 0.3s ease;pointer-events:none;box-shadow:0 4px 20px rgba(0,180,255,0.2)}
.toast.show{transform:translateX(-50%) translateY(0)}

/* Scrollbar */
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--text-dim)}

/* Responsive */
@media(max-width:768px){
  .header-inner{flex-direction:column;height:auto;padding:0.75rem 0;gap:0.5rem}
  .tab{padding:0.4rem 0.7rem;font-size:0.78rem}
  .search-dropdown{width:100%}
  .selector-row.dual{flex-direction:column;align-items:stretch}
  .multiplier-badge{font-size:1.4rem;min-width:60px}
  .card-top{flex-direction:column}
  .factor-name{width:90px;font-size:0.72rem}
  .slider-grid{grid-template-columns:1fr}
  .player-stats{gap:0.75rem}
}
@media(max-width:480px){
  html{font-size:13px}
  .card-values{gap:0.75rem}
  .val-label{font-size:0.65rem}
}
`;
}

function getEngineJS(): string {
  return `
// ── Valuation Engine (ported from gem-scanner.ts) ─────────────

function evalSystemFit(p, t) {
  var posNeed = t.positionDepth.get(p.position) || 0;
  var posFit = posNeed === 0 ? 0.9 : posNeed === 1 ? 0.5 : posNeed === 2 ? 0 : -0.4;
  var formFit = 0;
  var f = t.formation;
  if (f.indexOf('4-3-3') !== -1) {
    if (['CM','CDM','LW','RW','ST'].indexOf(p.position) !== -1) formFit = 0.4;
    if (['LM','RM'].indexOf(p.position) !== -1) formFit = -0.1;
    if (['CAM'].indexOf(p.position) !== -1) formFit = 0.1;
  } else if (f.indexOf('4-4-2') !== -1) {
    if (['CM','LM','RM','ST'].indexOf(p.position) !== -1) formFit = 0.4;
    if (['CAM','CDM'].indexOf(p.position) !== -1) formFit = -0.1;
    if (['LW','RW'].indexOf(p.position) !== -1) formFit = 0.2;
  } else if (f.indexOf('3-5-2') !== -1 || f.indexOf('3-4-3') !== -1) {
    if (['CB','CM','LM','RM','ST'].indexOf(p.position) !== -1) formFit = 0.4;
    if (['LB','RB'].indexOf(p.position) !== -1) formFit = -0.2;
  } else if (f.indexOf('4-2-3-1') !== -1) {
    if (['CDM','CAM','LW','RW','ST'].indexOf(p.position) !== -1) formFit = 0.4;
    if (['CM'].indexOf(p.position) !== -1) formFit = 0.2;
  }
  var styleFit = 0;
  if (t.style === 'possession' && p.passCompletionRate > 0.85) styleFit = 0.5;
  if (t.style === 'possession' && p.passCompletionRate < 0.78) styleFit = -0.3;
  if (t.style === 'counter' && p.sprintCapacity > 25) styleFit = 0.5;
  if (t.style === 'counter' && p.sprintCapacity < 15) styleFit = -0.3;
  if (t.style === 'pressing' && p.defensiveWorkRate > 0.65) styleFit = 0.5;
  if (t.style === 'pressing' && p.defensiveWorkRate < 0.4) styleFit = -0.4;
  if (t.style === 'balanced') styleFit = 0.1;
  var score = posFit * 0.4 + formFit * 0.3 + styleFit * 0.3;
  return {
    name: 'System Fit',
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.25,
    explanation: 'Position need: ' + (posNeed === 0 ? 'CRITICAL' : posNeed === 1 ? 'high' : posNeed === 2 ? 'adequate' : 'saturated') +
      '. Formation: ' + (formFit > 0 ? 'compatible' : formFit < 0 ? 'awkward' : 'neutral') +
      '. Style: ' + (styleFit > 0.2 ? 'strong match' : styleFit < -0.2 ? 'mismatch' : 'acceptable') + '.'
  };
}

function evalStructuralImpact(p, t) {
  var defImpact = 0;
  var playsLeft = p.avgY < -10;
  var playsRight = p.avgY > 10;
  if (t.weakestZone.indexOf('left') !== -1 && playsLeft) defImpact = 0.7;
  else if (t.weakestZone.indexOf('right') !== -1 && playsRight) defImpact = 0.7;
  else if (t.weakestZone.indexOf('center') !== -1 && !playsLeft && !playsRight) defImpact = 0.4;
  var connDelta = (p.currentConnections - t.avgPlayerConnections) / Math.max(t.avgPlayerConnections, 1);
  var netImpact = Math.max(-0.6, Math.min(0.6, connDelta * 0.8));
  var mcImpact = (p.defensiveWorkRate > 0.6 && t.avgMincut < 0.5) ? 0.5 :
    (p.defensiveWorkRate < 0.3 && t.avgMincut < 0.4) ? -0.2 : 0.1;
  var score = defImpact * 0.4 + netImpact * 0.3 + mcImpact * 0.3;
  return {
    name: 'Structural Impact',
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.25,
    explanation: 'Defense: ' + (defImpact > 0.3 ? 'fills ' + t.weakestZone + ' gap' : 'no gap fill') +
      '. Network: ' + (netImpact > 0.15 ? 'boosts connectivity' : netImpact < -0.15 ? 'lowers connectivity' : 'neutral') +
      '. MinCut: ' + (mcImpact > 0.3 ? 'strengthens' : 'limited') + '.'
  };
}

function evalChemistry(p, t) {
  var centMatch = 1 - Math.abs(p.currentPageRank - t.avgPlayerCentrality) / Math.max(t.avgPlayerCentrality, 0.01);
  var hubComp = 0;
  if (t.hubDependency > 0.5) {
    hubComp = p.currentConnections > t.avgPlayerConnections * 1.2 ? 0.6 : -0.15;
  }
  var complementary = {
    'LW':['LB','CM'],'RW':['RB','CM'],'ST':['CM','CAM','LW','RW'],
    'CM':['CB','ST','LW','RW','CDM'],'CDM':['CB','CM'],'CAM':['ST','CM'],
    'LB':['LW','CM','CB'],'RB':['RW','CM','CB'],'CB':['CDM','CM','CB'],
    'LM':['LB','CM','ST'],'RM':['RB','CM','ST']
  };
  var compPositions = complementary[p.position] || [];
  var hasComp = compPositions.some(function(pos) { return (t.positionDepth.get(pos) || 0) >= 1; });
  var posComp = hasComp ? 0.3 : 0;
  var score = centMatch * 0.3 + hubComp * 0.4 + posComp * 0.3;
  return {
    name: 'Chemistry',
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.20,
    explanation: 'Centrality match: ' + (centMatch > 0.6 ? 'good' : 'moderate') +
      '. Hub effect: ' + (hubComp > 0.3 ? 'reduces hub dependency' : hubComp < -0.1 ? 'increases dependency' : 'neutral') +
      '. Pairings: ' + (hasComp ? 'complementary positions exist' : 'limited') + '.'
  };
}

function evalRedundancy(p, t) {
  var depth = t.positionDepth.get(p.position) || 0;
  var score = depth === 0 ? 0.9 : depth === 1 ? 0.5 : depth === 2 ? -0.1 : depth === 3 ? -0.5 : -0.7;
  return {
    name: 'Redundancy',
    score: score,
    weight: 0.15,
    explanation: depth + ' players at ' + p.position + '. ' +
      (depth === 0 ? 'CRITICAL GAP' : depth === 1 ? 'Low depth' : depth === 2 ? 'Adequate' : 'Saturated') + '.'
  };
}

function evalRisk(p, t) {
  var score = 0;
  var expl = '';
  if (p.currentPageRank > t.avgPlayerCentrality * 1.8) {
    if (t.hubDependency > 0.5) { score = -0.3; expl = 'Would become new single point of failure. '; }
    else { score = 0.2; expl = 'Could become positive hub in distributed system. '; }
  } else { score = 0.15; expl = 'Integrates without excessive dependency. '; }
  if (p.age >= 30 && p.contractYearsLeft <= 2) {
    score -= 0.35; expl += 'Age ' + p.age + ', ' + p.contractYearsLeft + 'yr contract - limited window.';
  } else if (p.age >= 28) {
    score -= 0.1; expl += 'Age ' + p.age + ' - peak but declining horizon.';
  } else if (p.age <= 23) {
    score += 0.25; expl += 'Age ' + p.age + ' - significant development upside.';
  } else { expl += 'Age ' + p.age + ' - prime years.'; }
  if (p.league === t.league) { score -= 0.1; expl += ' Same-league premium applies.'; }
  return {
    name: 'Risk & Upside',
    score: Math.max(-1, Math.min(1, score)),
    weight: 0.15,
    explanation: expl
  };
}

function computeValuation(p, t) {
  if (p.club === t.name) {
    return {
      team: t.name, player: p.name, position: p.position,
      club: p.club, league: p.league, age: p.age,
      marketValue: p.marketValue, contextValue: p.marketValue,
      multiplier: 1.0, verdict: 'fair', topFactor: 'Current club', topFactorScore: 0,
      factors: []
    };
  }
  var factors = [
    evalSystemFit(p, t),
    evalStructuralImpact(p, t),
    evalChemistry(p, t),
    evalRedundancy(p, t),
    evalRisk(p, t)
  ];
  var weightedScore = factors.reduce(function(s, f) { return s + f.score * f.weight; }, 0);
  var totalWeight = factors.reduce(function(s, f) { return s + f.weight; }, 0);
  var norm = weightedScore / totalWeight;
  var multiplier = Math.round(Math.exp(norm * 0.92) * 100) / 100;
  var contextValue = Math.round(p.marketValue * multiplier * 10) / 10;
  var verdict = multiplier > 1.3 ? 'bargain' : multiplier > 0.85 ? 'fair' : multiplier > 0.55 ? 'overpay' : 'avoid';
  var sorted = factors.slice().sort(function(a, b) { return Math.abs(b.score * b.weight) - Math.abs(a.score * a.weight); });
  var topF = sorted[0];
  return {
    team: t.name, player: p.name, position: p.position,
    club: p.club, league: p.league, age: p.age,
    marketValue: p.marketValue, contextValue: contextValue, multiplier: multiplier, verdict: verdict,
    topFactor: topF.name, topFactorScore: topF.score,
    factors: factors
  };
}

// ── Coach-Team Fit Engine (ported from coach-vector.ts) ────────

function clampVal(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function lerpVal(a, b, t) { return a + (b - a) * t; }
function styleToSpectrum(style) {
  if (style === 'possession') return 0.85;
  if (style === 'pressing') return 0.6;
  if (style === 'balanced') return 0.5;
  if (style === 'counter') return 0.2;
  return 0.5;
}
function depthFor(depth, positions) {
  return positions.reduce(function(s, p) { return s + (depth.get(p) || 0); }, 0);
}
function isThreeAtBack(f) { return f.charAt(0) === '3'; }
function usesWingers(f) { return f.indexOf('3-3') !== -1 || f.indexOf('4-3-3') !== -1 || f.indexOf('3-4-3') !== -1; }
function wingerCount(d) { return depthFor(d, ['LW','RW','LM','RM']); }
function cbCount(d) { return depthFor(d, ['CB']); }
function wbCount(d) { return depthFor(d, ['LB','RB']); }

function avgDefWorkRate(players) {
  if (!players.length) return 0.5;
  return players.reduce(function(s,p){return s+p.defensiveWorkRate;},0) / players.length;
}
function avgSprintCap(players) {
  if (!players.length) return 22;
  return players.reduce(function(s,p){return s+p.sprintCapacity;},0) / players.length;
}
function avgCBSpd(players) {
  var cbs = players.filter(function(p){return p.position==='CB';});
  if (!cbs.length) return 5.5;
  return cbs.reduce(function(s,p){return s+p.avgSpeed;},0) / cbs.length;
}
function avgMidPass(players) {
  var mids = players.filter(function(p){return ['CM','CDM','CAM'].indexOf(p.position)!==-1;});
  if (!mids.length) return 0.84;
  return mids.reduce(function(s,p){return s+p.passCompletionRate;},0) / mids.length;
}
function avgPlayerAge(players) {
  if (!players.length) return 26;
  return players.reduce(function(s,p){return s+p.age;},0) / players.length;
}
function youthFrac(players) {
  if (!players.length) return 0.2;
  return players.filter(function(p){return p.age<23;}).length / players.length;
}

function getTeamPlayers(teamName) {
  var variants = {
    'Tottenham': ['Tottenham Hotspur'],
    'Manchester United': ['Manchester United'],
    'Chelsea': ['Chelsea'],
    'Newcastle': ['Newcastle United'],
    'Newcastle United': ['Newcastle United'],
    'Aston Villa': ['Aston Villa'],
    'Crystal Palace': ['Crystal Palace'],
    'Paris Saint-Germain': ['Paris Saint-Germain'],
    'PSG': ['Paris Saint-Germain']
  };
  var names = variants[teamName] || [teamName];
  return PLAYERS.filter(function(p) { return names.indexOf(p.club) !== -1; });
}

function evaluateCoachTeamFit(coach, team) {
  var teamPlayers = getTeamPlayers(team.name);
  var factors = [];

  // Factor 1: Tactical Style Match (weight 2.0)
  var teamSpectrum = styleToSpectrum(team.style);
  var coachPoss = (coach.avgPossession || 53) / 100;
  var styleDiff = Math.abs(coachPoss - teamSpectrum);
  var styleScore = 1 - styleDiff * 2;
  factors.push({
    name: 'Tactical Style Match',
    score: clampVal(styleScore, -1, 1),
    weight: 2.0,
    explanation: styleDiff < 0.15 ? coach.name + "'s style aligns naturally with " + team.name + "'s current approach"
      : styleDiff < 0.3 ? 'Some tactical adjustment needed - ' + coach.name + ' prefers ' + (coach.avgPossession||53) + '% possession vs ' + team.name + "'s " + team.style + ' style'
      : 'Major style overhaul required - ' + coach.name + ' would transform ' + team.name + "'s playing identity"
  });

  // Factor 2: Squad Profile Match (weight 2.5)
  var squadScore = 0;
  var squadExpl = '';
  if (teamPlayers.length > 0) {
    var dwr = avgDefWorkRate(teamPlayers);
    var sprint = avgSprintCap(teamPlayers);
    var cbSpd = avgCBSpd(teamPlayers);
    var midPass = avgMidPass(teamPlayers);
    var coachPressDemand = 1 - ((coach.pressingIntensity || 10) - 6) / 8;
    var pressingFit = 1 - Math.abs(dwr - coachPressDemand) * 2;
    var lineRisk = (coach.defensiveLineHeight || 0.5) > 0.65 ? (cbSpd - 5.2) / 0.8 : 0.5;
    var buildUpFit = coach.buildUpStyle === 'short' ? (midPass - 0.8) / 0.12 : 0.5;
    var counterFit = (coach.counterAttackFrequency || 6) > 8 ? (sprint - 20) / 10 : 0.5;
    squadScore = pressingFit * 0.3 + clampVal(lineRisk,-1,1) * 0.25 + clampVal(buildUpFit,-1,1) * 0.25 + clampVal(counterFit,-1,1) * 0.2;
    var weak = [];
    if (pressingFit < 0.2) weak.push('low work-rate squad vs high pressing demands');
    if (lineRisk < 0 && (coach.defensiveLineHeight||0.5) > 0.65) weak.push('slow CBs exposed by high line');
    if (buildUpFit < 0 && coach.buildUpStyle === 'short') weak.push('midfield lacks passing quality for short build-up');
    if (counterFit < 0 && (coach.counterAttackFrequency||6) > 8) weak.push('squad lacks pace for transitions');
    squadExpl = weak.length === 0 ? team.name + "'s player profiles suit " + coach.name + "'s demands well" : 'Concerns: ' + weak.join('; ');
  } else {
    squadExpl = 'No individual player data available - using team-level estimates only';
  }
  factors.push({ name: 'Squad Profile Match', score: clampVal(squadScore,-1,1), weight: 2.5, explanation: squadExpl });

  // Factor 3: Formation Compatibility (weight 1.5)
  var coachForm = coach.preferredFormation || '4-3-3';
  var coachThreeBack = isThreeAtBack(coachForm);
  var tCBs = cbCount(team.positionDepth);
  var tWBs = wbCount(team.positionDepth);
  var tWingers = wingerCount(team.positionDepth);
  var formScore = 0;
  if (coachThreeBack) {
    var cbFit = tCBs >= 5 ? 0.5 : tCBs >= 4 ? 0 : -0.5;
    var wbFit = tWBs >= 4 ? 0.5 : tWBs >= 3 ? 0.1 : -0.3;
    formScore = cbFit + wbFit;
  } else {
    if (usesWingers(coachForm)) {
      formScore = tWingers >= 6 ? 0.6 : tWingers >= 4 ? 0.2 : -0.4;
    } else {
      var midDep = depthFor(team.positionDepth, ['CM','CDM','CAM']);
      formScore = midDep >= 7 ? 0.5 : midDep >= 5 ? 0.2 : -0.3;
    }
  }
  if (coachForm === team.formation) formScore += 0.3;
  formScore += ((coach.formationFlexibility || 3) - 3) * 0.1;
  factors.push({
    name: 'Formation Compatibility',
    score: clampVal(formScore,-1,1),
    weight: 1.5,
    explanation: coachForm === team.formation ? coach.name + "'s preferred " + coachForm + " matches " + team.name + "'s current setup"
      : coachThreeBack && tCBs < 5 ? coach.name + " favours " + coachForm + " but " + team.name + " only have " + tCBs + " CBs - recruitment needed"
      : coach.name + " would switch from " + team.formation + " to " + coachForm
  });

  // Factor 4: Network Structure (weight 1.5)
  var coachHub = coach.avgHubDependency || 0.5;
  var teamHub = team.hubDependency;
  var hubDelta = coachHub - teamHub;
  var netScore = 0;
  if (coachHub < 0.45 && teamHub > 0.6) netScore = 0.7;
  else if (Math.abs(hubDelta) < 0.15) netScore = 0.4;
  else if (coachHub > 0.6 && teamHub > 0.6) netScore = 0.1;
  else netScore = -0.1 * Math.abs(hubDelta) * 5;
  var densityDelta = Math.abs((coach.avgPassNetworkDensity || 0.75) - team.networkDensity);
  netScore -= densityDelta;
  factors.push({
    name: 'Network Structure',
    score: clampVal(netScore,-1,1),
    weight: 1.5,
    explanation: coachHub < 0.45 && teamHub > 0.6 ? coach.name + " would reduce " + team.name + "'s over-reliance on " + team.hubPlayer
      : Math.abs(hubDelta) < 0.15 ? coach.name + "'s network approach matches " + team.name + "'s current hub dependency"
      : coach.name + "'s preferred network structure differs significantly from current setup"
  });

  // Factor 5: Defensive Philosophy Match (weight 1.5)
  var coachLine = coach.defensiveLineHeight || 0.5;
  var coachCompact = coach.defensiveCompactness || 0.7;
  var teamMC = team.avgMincut;
  var defScore = 0;
  if (coachLine > 0.65 && teamMC > 0.65) defScore = 0.6;
  else if (coachLine > 0.65 && teamMC < 0.55) defScore = -0.4;
  else if (coachLine < 0.45 && teamMC > 0.6) defScore = 0.3;
  else defScore = 0.2;
  if (coachCompact > 0.8 && teamMC < 0.55) defScore += 0.3;
  defScore -= Math.abs((coach.avgTeamMincut || 0.6) - teamMC) * 0.5;
  factors.push({
    name: 'Defensive Philosophy',
    score: clampVal(defScore,-1,1),
    weight: 1.5,
    explanation: coachLine > 0.65 && teamMC < 0.55 ? coach.name + "'s high defensive line is risky with " + team.name + "'s weak MinCut"
      : coachCompact > 0.8 && teamMC < 0.55 ? coach.name + "'s compactness could shore up " + team.name + "'s leaky defence"
      : 'Defensive philosophies are broadly compatible'
  });

  // Factor 6: Development Profile (weight 1.0)
  var devScore = 0;
  var tYouth = teamPlayers.length > 0 ? youthFrac(teamPlayers) : 0.2;
  var tAge = teamPlayers.length > 0 ? avgPlayerAge(teamPlayers) : 26;
  var coachYS = coach.youngPlayerMinuteShare || 0.15;
  if (tYouth > 0.3) devScore = coachYS > 0.2 ? 0.6 : coachYS > 0.15 ? 0.2 : -0.3;
  else if (tAge > 28) devScore = coach.careerWinRate > 0.55 ? 0.5 : 0;
  else devScore = 0.2;
  devScore += ((coach.playerValueGrowth || 20) - 20) / 100;
  factors.push({
    name: 'Development Profile',
    score: clampVal(devScore,-1,1),
    weight: 1.0,
    explanation: tYouth > 0.3 && coachYS > 0.2 ? coach.name + "'s track record of developing young players suits " + team.name + "'s squad"
      : tYouth > 0.3 && coachYS < 0.15 ? team.name + "'s young squad may not get enough opportunities under " + coach.name
      : 'Development profile is a reasonable match'
  });

  // Factor 7: Cultural & Personality Fit (weight 1.0)
  var adapt = coach.culturalAdaptability || 5;
  var boardRel = coach.boardRelationshipScore || 5;
  var playerRel = coach.playerRelationshipScore || 5;
  var crisis = coach.crisisManagement || 5;
  var cultScore = (adapt/10)*0.3 + (boardRel/10)*0.25 + (playerRel/10)*0.25 + (crisis/10)*0.2;
  cultScore = cultScore * 2 - 1;
  if (teamMC < 0.52 && crisis >= 8) cultScore += 0.2;
  factors.push({
    name: 'Cultural Fit',
    score: clampVal(cultScore,-1,1),
    weight: 1.0,
    explanation: adapt >= 8 ? coach.name + "'s high cultural adaptability makes transition smoother"
      : boardRel < 5 ? coach.name + "'s history of board conflicts is a concern"
      : 'Personality profile is within normal range'
  });

  // Factor 8: Performance Track Record (weight 1.0)
  var wr = coach.careerWinRate;
  var xgOver = coach.xGOverperformance || 0;
  var crisisMgmt = coach.crisisManagement || 5;
  var perfScore = (wr - 0.45) * 2 + xgOver * 0.05 + (crisisMgmt - 5) * 0.05;
  factors.push({
    name: 'Track Record',
    score: clampVal(perfScore,-1,1),
    weight: 1.0,
    explanation: wr > 0.58 ? coach.name + "'s " + (wr*100).toFixed(0) + '% career win rate is elite'
      : wr > 0.50 ? coach.name + "'s " + (wr*100).toFixed(0) + '% win rate is solid but not dominant'
      : coach.name + "'s " + (wr*100).toFixed(0) + '% win rate reflects experience at smaller clubs'
  });

  // Aggregate
  var totalWeight = factors.reduce(function(s,f){return s+f.weight;},0);
  var weightedSum = factors.reduce(function(s,f){return s+f.score*f.weight;},0);
  var rawScore = weightedSum / totalWeight;
  var fitScore = Math.round(clampVal((rawScore + 1) * 50, 0, 100));
  var multiplier = Number(lerpVal(0.85, 1.25, fitScore / 100).toFixed(2));
  var verdict;
  if (fitScore >= 80) verdict = 'perfect';
  else if (fitScore >= 70) verdict = 'strong';
  else if (fitScore >= 60) verdict = 'good';
  else if (fitScore >= 50) verdict = 'moderate';
  else if (fitScore >= 35) verdict = 'poor';
  else verdict = 'mismatch';
  var sqCompat = Number(clampVal((factors[1].score + 1) / 2, 0, 1).toFixed(2));
  var srtd = factors.slice().sort(function(a,b){return b.score*b.weight - a.score*a.weight;});
  var topStr = srtd[0].explanation;
  var wrstd = factors.slice().sort(function(a,b){return a.score*a.weight - b.score*b.weight;});
  var topConc = wrstd[0].explanation;

  // Narrative
  var verdictPhrases = {
    perfect: coach.name + ' is a near-ideal fit for ' + team.name + '.',
    strong: coach.name + ' would be a strong appointment at ' + team.name + '.',
    good: coach.name + ' is a credible candidate for ' + team.name + '.',
    moderate: coach.name + ' at ' + team.name + ' would be a mixed bag.',
    poor: coach.name + ' at ' + team.name + ' raises serious questions.',
    mismatch: coach.name + ' at ' + team.name + ' would be a culture shock.'
  };
  var narrative = verdictPhrases[verdict] || '';
  var bestF = srtd[0];
  if (bestF.name === 'Squad Profile Match' && sqCompat > 0.6) narrative += " The squad's player profiles are well-suited to " + coach.name + "'s demands.";
  else if (bestF.name === 'Tactical Style Match') narrative += ' The tactical alignment is natural, minimizing transition friction.';
  else if (bestF.name === 'Network Structure') narrative += ' ' + coach.name + "'s approach to network distribution would address " + team.name + "'s structural issues.";
  else if (bestF.name === 'Track Record') narrative += ' ' + coach.name + "'s proven winning pedigree is the main draw.";
  else narrative += ' The strongest factor is ' + bestF.name.toLowerCase() + '.';
  if (wrstd[0].score < 0) {
    if (wrstd[0].name === 'Formation Compatibility') narrative += ' However, the formation switch needs squad reinforcement.';
    else if (wrstd[0].name === 'Defensive Philosophy') narrative += ' The defensive transition is the biggest risk.';
    else if (wrstd[0].name === 'Squad Profile Match') narrative += " The squad profile is a concern: key players may not suit " + coach.name + "'s system.";
    else narrative += ' The main worry is ' + wrstd[0].name.toLowerCase() + '.';
  }

  return {
    coach: coach.name, team: team.name, fitScore: fitScore, multiplier: multiplier,
    verdict: verdict, factors: factors, squadCompatibility: sqCompat,
    styleDelta: Number(styleDiff.toFixed(2)), topStrength: topStr, topConcern: topConc, narrative: narrative
  };
}

// Coach similarity (cosine)
function coachToVec(c) {
  return [
    c.careerWinRate, (c.avgPossession||53)/100, (c.pressingIntensity||10)/14,
    c.defensiveLineHeight||0.5, c.defensiveCompactness||0.7, (c.counterAttackFrequency||6)/14,
    c.widthInPossession||0.7, c.positionalPlayScore||0.5, c.avgHubDependency||0.5,
    c.avgPassNetworkDensity||0.75, c.avgTeamMincut||0.6, c.avgFormationStability||0.7,
    c.buildUpStyle==='short'?1:c.buildUpStyle==='mixed'?0.5:0,
    c.buildUpSpeed==='fast'?1:c.buildUpSpeed==='moderate'?0.5:0,
    c.youngPlayerMinuteShare||0.15, (c.playerValueGrowth||20)/50,
    c.squadRotation||0.5, c.tacticalAdaptability||0.5,
    ((c.xGOverperformance||0)+2)/6, (c.motivationalIntensity||5)/10,
    (c.mediaProfile||5)/10, (c.playerRelationshipScore||5)/10,
    (c.culturalAdaptability||5)/10, (c.crisisManagement||5)/10,
    (c.formationFlexibility||3)/5, c.setPlayGoalRate||0.12,
    (c.crossingRate||20)/30, (c.pressingHeight||50)/60
  ];
}
function cosineSim(a, b) {
  var dot = 0, mA = 0, mB = 0;
  for (var i = 0; i < a.length; i++) { dot += a[i]*b[i]; mA += a[i]*a[i]; mB += b[i]*b[i]; }
  var denom = Math.sqrt(mA) * Math.sqrt(mB);
  return denom === 0 ? 0 : dot / denom;
}
`;
}

function getUIJS(): string {
  return `
// ── UI Controller ──────────────────────────────────────────────

(function() {
  'use strict';

  // ── Tab switching ──────────────────────────────────
  var tabs = document.querySelectorAll('.tab');
  var views = document.querySelectorAll('.view');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = tab.getAttribute('data-tab');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      views.forEach(function(v) { v.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('view-' + target).classList.add('active');
    });
  });

  // ── Toast ──────────────────────────────────────────
  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2500);
  }

  // ── Share button delegation ─────────────────────────
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.share-btn[data-share]');
    if (btn) {
      var text = btn.getAttribute('data-share');
      navigator.clipboard.writeText(text).then(function() {
        showToast('Copied to clipboard!');
      }).catch(function() {
        showToast('Could not copy to clipboard');
      });
    }
  });

  // ── Dropdown helper ────────────────────────────────
  function setupDropdown(searchId, listId, items, onSelect) {
    var input = document.getElementById(searchId);
    var list = document.getElementById(listId);
    var selectedValue = null;

    function render(filter) {
      list.innerHTML = '';
      var f = (filter || '').toLowerCase();
      items.forEach(function(item) {
        var label = typeof item === 'string' ? item : item.label;
        var value = typeof item === 'string' ? item : item.value;
        var extra = typeof item === 'object' && item.extra ? item.extra : '';
        if (f && label.toLowerCase().indexOf(f) === -1) return;
        var div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerHTML = label + (extra ? '<span class="league-tag">' + extra + '</span>' : '');
        div.addEventListener('click', function() {
          selectedValue = value;
          input.value = label;
          list.classList.remove('open');
          onSelect(value, label);
        });
        list.appendChild(div);
      });
    }

    input.addEventListener('focus', function() {
      render(input.value);
      list.classList.add('open');
    });
    input.addEventListener('input', function() {
      render(input.value);
      list.classList.add('open');
    });
    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !list.contains(e.target)) {
        list.classList.remove('open');
      }
    });
    return { getSelected: function() { return selectedValue; } };
  }

  // ── Build dropdown data ────────────────────────────
  var clubItems = TEAMS.map(function(t) { return { label: t.name, value: t.name, extra: t.league }; });
  var playerItems = PLAYERS.map(function(p) { return { label: p.name, value: p.name, extra: p.position + ' - ' + p.club }; });
  var coachItems = COACHES.map(function(c) { return { label: c.name, value: c.name, extra: c.currentClub || 'Available' }; });

  // ── Multiplier badge class ─────────────────────────
  function multClass(m) {
    if (m > 1.3) return 'green';
    if (m > 1.1) return 'blue';
    if (m < 0.7) return 'red';
    return 'gray';
  }

  function verdictClass(v) {
    return v;
  }

  // ── Factor bars HTML ───────────────────────────────
  function factorBarsHTML(factors) {
    if (!factors || !factors.length) return '';
    var html = '<div class="factor-bars">';
    factors.forEach(function(f) {
      var pct = Math.abs(f.score) * 50;
      var cls = f.score > 0.01 ? 'positive' : f.score < -0.01 ? 'negative' : 'positive';
      var scCls = f.score > 0.01 ? 'pos' : f.score < -0.01 ? 'neg' : 'zero';
      var barStyle = '';
      if (f.score >= 0) {
        barStyle = 'left:50%;width:' + pct + '%';
      } else {
        barStyle = 'right:50%;width:' + pct + '%';
      }
      html += '<div class="factor-row">' +
        '<span class="factor-name">' + f.name + '</span>' +
        '<div class="factor-bar-bg"><div class="factor-center"></div><div class="factor-bar-fill ' + cls + '" style="' + barStyle + '"></div></div>' +
        '<span class="factor-score ' + scCls + '">' + (f.score > 0 ? '+' : '') + f.score.toFixed(2) + '</span>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  // ── Gem Card HTML ──────────────────────────────────
  function gemCardHTML(v, rank, locked) {
    var mc = multClass(v.multiplier);
    var card = '<div class="gem-card' + (locked ? ' locked' : '') + '">';
    if (locked) {
      card += '<div class="lock-overlay"><div class="lock-icon">&#128274;</div><button class="lock-btn">Unlock with Pro</button></div>';
    }
    card += '<div class="card-body">';
    card += '<div class="card-top">';
    card += '<div class="card-player-info"><h3>' + (rank ? '#' + rank + ' ' : '') + v.player + '</h3>';
    card += '<div class="card-meta"><span>' + v.position + '</span><span>Age ' + v.age + '</span><span>' + v.club + '</span><span>' + v.league + '</span></div></div>';
    card += '<div class="multiplier-badge ' + mc + '">' + v.multiplier.toFixed(2) + 'x<span class="badge-label">' + v.verdict + '</span></div>';
    card += '</div>';
    card += '<div class="card-values">';
    card += '<div class="val-item"><span class="val-label">Market Value</span><span class="val-number">&euro;' + v.marketValue + 'M</span></div>';
    card += '<div class="val-item"><span class="val-label">Context Value</span><span class="val-number context">&euro;' + v.contextValue + 'M</span></div>';
    card += '<div class="val-item"><span class="val-label">Top Factor</span><span class="val-number">' + v.topFactor + (v.topFactorScore > 0 ? ' &#8593;' : ' &#8595;') + '</span></div>';
    card += '</div>';
    if (!locked) {
      card += '<div class="card-explanation">' + v.factors.map(function(f){return f.explanation;}).join(' ') + '</div>';
      card += factorBarsHTML(v.factors);
    }
    card += '</div></div>';
    return card;
  }

  // ══════════════════════════════════════════════════════
  // TAB 1: Hidden Gems
  // ══════════════════════════════════════════════════════
  setupDropdown('gems-club-search', 'gems-club-list', clubItems, function(teamName) {
    var team = TEAMS.find(function(t) { return t.name === teamName; });
    if (!team) return;
    var valuations = [];
    PLAYERS.forEach(function(p) {
      if (p.club === team.name) return;
      valuations.push(computeValuation(p, team));
    });
    valuations.sort(function(a, b) { return b.multiplier - a.multiplier; });

    var container = document.getElementById('gems-results');
    var html = '';
    valuations.forEach(function(v, i) {
      if (i < 3) {
        html += gemCardHTML(v, i + 1, false);
        if (i === 0) {
          var shareText = 'PitchIntel says ' + v.player + ' is worth \\u20AC' + v.contextValue + 'M to ' + team.name + ' (market: \\u20AC' + v.marketValue + 'M). pitchintel.com';
          html += '<div style="margin:-0.5rem 0 1rem;display:flex;gap:0.5rem">';
          html += '<button class="share-btn" data-share="' + shareText.replace(/"/g, '&quot;') + '">&#9993; Share</button>';
          html += '</div>';
        }
      } else if (i < 10) {
        html += gemCardHTML(v, i + 1, true);
      }
    });

    if (valuations.length === 0) {
      html = '<p style="color:var(--text-dim);padding:2rem 0">No external players found for valuation.</p>';
    }
    container.innerHTML = html;
  });

  // ══════════════════════════════════════════════════════
  // TAB 2: Player Lookup
  // ══════════════════════════════════════════════════════
  setupDropdown('player-search', 'player-list', playerItems, function(playerName) {
    var player = PLAYERS.find(function(p) { return p.name === playerName; });
    if (!player) return;

    var container = document.getElementById('player-results');
    var html = '';

    // Player card
    html += '<div class="player-card"><h3>' + player.name + '</h3>';
    html += '<div class="player-stats">';
    html += '<div class="player-stat"><span class="stat-val">' + player.position + '</span><span class="stat-lbl">Position</span></div>';
    html += '<div class="player-stat"><span class="stat-val">' + player.age + '</span><span class="stat-lbl">Age</span></div>';
    html += '<div class="player-stat"><span class="stat-val">' + player.club + '</span><span class="stat-lbl">Club</span></div>';
    html += '<div class="player-stat"><span class="stat-val">&euro;' + player.marketValue + 'M</span><span class="stat-lbl">Market Value</span></div>';
    html += '<div class="player-stat"><span class="stat-val">' + (player.passCompletionRate * 100).toFixed(0) + '%</span><span class="stat-lbl">Pass Completion</span></div>';
    html += '<div class="player-stat"><span class="stat-val">' + player.sprintCapacity + '</span><span class="stat-lbl">Sprint Capacity</span></div>';
    html += '<div class="player-stat"><span class="stat-val">' + player.defensiveWorkRate.toFixed(2) + '</span><span class="stat-lbl">Def Work Rate</span></div>';
    html += '<div class="player-stat"><span class="stat-val">' + player.currentConnections + '</span><span class="stat-lbl">Connections</span></div>';
    html += '</div></div>';

    // Valuation table
    var valuations = [];
    TEAMS.forEach(function(t) {
      valuations.push(computeValuation(player, t));
    });
    valuations.sort(function(a, b) { return b.multiplier - a.multiplier; });

    html += '<div class="table-blur-wrap">';
    html += '<div style="overflow-x:auto"><table class="valuation-table"><thead><tr>';
    html += '<th>Club</th><th>League</th><th>Context Value</th><th>Multiplier</th><th>Verdict</th><th>Top Factor</th>';
    html += '</tr></thead><tbody>';

    valuations.forEach(function(v, i) {
      var rowClass = v.verdict + (i >= 10 ? ' blur-rows' : '');
      html += '<tr class="' + rowClass + '">';
      html += '<td style="font-weight:600;color:var(--text-bright)">' + v.team + '</td>';
      html += '<td>' + v.league + '</td>';
      html += '<td style="font-weight:600">&euro;' + v.contextValue + 'M</td>';
      html += '<td><span style="font-weight:700;color:' + (v.multiplier > 1.3 ? 'var(--green)' : v.multiplier > 1.1 ? 'var(--accent)' : v.multiplier < 0.7 ? 'var(--red)' : 'var(--text)') + '">' + v.multiplier.toFixed(2) + 'x</span></td>';
      html += '<td><span class="verdict-tag ' + v.verdict + '">' + v.verdict + '</span></td>';
      html += '<td style="font-size:0.8rem;color:var(--text-dim)">' + v.topFactor + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (valuations.length > 10) {
      html += '<div class="table-blur-overlay"><button class="show-all-btn">Show all 30 clubs (Pro)</button></div>';
    }
    html += '</div>';

    container.innerHTML = html;
  });

  // ══════════════════════════════════════════════════════
  // TAB 3: Coach Fit
  // ══════════════════════════════════════════════════════
  setupDropdown('coach-club-search', 'coach-club-list', clubItems, function(teamName) {
    var team = TEAMS.find(function(t) { return t.name === teamName; });
    if (!team) return;

    var fits = COACHES.filter(function(c) { return c.currentClub !== team.name; })
      .map(function(c) { return evaluateCoachTeamFit(c, team); })
      .sort(function(a, b) { return b.fitScore - a.fitScore; });

    var container = document.getElementById('coach-results');
    var html = '';

    // Top 5
    fits.slice(0, 5).forEach(function(fit, i) {
      html += coachCardHTML(fit, i + 1, false);
    });

    // Worst fit
    if (fits.length > 0) {
      var worst = fits[fits.length - 1];
      html += '<div style="margin-top:1.5rem"><h3 style="color:var(--red);font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:0.75rem">&#9888; Worst Fit (Contrarian Angle)</h3></div>';
      html += coachCardHTML(worst, fits.length, true);
    }

    container.innerHTML = html;
    document.getElementById('coach-similarity').style.display = 'block';
  });

  function coachCardHTML(fit, rank, isWorst) {
    var barColor = fit.verdict === 'perfect' ? 'var(--green)' : fit.verdict === 'strong' ? '#4ade80' : fit.verdict === 'good' ? 'var(--accent)' : fit.verdict === 'moderate' ? 'var(--gold)' : fit.verdict === 'poor' ? 'var(--orange)' : 'var(--red)';
    var html = '<div class="coach-card' + (isWorst ? ' worst' : '') + '">';
    html += '<h3>#' + rank + ' ' + fit.coach + '<span class="coach-verdict ' + fit.verdict + '">' + fit.verdict + '</span></h3>';
    html += '<div class="fit-bar-wrap">';
    html += '<div class="fit-bar-outer"><div class="fit-bar-inner" style="width:' + fit.fitScore + '%;background:' + barColor + '"></div></div>';
    html += '<span class="fit-score-num ' + fit.verdict + '">' + fit.fitScore + '</span>';
    html += '</div>';
    html += factorBarsHTML(fit.factors);
    html += '<div class="coach-narrative">' + fit.narrative + '</div>';
    html += '</div>';
    return html;
  }

  // Coach similarity
  var coachARef = setupDropdown('coach-a-search', 'coach-a-list', coachItems, calcSimilarity);
  var coachBRef = setupDropdown('coach-b-search', 'coach-b-list', coachItems, calcSimilarity);

  function calcSimilarity() {
    var a = coachARef.getSelected();
    var b = coachBRef.getSelected();
    if (!a || !b) return;
    var cA = COACHES.find(function(c) { return c.name === a; });
    var cB = COACHES.find(function(c) { return c.name === b; });
    if (!cA || !cB) return;
    var sim = cosineSim(coachToVec(cA), coachToVec(cB));
    var pct = (sim * 100).toFixed(1);
    var container = document.getElementById('similarity-result');
    container.innerHTML = '<div class="similarity-result">' +
      '<div class="similarity-pct">' + pct + '%</div>' +
      '<div class="similarity-label">Tactical similarity between ' + cA.name + ' and ' + cB.name + '</div>' +
      '</div>';
  }

  // ══════════════════════════════════════════════════════
  // TAB 4: Scout Mode
  // ══════════════════════════════════════════════════════
  var scoutDimensions = [
    { id: 'culture', label: 'Culture Fit', desc: 'How well the player adapts to the club culture', default: 50 },
    { id: 'coachability', label: 'Coachability', desc: 'Willingness to learn and adapt to new systems', default: 50 },
    { id: 'mentality', label: 'Mentality', desc: 'Big-game temperament and pressure handling', default: 50 },
    { id: 'injury', label: 'Injury Risk', desc: 'Injury history and physical resilience (higher = less risk)', default: 50 },
    { id: 'leadership', label: 'Leadership', desc: 'Dressing room influence and on-pitch communication', default: 50 },
    { id: 'marketability', label: 'Marketability', desc: 'Commercial value and fan appeal', default: 50 },
    { id: 'versatility', label: 'Versatility', desc: 'Ability to play multiple positions effectively', default: 50 },
    { id: 'progression', label: 'Progression Curve', desc: 'Expected improvement trajectory', default: 50 }
  ];

  var sliderContainer = document.getElementById('scout-sliders');
  var sliderHTML = '<div class="slider-grid">';
  scoutDimensions.forEach(function(d) {
    sliderHTML += '<div class="slider-card">' +
      '<label>' + d.label + '<span class="slider-val" id="val-' + d.id + '">' + d.default + '</span></label>' +
      '<input type="range" min="0" max="100" value="' + d.default + '" id="slider-' + d.id + '">' +
      '<div class="slider-desc">' + d.desc + '</div>' +
      '</div>';
  });
  sliderHTML += '</div>';
  sliderContainer.innerHTML = sliderHTML;

  // Wire sliders
  scoutDimensions.forEach(function(d) {
    var slider = document.getElementById('slider-' + d.id);
    var valSpan = document.getElementById('val-' + d.id);
    slider.addEventListener('input', function() {
      valSpan.textContent = slider.value;
      updateScoutResult();
    });
  });

  var scoutPlayerRef = setupDropdown('scout-player-search', 'scout-player-list', playerItems, function() { updateScoutResult(); });
  var scoutTeamRef = setupDropdown('scout-team-search', 'scout-team-list', clubItems, function() { updateScoutResult(); });

  function updateScoutResult() {
    var pName = scoutPlayerRef.getSelected();
    var tName = scoutTeamRef.getSelected();
    if (!pName || !tName) return;
    var player = PLAYERS.find(function(p) { return p.name === pName; });
    var team = TEAMS.find(function(t) { return t.name === tName; });
    if (!player || !team) return;

    // Base valuation
    var base = computeValuation(player, team);

    // Custom dimension modifier
    var dimSum = 0;
    scoutDimensions.forEach(function(d) {
      var v = parseInt(document.getElementById('slider-' + d.id).value);
      dimSum += (v - 50) / 100; // -0.5 to +0.5 per dimension
    });
    var dimModifier = dimSum / scoutDimensions.length; // average modifier
    var adjustedMultiplier = Math.round(base.multiplier * Math.exp(dimModifier * 0.5) * 100) / 100;
    var adjustedValue = Math.round(player.marketValue * adjustedMultiplier * 10) / 10;

    var mc = multClass(adjustedMultiplier);
    var container = document.getElementById('scout-result');
    container.innerHTML = '<div class="scout-valuation">' +
      '<div class="big-multi ' + mc + '">' + adjustedMultiplier.toFixed(2) + 'x</div>' +
      '<div style="color:var(--text-dim);font-size:0.85rem;margin-bottom:0.5rem">' + player.name + ' &rarr; ' + team.name + '</div>' +
      '<div class="scout-val-row">' +
      '<div class="scout-val-item"><div class="s-label">Market Value</div><div class="s-value">&euro;' + player.marketValue + 'M</div></div>' +
      '<div class="scout-val-item"><div class="s-label">Base Context</div><div class="s-value">&euro;' + base.contextValue + 'M</div></div>' +
      '<div class="scout-val-item"><div class="s-label">Scout-Adjusted</div><div class="s-value" style="color:var(--green)">&euro;' + adjustedValue + 'M</div></div>' +
      '<div class="scout-val-item"><div class="s-label">Base Multiplier</div><div class="s-value">' + base.multiplier.toFixed(2) + 'x</div></div>' +
      '<div class="scout-val-item"><div class="s-label">Dim Modifier</div><div class="s-value">' + (dimModifier >= 0 ? '+' : '') + dimModifier.toFixed(3) + '</div></div>' +
      '</div>' +
      factorBarsHTML(base.factors) +
      '</div>';
  }

})();
`;
}

main().catch(e => { console.error(e); process.exit(1); });
