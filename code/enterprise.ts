/**
 * PitchIntel Enterprise Demo Generator
 *
 * Generates a single self-contained HTML file (pitchintel-enterprise.html)
 * simulating a club's scouting department workflow:
 *
 *   Discovery  — the engine surfaces candidates from public (Tier 1) data
 *   Assignments — the DoF assigns scouts to shortlisted targets
 *   Scout Reports — scouts file Tier 3 assessments (the real 24 dimensions)
 *   DoF Dashboard — ranked shortlist with value + confidence movement
 *
 * The browser runs the REAL tiered valuation engine: sections 2-4 of
 * player-vector.ts are transpiled to plain JS at build time and embedded.
 * A parity check at build time guarantees the embedded engine produces
 * byte-identical valuations to the TypeScript original.
 *
 * Usage: npx tsx code/enterprise.ts
 * Output: code/pitchintel-enterprise.html
 */

import { getPlayerDatabase } from './data/players-db.js';
import { getTeamDatabase } from './data/teams-db.js';
import { computeEnhancedValuation, scoutProfileToVector } from './player-vector.js';
import { NB_CONTEXT, buildSquad, NB_SQUAD_META, NB_SQUAD_ORDER, NB_SEED, NB_FEED, NB_DECISIONS } from './northbridge.js';
import { getWCFiles } from './data/wc-files.js';
import ts from 'typescript';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 1. Extract + transpile the real engine ──────────────────────────

function buildEngineJS(): string {
  const src = readFileSync(join(__dirname, 'player-vector.ts'), 'utf-8');
  const start = src.indexOf('// ─── 2. Dimension Completeness Counter');
  const end = src.indexOf('// ─── 5. Runner');
  if (start === -1 || end === -1) {
    throw new Error('player-vector.ts section markers changed — update enterprise.ts');
  }
  const slice = src.slice(start, end).replace(/^export /gm, '');
  const out = ts.transpileModule(slice, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2018,
      module: ts.ModuleKind.None,
      removeComments: false,
    },
  });
  if (out.outputText.includes('require(') || out.outputText.includes('import ')) {
    throw new Error('engine slice still has module syntax — update enterprise.ts');
  }
  return out.outputText;
}

/** Run the transpiled engine in Node and compare against the TS original. */
function verifyEngineParity(engineJS: string): void {
  const factory = new Function(
    engineJS +
    '\nreturn { computeEnhancedValuation, scoutProfileToVector, vectorCompleteness };'
  );
  const embedded = factory();

  const players = getPlayerDatabase();
  const teams = getTeamDatabase();
  for (const p of [players[0], players[10], players[40]]) {
    for (const t of [teams[0], teams[7], teams[20]]) {
      const vec = scoutProfileToVector(p);
      const expected = JSON.stringify(computeEnhancedValuation(vec, t));
      const actual = JSON.stringify(
        embedded.computeEnhancedValuation(embedded.scoutProfileToVector(p), t)
      );
      if (expected !== actual) {
        throw new Error(`engine parity FAILED for ${p.name} → ${t.name}`);
      }
    }
  }
  console.log('Engine parity check: embedded JS === TypeScript original ✓');
}

// ─── 2. Serialize databases ──────────────────────────────────────────

function serializeTeams(teams: ReturnType<typeof getTeamDatabase>): string {
  return JSON.stringify(
    teams.map(t => ({ ...t, positionDepth: Array.from(t.positionDepth.entries()) }))
  );
}

// ─── 3. Main ─────────────────────────────────────────────────────────

async function main() {
  const players = getPlayerDatabase();
  const teams = getTeamDatabase();
  console.log(`Loaded ${players.length} players, ${teams.length} teams`);

  const engineJS = buildEngineJS();
  verifyEngineParity(engineJS);

  const squad = buildSquad();
  const nbPayload = JSON.stringify({
    context: { ...NB_CONTEXT, positionDepth: Array.from(NB_CONTEXT.positionDepth.entries()) },
    squad,
    meta: NB_SQUAD_META,
    order: NB_SQUAD_ORDER,
    seed: NB_SEED,
    feed: NB_FEED,
    decisions: NB_DECISIONS,
  });

  // Print the engine's actual take on the narrative players so authored
  // notes (Herrera hold price, Benali resale, Diallo multiple) stay honest.
  for (const name of ['Santi Herrera', 'Youssef Benali', 'Adama Diallo', 'Tomas Vrana', 'Marcus Whitfield']) {
    const vec = squad.find(s => s.name === name)!;
    // Mirror the UI's internal-valuation semantics: replacement value
    // against the squad with this player's own depth slot vacated.
    const ctx: TeamContext = {
      ...NB_CONTEXT,
      name: NB_CONTEXT.name + ' (squad model)',
      positionDepth: new Map(NB_CONTEXT.positionDepth),
    };
    ctx.positionDepth.set(vec.position, Math.max(0, (ctx.positionDepth.get(vec.position) || 1) - 1));
    const val = computeEnhancedValuation(vec, ctx);
    console.log(`  ${name}: market €${vec.marketValue}M → internal €${val.contextValue}M (${val.multiplier}x, conf ${Math.round(val.confidence * 100)}%)`);
  }

  const html = generateHTML(JSON.stringify(players), serializeTeams(teams), nbPayload, engineJS);
  const outPath = join(__dirname, 'pitchintel-enterprise.html');
  writeFileSync(outPath, html, 'utf-8');
  console.log(`Written to ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
}

// ─── 4. HTML generation ──────────────────────────────────────────────

function generateHTML(playersJSON: string, teamsJSON: string, nbJSON: string, engineJS: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PitchIntel Enterprise — Scouting Department Demo</title>
<style>
${getCSS()}
</style>
</head>
<body>
<div id="app">

  <div id="demo-banner">
    <span>&#127942; <strong>Enterprise demo</strong> &mdash; a simulated club workspace on sample data. Your state is saved locally.</span>
    <span><a href="mailto:kunal@generativeducation.com?subject=PitchIntel%20Enterprise%20walkthrough">Book a walkthrough</a> &middot; <button id="reset-demo">Reset demo</button></span>
  </div>

  <div id="shell">
    <aside id="sidebar">
      <div class="logo"><span class="logo-pitch">Pitch</span><span class="logo-intel">Intel</span></div>
      <div class="ent-chip">ENTERPRISE</div>
      <div id="club-badge">
        <div class="cb-label">Club workspace</div>
        <div class="cb-name" id="club-name">&mdash;</div>
        <div class="cb-budget" id="club-budget"></div>
        <button id="switch-club">switch</button>
      </div>
      <nav>
        <button class="nav-item nb-only active" data-view="today">&#9728;&#65039; Today</button>
        <button class="nav-item" data-view="dashboard">&#9632; DoF Dashboard</button>
        <button class="nav-item" data-view="discovery">&#9678; Discovery</button>
        <button class="nav-item" data-view="assignments">&#9998; Scouting Desk</button>
        <button class="nav-item nb-only" data-view="squad">&#128101; Squad</button>
      </nav>
      <div id="scout-roster">
        <div class="sr-title">Scouting department</div>
        <div id="roster-list"></div>
      </div>
    </aside>

    <main id="main">
      <section id="view-today" class="view active"></section>
      <section id="view-dashboard" class="view"></section>
      <section id="view-discovery" class="view"></section>
      <section id="view-assignments" class="view"></section>
      <section id="view-report" class="view"></section>
      <section id="view-squad" class="view"></section>
    </main>
  </div>

  <div id="club-modal" class="modal">
    <div class="modal-box">
      <h3>Set up your club workspace</h3>
      <p>Pick the club you're running. The engine reads your squad context &mdash; formation, style, position depth, structural gaps &mdash; and drives discovery from it.</p>
      <select id="club-select"></select>
      <button class="btn-primary" id="club-confirm">Open workspace</button>
    </div>
  </div>

</div>
<script>
var PLAYERS_RAW = ${playersJSON};
var TEAMS_RAW = ${teamsJSON};
var WC_RAW = ${JSON.stringify(getWCFiles().map(f => f.profile))};
var NB = ${nbJSON};

${engineJS}

${getUIScript()}
</script>
</body>
</html>`;
}

// ─── 5. CSS ──────────────────────────────────────────────────────────

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
  --font:'Inter',system-ui,-apple-system,sans-serif;
}
html{font-size:14px}
body{background:var(--bg);color:var(--text);font-family:var(--font);line-height:1.5;min-height:100vh}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
button{font-family:var(--font)}

#demo-banner{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:0.5rem 1.25rem;font-size:0.82rem;background:linear-gradient(90deg,var(--gold-dim),rgba(0,180,255,0.08));border-bottom:1px solid var(--border)}
#demo-banner button{background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:0.82rem;text-decoration:underline}

#shell{display:flex;min-height:calc(100vh - 34px)}
#sidebar{width:230px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--border);padding:1.25rem 1rem;display:flex;flex-direction:column;gap:1.25rem}
.logo{font-size:1.3rem;font-weight:800;letter-spacing:-0.5px}
.logo-pitch{color:var(--text-bright)}.logo-intel{color:var(--accent)}
.ent-chip{display:inline-block;align-self:flex-start;padding:0.15rem 0.6rem;border-radius:999px;background:var(--gold-dim);color:var(--gold);font-size:0.65rem;font-weight:800;letter-spacing:1.5px;margin-top:-0.75rem}
#club-badge{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:0.75rem 0.9rem}
.cb-label{font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim)}
.cb-name{font-weight:800;color:var(--text-bright);font-size:1.05rem;margin:0.15rem 0}
.cb-budget{font-size:0.72rem;color:var(--gold);font-weight:600;margin-bottom:0.2rem}
#switch-club{background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.78rem;padding:0}
nav{display:flex;flex-direction:column;gap:0.25rem}
.nav-item{text-align:left;background:none;border:none;color:var(--text-dim);font-size:0.92rem;font-weight:600;padding:0.55rem 0.75rem;border-radius:8px;cursor:pointer;transition:all 0.15s}
.nav-item:hover{color:var(--text);background:rgba(255,255,255,0.04)}
.nav-item.active{color:var(--gold);background:var(--gold-dim)}
#scout-roster{margin-top:auto}
.sr-title{font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:0.5rem}
.scout-row{display:flex;gap:0.6rem;align-items:center;padding:0.35rem 0;font-size:0.82rem}
.scout-avatar{width:26px;height:26px;border-radius:50%;background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.72rem;flex-shrink:0}
.scout-meta .s-name{color:var(--text);font-weight:600}
.scout-meta .s-region{color:var(--text-dim);font-size:0.72rem}

#main{flex:1;padding:1.75rem 2rem 4rem;max-width:1100px;min-width:0}
.view{display:none}
.view.active{display:block}
.view-header{margin-bottom:1.25rem}
.view-header h2{font-size:1.5rem;font-weight:800;color:var(--text-bright)}
.view-header .subtitle{color:var(--text-dim);font-size:0.92rem}

.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.8rem;margin-bottom:1.5rem}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:0.9rem 1rem}
.kpi .k-label{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-dim)}
.kpi .k-value{font-size:1.5rem;font-weight:800;color:var(--text-bright)}
.kpi .k-value.gold{color:var(--gold)}
.kpi .k-value.green{color:var(--green)}
.kpi .k-sub{font-size:0.72rem;color:var(--text-dim)}

.target-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.25rem;margin-bottom:0.9rem}
.target-card.expanded{border-color:var(--border-light)}
.tc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;cursor:pointer}
.tc-who .t-name{font-weight:800;color:var(--text-bright);font-size:1.05rem}
.tc-who .t-meta{font-size:0.8rem;color:var(--text-dim)}
.tc-nums{display:flex;gap:1.4rem;flex-wrap:wrap;align-items:center}
.tc-num .n-label{font-size:0.66rem;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-dim)}
.tc-num .n-value{font-weight:800;font-size:1.05rem;color:var(--text-bright)}
.tc-num .n-value.green{color:var(--green)}
.tc-num .n-value.red{color:var(--red)}
.tc-num .n-value.gold{color:var(--gold)}
.tc-num .n-delta{font-size:0.7rem;font-weight:700}
.n-delta.up{color:var(--green)}.n-delta.down{color:var(--red)}
.verdict-chip{padding:0.2rem 0.7rem;border-radius:999px;font-size:0.72rem;font-weight:800;letter-spacing:0.5px;text-transform:uppercase}
.verdict-chip.bargain{background:var(--green-dim);color:var(--green)}
.verdict-chip.fair{background:var(--accent-dim);color:var(--accent)}
.verdict-chip.overpay{background:var(--gold-dim);color:var(--gold)}
.verdict-chip.avoid{background:var(--red-dim);color:var(--red)}
.conf-wrap{min-width:110px}
.conf-bar{height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;margin-top:3px}
.conf-bar i{display:block;height:100%;background:var(--accent);border-radius:3px}
.conf-bar i.high{background:var(--green)}
.status-chip{font-size:0.72rem;font-weight:700;padding:0.2rem 0.65rem;border-radius:999px}
.status-chip.awaiting{background:var(--gold-dim);color:var(--gold)}
.status-chip.reported{background:var(--green-dim);color:var(--green)}
.tc-body{border-top:1px solid var(--border);margin-top:0.9rem;padding-top:0.9rem;display:none}
.target-card.expanded .tc-body{display:block}
.board-note{background:var(--bg2);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:0.7rem 0.9rem;font-size:0.88rem;margin-bottom:0.9rem}
.board-note .bn-label{font-size:0.66rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--gold);font-weight:800;margin-bottom:0.2rem}
.factor-row{display:flex;align-items:center;gap:0.7rem;padding:0.22rem 0;font-size:0.82rem}
.factor-row .f-name{width:170px;flex-shrink:0;color:var(--text)}
.factor-row .f-tier{width:26px;flex-shrink:0;text-align:center;font-size:0.64rem;font-weight:800;border-radius:4px;padding:0.05rem 0}
.f-tier.t1{background:var(--accent-dim);color:var(--accent)}
.f-tier.t2{background:rgba(160,120,255,0.15);color:#a078ff}
.f-tier.t3{background:var(--gold-dim);color:var(--gold)}
.factor-row .f-bar{flex:1;height:6px;background:var(--bg2);border-radius:3px;position:relative;overflow:hidden}
.factor-row .f-bar i{position:absolute;top:0;bottom:0;border-radius:3px}
.factor-row .f-score{width:46px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.f-score.pos{color:var(--green)}.f-score.neg{color:var(--red)}
.scout-note-row{display:flex;gap:0.6rem;padding:0.5rem 0;font-size:0.85rem;border-top:1px dashed var(--border)}
.scout-note-row .snr-body{flex:1}
.snr-head{font-weight:700;color:var(--text);font-size:0.8rem}
.snr-head span{color:var(--text-dim);font-weight:400}
.snr-note{color:var(--text-dim);font-style:italic}
.tc-actions{display:flex;gap:0.6rem;margin-top:0.9rem;flex-wrap:wrap}

.btn-primary{background:var(--gold);color:#06080c;border:none;padding:0.55rem 1.3rem;border-radius:8px;font-weight:800;font-size:0.88rem;cursor:pointer}
.btn-primary:hover{opacity:0.9}
.btn-secondary{background:var(--card-hover);color:var(--text);border:1px solid var(--border-light);padding:0.55rem 1.3rem;border-radius:8px;font-weight:600;font-size:0.88rem;cursor:pointer}
.btn-secondary:hover{border-color:var(--accent);color:var(--accent)}
.btn-danger{background:none;border:none;color:var(--text-dim);font-size:0.8rem;cursor:pointer;text-decoration:underline}

.filter-row{display:flex;gap:0.6rem;flex-wrap:wrap;margin-bottom:1.1rem;align-items:center}
.filter-row select,.filter-row input{background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text-bright);font-family:var(--font);font-size:0.85rem;padding:0.45rem 0.7rem;outline:none}
.filter-row select:focus,.filter-row input:focus{border-color:var(--accent)}
.filter-row label{font-size:0.8rem;color:var(--text-dim)}
.need-chip{padding:0.25rem 0.7rem;border-radius:999px;font-size:0.76rem;font-weight:700;background:var(--red-dim);color:var(--red);border:none;cursor:pointer}
.need-chip.mild{background:var(--gold-dim);color:var(--gold)}

.disc-table{width:100%;border-collapse:collapse;font-size:0.86rem}
.disc-table th{text-align:left;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-dim);padding:0.5rem 0.6rem;border-bottom:1px solid var(--border)}
.disc-table td{padding:0.55rem 0.6rem;border-bottom:1px solid var(--border);vertical-align:middle}
.disc-table tr:hover td{background:rgba(255,255,255,0.02)}
.disc-table .d-name{font-weight:700;color:var(--text-bright)}
.disc-table .d-meta{font-size:0.74rem;color:var(--text-dim)}
.mult{font-weight:800}
.mult.g{color:var(--green)}.mult.n{color:var(--text-bright)}.mult.r{color:var(--red)}
.add-btn{background:var(--accent-dim);color:var(--accent);border:none;border-radius:6px;padding:0.3rem 0.8rem;font-weight:700;font-size:0.78rem;cursor:pointer;white-space:nowrap}
.add-btn:hover{background:var(--accent);color:#fff}
.add-btn[disabled]{opacity:0.4;cursor:default}
.add-btn[disabled]:hover{background:var(--accent-dim);color:var(--accent)}

.report-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(280px,1fr);gap:1.25rem;align-items:start}
@media(max-width:960px){.report-grid{grid-template-columns:1fr}}
.slider-group{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:0.9rem}
.slider-group h4{font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin-bottom:0.7rem}
.sl-row{display:grid;grid-template-columns:190px 1fr 30px;gap:0.7rem;align-items:center;padding:0.3rem 0}
.sl-row label{font-size:0.84rem;color:var(--text)}
.sl-row label .inv{color:var(--red);font-size:0.68rem;font-weight:700}
.sl-row input[type=range]{width:100%;accent-color:#ffb800;cursor:pointer}
.sl-row .sl-val{text-align:right;font-weight:800;color:var(--text-bright);font-variant-numeric:tabular-nums}
#report-note{width:100%;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text-bright);font-family:var(--font);font-size:0.88rem;padding:0.7rem 0.9rem;min-height:70px;outline:none;resize:vertical}
#report-note:focus{border-color:var(--accent)}
.live-panel{background:var(--card);border:1px solid var(--gold);border-radius:12px;padding:1.2rem;position:sticky;top:1rem}
.live-panel h4{font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin-bottom:0.9rem}
.lp-row{display:flex;justify-content:space-between;align-items:baseline;padding:0.4rem 0;border-bottom:1px dashed var(--border);font-size:0.88rem}
.lp-row .lp-label{color:var(--text-dim)}
.lp-row .lp-vals{font-weight:700;color:var(--text-bright)}
.lp-vals .arrow{color:var(--text-dim);font-weight:400;padding:0 0.3rem}
.lp-vals .after{font-size:1.05rem}
.lp-vals .after.up{color:var(--green)}.lp-vals .after.down{color:var(--red)}
.lp-verdicts{display:flex;align-items:center;gap:0.5rem;justify-content:flex-end}
.report-meta-row{display:flex;gap:0.8rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap}
.report-meta-row select{background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text-bright);font-family:var(--font);font-size:0.85rem;padding:0.45rem 0.7rem}

.empty-state{text-align:center;padding:3rem 1rem;color:var(--text-dim)}
.empty-state .es-icon{font-size:2rem;margin-bottom:0.5rem}
.empty-state a,.empty-state button.linkish{color:var(--accent);background:none;border:none;font-size:inherit;cursor:pointer;text-decoration:underline}

.today-date{font-size:0.85rem;color:var(--text-dim);margin-bottom:1.25rem}
.today-date strong{color:var(--gold)}
.feed-card{display:flex;gap:0.9rem;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:0.7rem;align-items:flex-start}
.feed-card .fc-icon{font-size:1.2rem;flex-shrink:0;margin-top:0.1rem}
.feed-card .fc-time{font-size:0.68rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.6px;white-space:nowrap;margin-top:0.25rem;width:64px;flex-shrink:0;text-align:right}
.feed-card .fc-body{flex:1;min-width:0}
.feed-card .fc-title{font-weight:700;color:var(--text-bright);font-size:0.95rem}
.feed-card .fc-text{font-size:0.85rem;color:var(--text-dim);margin-top:0.15rem}
.feed-card .fc-action{margin-top:0.5rem}
.fc-action button{background:var(--accent-dim);color:var(--accent);border:none;border-radius:6px;padding:0.3rem 0.8rem;font-weight:700;font-size:0.78rem;cursor:pointer}
.fc-action button:hover{background:var(--accent);color:#fff}
.decision-log{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.3rem;margin-top:1.5rem}
.decision-log h4{font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-bottom:0.7rem}
.dl-row{display:flex;gap:0.9rem;padding:0.4rem 0;font-size:0.85rem;border-top:1px dashed var(--border)}
.dl-row .dl-date{color:var(--gold);font-weight:700;white-space:nowrap;width:70px;flex-shrink:0}
.dl-row .dl-text{color:var(--text)}
.unit-title{font-size:0.75rem;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-dim);margin:1.4rem 0 0.6rem;font-weight:800}
.squad-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:0.9rem 1.2rem;margin-bottom:0.6rem}
.squad-card .tc-top{align-items:center}
.flag-chip{font-size:0.66rem;font-weight:700;padding:0.14rem 0.5rem;border-radius:999px;background:rgba(255,255,255,0.06);color:var(--text-dim);letter-spacing:0.4px;text-transform:uppercase}
.wc-chip-mini{font-size:0.62rem;font-weight:800;padding:0.08rem 0.5rem;border-radius:999px;background:var(--gold-dim);color:var(--gold);letter-spacing:0.4px;vertical-align:middle;white-space:nowrap}
.flag-chip.hot{background:var(--red-dim);color:var(--red)}
.rec-chip{font-size:0.7rem;font-weight:800;padding:0.22rem 0.7rem;border-radius:6px;letter-spacing:0.5px;white-space:nowrap}
.rec-chip.green{background:var(--green-dim);color:var(--green)}
.rec-chip.gold{background:var(--gold-dim);color:var(--gold)}
.rec-chip.red{background:var(--red-dim);color:var(--red)}
.rec-chip.blue{background:var(--accent-dim);color:var(--accent)}
.dna-note{background:var(--bg2);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;padding:0.6rem 0.9rem;font-size:0.85rem;color:var(--text);margin-bottom:0.8rem}
.modal{display:none;position:fixed;inset:0;z-index:1000;background:rgba(6,8,12,0.85);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:1rem}
.modal.open{display:flex}
.modal-box{background:var(--card);border:1px solid var(--border-light);border-radius:14px;max-width:440px;width:100%;padding:2rem;box-shadow:0 16px 64px rgba(0,0,0,0.6)}
.modal-box h3{color:var(--text-bright);margin-bottom:0.5rem}
.modal-box p{color:var(--text-dim);font-size:0.9rem;margin-bottom:1.2rem}
.modal-box select{width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:8px;color:var(--text-bright);font-family:var(--font);font-size:0.95rem;padding:0.65rem 0.9rem;margin-bottom:1rem}
@media(max-width:820px){#shell{flex-direction:column}#sidebar{width:100%;flex-direction:row;flex-wrap:wrap;align-items:center}#scout-roster{margin-top:0;display:none}#main{padding:1.25rem 1rem 3rem}}
`;
}

// ─── 6. UI Script (embedded, plain JS, no backticks/template syntax) ─

function getUIScript(): string {
  const src = readFileSync(join(__dirname, 'enterprise-ui.js'), 'utf-8');
  if (src.includes('`') || src.includes('${')) {
    throw new Error('enterprise-ui.js must not contain backticks or ${ (breaks embedding)');
  }
  return src;
}

main();
