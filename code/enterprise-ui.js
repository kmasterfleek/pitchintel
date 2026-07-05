/* PitchIntel Enterprise demo UI.
 * Embedded verbatim into pitchintel-enterprise.html by enterprise.ts.
 * Constraint: no backticks and no dollar-brace sequences (template embedding).
 * PLAYERS_RAW, TEAMS_RAW and the engine (computeEnhancedValuation,
 * scoutProfileToVector, vectorCompleteness) are defined before this script.
 */

// ─── Data setup ───────────────────────────────────────────────

var TEAMS = TEAMS_RAW.map(function (t) {
  var copy = Object.assign({}, t);
  copy.positionDepth = new Map(t.positionDepth);
  return copy;
});
var PLAYERS = PLAYERS_RAW;

var SCOUTS = [
  { id: 'mv', name: 'Marta Vidal', region: 'South America & La Liga' },
  { id: 'so', name: 'Sam Okafor', region: 'West Africa & Ligue 1' },
  { id: 'll', name: 'Lars Lindqvist', region: 'Scandinavia & Bundesliga' },
  { id: 'jb', name: 'Jimmy Barnes', region: 'UK & EFL' }
];

var T3_COMMON_GROUPS = [
  { title: 'Tactical IQ', fields: [
    { id: 'positionalAwareness', label: 'Positional awareness' },
    { id: 'decisionMakingSpeed', label: 'Decision-making speed' },
    { id: 'pressReadingAbility', label: 'Press reading' },
    { id: 'transitionReading', label: 'Transition reading' },
    { id: 'setPlayIntelligence', label: 'Set-play intelligence' },
    { id: 'coachability', label: 'Coachability' }
  ]},
  { title: 'Personality & Character', fields: [
    { id: 'mentality', label: 'Mentality' },
    { id: 'leadershipPresence', label: 'Leadership presence' },
    { id: 'cultureFit', label: 'Culture fit' },
    { id: 'mediaHandling', label: 'Media handling' },
    { id: 'adaptability', label: 'Adaptability' },
    { id: 'injuryProneness', label: 'Injury proneness', inverse: true }
  ]}
];
var T3_ROLE_FORWARD = { title: 'Role: Attacking', fields: [
  { id: 'holdUpPlayQuality', label: 'Hold-up play' },
  { id: 'aerialPresence', label: 'Aerial presence' },
  { id: 'runTiming', label: 'Run timing' },
  { id: 'movementInBox', label: 'Movement in box' }
]};
var T3_ROLE_DEFENDER = { title: 'Role: Defending', fields: [
  { id: 'oneOnOneDefending', label: '1v1 defending' },
  { id: 'organizationalVoice', label: 'Organizational voice' },
  { id: 'recoverySpeed', label: 'Recovery speed' },
  { id: 'composureUnderPress', label: 'Composure under press' }
]};
var T3_ROLE_MID = { title: 'Role: Midfield', fields: [
  { id: 'composureUnderPress', label: 'Composure under press' },
  { id: 'recoverySpeed', label: 'Recovery speed' },
  { id: 'runTiming', label: 'Run timing' }
]};
var T3_INTANGIBLES = { title: 'Intangibles', fields: [
  { id: 'clutchFactor', label: 'Clutch factor' },
  { id: 'dressingRoomEffect', label: 'Dressing-room effect' },
  { id: 'fanAppeal', label: 'Fan appeal' },
  { id: 'agentDifficulty', label: 'Agent difficulty', inverse: true }
]};

function t3GroupsFor(position) {
  var role;
  if (['ST', 'LW', 'RW', 'CAM'].indexOf(position) >= 0) role = T3_ROLE_FORWARD;
  else if (['CB', 'LB', 'RB', 'CDM'].indexOf(position) >= 0) role = T3_ROLE_DEFENDER;
  else role = T3_ROLE_MID;
  return T3_COMMON_GROUPS.concat([role, T3_INTANGIBLES]);
}

// ─── State ────────────────────────────────────────────────────

var STORE_KEY = 'pitchintel-enterprise-v1';
var state = { club: null, shortlist: [] };

function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function loadState() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) { state = JSON.parse(raw); return true; }
  } catch (e) { /* corrupted state — reseed */ }
  return false;
}

function teamByName(n) { return TEAMS.find(function (t) { return t.name === n; }); }
function playerByName(n) { return PLAYERS.find(function (p) { return p.name === n; }); }
function scoutById(id) { return SCOUTS.find(function (s) { return s.id === id; }); }
function entryFor(playerName) {
  return state.shortlist.find(function (e) { return e.player === playerName; });
}

// ─── Valuation helpers ────────────────────────────────────────

function mergedVector(player, entry) {
  var vec = Object.assign({}, scoutProfileToVector(player));
  if (!entry || !entry.reports || entry.reports.length === 0) return vec;
  var sums = {}, counts = {};
  entry.reports.forEach(function (r) {
    Object.keys(r.values).forEach(function (k) {
      sums[k] = (sums[k] || 0) + r.values[k];
      counts[k] = (counts[k] || 0) + 1;
    });
  });
  Object.keys(sums).forEach(function (k) {
    vec[k] = Math.round((sums[k] / counts[k]) * 10) / 10;
  });
  return vec;
}

function baseValuation(player, team) {
  return computeEnhancedValuation(scoutProfileToVector(player), team);
}
function adjustedValuation(player, team, entry) {
  return computeEnhancedValuation(mergedVector(player, entry), team);
}

function multClass(m) { return m >= 1.15 ? 'g' : m < 0.85 ? 'r' : 'n'; }
function fmtM(v) { return '€' + v + 'M'; }
function pct(v) { return Math.round(v * 100) + '%'; }
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Deterministic per-player pseudo-random for seeded demo reports
function hashRand(seedStr) {
  var h = 2166136261;
  for (var i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ─── Seeding ──────────────────────────────────────────────────

var SEED_NOTES_GEM = 'Watched him three times live. The data undersells the off-ball intelligence: presses in coordinated waves, always scanning before receiving. Signable, hungry, no baggage. I would push hard this window.';
var SEED_NOTES_MIXED = 'Talented but streaky. Dominant against mid-table sides, quieter in the big matches. Agent situation needs careful handling. Worth one more window of tracking before we commit.';

function seededReport(player, scoutId, flavor) {
  var rand = hashRand(player.name + flavor);
  var values = {};
  t3GroupsFor(player.position).forEach(function (g) {
    g.fields.forEach(function (f) {
      var v;
      if (flavor === 'gem') {
        v = f.inverse ? 2 + Math.floor(rand() * 2) : 7 + Math.floor(rand() * 3);
      } else {
        v = f.inverse ? 3 + Math.floor(rand() * 4) : 4 + Math.floor(rand() * 5);
      }
      values[f.id] = v;
    });
  });
  return {
    scout: scoutId,
    date: 'last week',
    values: values,
    note: flavor === 'gem' ? SEED_NOTES_GEM : SEED_NOTES_MIXED
  };
}

function discoveryCandidates(team) {
  return PLAYERS
    .filter(function (p) { return p.club !== team.name; })
    .map(function (p) { return { player: p, val: baseValuation(p, team) }; })
    .sort(function (a, b) { return b.val.multiplier - a.val.multiplier; });
}

function needPositions(team) {
  var needs = [];
  team.positionDepth.forEach(function (depth, pos) {
    if (pos !== 'GK' && depth <= 1) needs.push({ pos: pos, depth: depth });
  });
  return needs.sort(function (a, b) { return a.depth - b.depth; });
}

// Squad-depth labels don't always match player-DB labels (a squad thin at LM
// is covered by an LW in the modern DB) — expand needs to equivalent roles.
var POS_EQUIV = { LM: ['LM', 'LW'], RM: ['RM', 'RW'], LW: ['LW', 'LM'], RW: ['RW', 'RM'] };
function expandPositions(positions) {
  var out = [];
  positions.forEach(function (pos) {
    (POS_EQUIV[pos] || [pos]).forEach(function (p) {
      if (out.indexOf(p) < 0) out.push(p);
    });
  });
  return out;
}

function seedWorkspace(clubName) {
  state = { club: clubName, shortlist: [] };
  var team = teamByName(clubName);
  var candidates = discoveryCandidates(team);
  var needs = expandPositions(needPositions(team).map(function (n) { return n.pos; }));

  // Prefer realistic targets: fills a squad gap, young, within the window budget
  var affordable = candidates.filter(function (c) { return c.player.marketValue <= team.budget; });
  var atNeed = affordable.filter(function (c) {
    return needs.indexOf(c.player.position) >= 0 && c.player.age <= 27;
  });
  var pool = atNeed.concat(affordable).concat(candidates);
  var picked = [];
  for (var i = 0; i < pool.length && picked.length < 4; i++) {
    if (!picked.some(function (p) { return p.player.name === pool[i].player.name; })) {
      picked.push(pool[i]);
    }
  }

  picked.forEach(function (c, idx) {
    var entry = { player: c.player.name, scout: SCOUTS[idx % SCOUTS.length].id, status: 'awaiting', reports: [] };
    if (idx === 0) {
      entry.reports.push(seededReport(c.player, entry.scout, 'gem'));
      entry.status = 'reported';
    } else if (idx === 1) {
      entry.reports.push(seededReport(c.player, entry.scout, 'mixed'));
      entry.status = 'reported';
    }
    state.shortlist.push(entry);
  });
  saveState();
}

// ─── Rendering: shared pieces ─────────────────────────────────

function factorRowsHTML(factors) {
  var html = '';
  factors.forEach(function (f) {
    var w = Math.min(50, Math.abs(f.score) * 50);
    var left = f.score >= 0 ? 50 : 50 - w;
    var color = f.score >= 0 ? 'var(--green)' : 'var(--red)';
    html += '<div class="factor-row">' +
      '<span class="f-tier t' + f.tier + '">T' + f.tier + '</span>' +
      '<span class="f-name">' + escapeHtml(f.name) + '</span>' +
      '<span class="f-bar"><i style="left:' + left + '%;width:' + w + '%;background:' + color + '"></i></span>' +
      '<span class="f-score ' + (f.score >= 0 ? 'pos' : 'neg') + '">' +
      (f.score >= 0 ? '+' : '') + f.score.toFixed(2) + '</span>' +
      '</div>';
  });
  return html;
}

function boardNote(player, team, base, adj, entry) {
  var reported = entry.reports.length > 0;
  var deltaPct = Math.round((adj.contextValue / player.marketValue - 1) * 100);
  var confPts = Math.round((adj.confidence - base.confidence) * 100);
  var line;
  if (!reported) {
    line = 'Public-data read only (confidence ' + pct(adj.confidence) + '). Engine sees ' +
      (adj.multiplier >= 1.1 ? 'clear upside' : adj.multiplier >= 0.9 ? 'a fair-value profile' : 'weak fit') +
      ' at ' + escapeHtml(team.name) + ' — awaiting scouting before a recommendation.';
  } else if (adj.verdict === 'bargain') {
    line = 'RECOMMEND. Scouted value ' + fmtM(adj.contextValue) + ' vs market ' + fmtM(player.marketValue) +
      ' (' + (deltaPct >= 0 ? '+' : '') + deltaPct + '%). Scouting lifted confidence by ' + confPts +
      ' pts to ' + pct(adj.confidence) + '. ' + escapeHtml(adj.topPositive.split(':')[0]) + ' is the headline driver.';
  } else if (adj.verdict === 'fair') {
    line = 'PROCEED WITH DISCIPLINE. Fair value at ' + fmtM(adj.contextValue) + ' — do not chase above market. Confidence ' +
      pct(adj.confidence) + ' after scouting. Watch: ' + escapeHtml(adj.topNegative.split(':')[0]) + '.';
  } else {
    line = 'STEP BACK. Scouted value ' + fmtM(adj.contextValue) + ' vs market ' + fmtM(player.marketValue) +
      '. The fit is not there — ' + escapeHtml(adj.topNegative.split(':')[0]).toLowerCase() +
      ' drags the profile. Redirect scouting hours.';
  }
  return line;
}

function confBarHTML(conf) {
  return '<div class="conf-wrap"><span style="font-size:0.7rem;color:var(--text-dim)">Confidence ' + pct(conf) + '</span>' +
    '<div class="conf-bar"><i class="' + (conf >= 0.6 ? 'high' : '') + '" style="width:' + Math.round(conf * 100) + '%"></i></div></div>';
}

// ─── Rendering: DoF Dashboard ─────────────────────────────────

function renderDashboard() {
  var team = teamByName(state.club);
  var el = document.getElementById('view-dashboard');
  if (state.shortlist.length === 0) {
    el.innerHTML = viewHeader('DoF Dashboard', 'Board-ready view of every tracked target') +
      '<div class="empty-state"><div class="es-icon">&#9678;</div>No targets tracked yet. ' +
      '<button class="linkish" onclick="showView(\'discovery\')">Run discovery</button> to build your shortlist.</div>';
    return;
  }

  var rows = state.shortlist.map(function (entry) {
    var player = playerByName(entry.player);
    var base = baseValuation(player, team);
    var adj = adjustedValuation(player, team, entry);
    return { entry: entry, player: player, base: base, adj: adj };
  }).sort(function (a, b) { return b.adj.multiplier - a.adj.multiplier; });

  var reported = rows.filter(function (r) { return r.entry.reports.length > 0; });
  var totalReports = state.shortlist.reduce(function (s, e) { return s + e.reports.length; }, 0);
  var avgConf = rows.reduce(function (s, r) { return s + r.adj.confidence; }, 0) / rows.length;
  var avgBaseConf = rows.reduce(function (s, r) { return s + r.base.confidence; }, 0) / rows.length;
  var valueEdge = reported.reduce(function (s, r) { return s + (r.adj.contextValue - r.player.marketValue); }, 0);

  var html = viewHeader('DoF Dashboard', 'Board-ready view of every tracked target — values shift as scouting comes in');
  html += '<div class="kpi-row">' +
    kpi('Targets tracked', rows.length, '') +
    kpi('Scout reports filed', totalReports, '') +
    kpi('Avg confidence', pct(avgConf), '+' + Math.round((avgConf - avgBaseConf) * 100) + ' pts vs public data alone', avgConf >= 0.55 ? 'green' : '') +
    kpi('Identified value edge', (valueEdge >= 0 ? '+' : '') + fmtM(Math.round(valueEdge * 10) / 10), 'scouted value minus market, reported targets', valueEdge > 0 ? 'gold' : '') +
    '</div>';

  rows.forEach(function (r) {
    html += targetCardHTML(r.player, team, r.base, r.adj, r.entry);
  });
  el.innerHTML = html;
  wireTargetCards(el);
}

function kpi(label, value, sub, cls) {
  return '<div class="kpi"><div class="k-label">' + label + '</div>' +
    '<div class="k-value ' + (cls || '') + '">' + value + '</div>' +
    (sub ? '<div class="k-sub">' + sub + '</div>' : '') + '</div>';
}

function viewHeader(title, subtitle) {
  return '<div class="view-header"><h2>' + title + '</h2><p class="subtitle">' + subtitle + '</p></div>';
}

function targetCardHTML(player, team, base, adj, entry) {
  var scout = scoutById(entry.scout);
  var hasReports = entry.reports.length > 0;
  var deltaV = Math.round((adj.contextValue - base.contextValue) * 10) / 10;
  var confDelta = Math.round((adj.confidence - base.confidence) * 100);

  var html = '<div class="target-card" data-player="' + escapeHtml(player.name) + '">' +
    '<div class="tc-top">' +
    '<div class="tc-who"><div class="t-name">' + escapeHtml(player.name) + '</div>' +
    '<div class="t-meta">' + player.position + ' · ' + player.age + ' · ' + escapeHtml(player.club) + ' (' + escapeHtml(player.league) + ') · scout: ' + escapeHtml(scout ? scout.name : '—') + '</div></div>' +
    '<div class="tc-nums">' +
    '<div class="tc-num"><div class="n-label">Market</div><div class="n-value">' + fmtM(player.marketValue) + '</div></div>' +
    '<div class="tc-num"><div class="n-label">' + (hasReports ? 'Scouted value' : 'Engine value') + '</div>' +
    '<div class="n-value ' + (adj.multiplier >= 1.15 ? 'green' : adj.multiplier < 0.85 ? 'red' : '') + '">' + fmtM(adj.contextValue) +
    (hasReports && Math.abs(deltaV) >= 0.1 ? ' <span class="n-delta ' + (deltaV >= 0 ? 'up' : 'down') + '">' + (deltaV >= 0 ? '▲' : '▼') + fmtM(Math.abs(deltaV)) + '</span>' : '') +
    '</div></div>' +
    '<div class="tc-num"><div class="n-label">Multiplier</div><div class="n-value">' + adj.multiplier.toFixed(2) + 'x</div></div>' +
    confBarHTML(adj.confidence) +
    '<span class="verdict-chip ' + adj.verdict + '">' + adj.verdict + '</span>' +
    '<span class="status-chip ' + (hasReports ? 'reported' : 'awaiting') + '">' + (hasReports ? entry.reports.length + ' report' + (entry.reports.length > 1 ? 's' : '') : 'awaiting scout') + '</span>' +
    '</div></div>';

  html += '<div class="tc-body">' +
    '<div class="board-note"><div class="bn-label">Board note</div>' + boardNote(player, team, base, adj, entry) + '</div>' +
    factorRowsHTML(adj.factors);

  entry.reports.forEach(function (rep) {
    var s = scoutById(rep.scout);
    html += '<div class="scout-note-row"><div class="scout-avatar">' + escapeHtml(initials(s ? s.name : '?')) + '</div>' +
      '<div class="snr-body"><div class="snr-head">' + escapeHtml(s ? s.name : 'Scout') + ' <span>· ' + escapeHtml(rep.date) + '</span></div>' +
      '<div class="snr-note">“' + escapeHtml(rep.note || 'No written note.') + '”</div></div></div>';
  });

  html += '<div class="tc-actions">' +
    '<button class="btn-primary" onclick="openReport(\'' + jsName(player.name) + '\')">' + (hasReports ? 'Add another report' : 'File scout report') + '</button>' +
    '<button class="btn-danger" onclick="removeTarget(\'' + jsName(player.name) + '\')">Remove from shortlist</button>' +
    '</div></div></div>';
  return html;
}

function initials(name) {
  return name.split(' ').map(function (w) { return w.charAt(0); }).join('').slice(0, 2);
}
function jsName(name) { return name.replace(/\\/g, '').replace(/'/g, "\\'"); }

function wireTargetCards(container) {
  container.querySelectorAll('.target-card .tc-top').forEach(function (top) {
    top.addEventListener('click', function () {
      top.parentElement.classList.toggle('expanded');
    });
  });
}

// ─── Rendering: Discovery ─────────────────────────────────────

var discFilter = { position: 'needs', maxAge: 40, minMult: 0 };

function renderDiscovery() {
  var team = teamByName(state.club);
  var el = document.getElementById('view-discovery');
  var needs = needPositions(team);

  var html = viewHeader('Discovery', 'Engine-ranked candidates from public (Tier 1) data — scouting sharpens them into decisions');

  if (needs.length > 0) {
    html += '<div class="filter-row"><label>Squad gaps:</label>';
    needs.forEach(function (n) {
      html += '<button class="need-chip' + (n.depth > 0 ? ' mild' : '') + '" data-pos="' + n.pos + '">' +
        n.pos + ' · depth ' + n.depth + '</button>';
    });
    html += '</div>';
  }

  var positions = [];
  PLAYERS.forEach(function (p) { if (positions.indexOf(p.position) < 0) positions.push(p.position); });
  positions.sort();

  html += '<div class="filter-row">' +
    '<label>Position</label><select id="disc-pos">' +
    '<option value="needs"' + (discFilter.position === 'needs' ? ' selected' : '') + '>Squad needs</option>' +
    '<option value="all"' + (discFilter.position === 'all' ? ' selected' : '') + '>All</option>' +
    positions.map(function (p) {
      return '<option value="' + p + '"' + (discFilter.position === p ? ' selected' : '') + '>' + p + '</option>';
    }).join('') + '</select>' +
    '<label>Max age</label><input id="disc-age" type="number" min="16" max="40" value="' + discFilter.maxAge + '" style="width:70px">' +
    '<label>Min multiplier</label><select id="disc-mult">' +
    [0, 1.0, 1.1, 1.2, 1.3].map(function (m) {
      return '<option value="' + m + '"' + (discFilter.minMult === m ? ' selected' : '') + '>' + (m === 0 ? 'Any' : m.toFixed(1) + 'x+') + '</option>';
    }).join('') + '</select></div>';

  var needSet = expandPositions(needs.map(function (n) { return n.pos; }));
  var rows = discoveryCandidates(team).filter(function (c) {
    if (discFilter.position === 'needs') { if (needSet.length > 0 && needSet.indexOf(c.player.position) < 0) return false; }
    else if (discFilter.position !== 'all' && expandPositions([discFilter.position]).indexOf(c.player.position) < 0) return false;
    if (c.player.age > discFilter.maxAge) return false;
    if (c.val.multiplier < discFilter.minMult) return false;
    return true;
  }).slice(0, 25);

  html += '<table class="disc-table"><thead><tr>' +
    '<th>#</th><th>Player</th><th>Market</th><th>Value to ' + escapeHtml(team.name) + '</th><th>Mult</th><th>Confidence</th><th></th>' +
    '</tr></thead><tbody>';
  rows.forEach(function (c, i) {
    var shortlisted = !!entryFor(c.player.name);
    html += '<tr><td>' + (i + 1) + '</td>' +
      '<td><div class="d-name">' + escapeHtml(c.player.name) + '</div>' +
      '<div class="d-meta">' + c.player.position + ' · ' + c.player.age + ' · ' + escapeHtml(c.player.club) + '</div></td>' +
      '<td>' + fmtM(c.player.marketValue) + '</td>' +
      '<td><strong>' + fmtM(c.val.contextValue) + '</strong></td>' +
      '<td><span class="mult ' + multClass(c.val.multiplier) + '">' + c.val.multiplier.toFixed(2) + 'x</span></td>' +
      '<td>' + confBarHTML(c.val.confidence) + '</td>' +
      '<td><button class="add-btn"' + (shortlisted ? ' disabled' : '') + ' data-player="' + escapeHtml(c.player.name) + '">' +
      (shortlisted ? 'Shortlisted ✓' : '+ Shortlist') + '</button></td></tr>';
  });
  html += '</tbody></table>';
  if (rows.length === 0) html += '<div class="empty-state">No candidates match these filters.</div>';

  el.innerHTML = html;

  el.querySelectorAll('.need-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      discFilter.position = chip.getAttribute('data-pos');
      renderDiscovery();
    });
  });
  var posSel = document.getElementById('disc-pos');
  if (posSel) posSel.addEventListener('change', function () { discFilter.position = posSel.value; renderDiscovery(); });
  var ageIn = document.getElementById('disc-age');
  if (ageIn) ageIn.addEventListener('change', function () { discFilter.maxAge = parseInt(ageIn.value) || 40; renderDiscovery(); });
  var multSel = document.getElementById('disc-mult');
  if (multSel) multSel.addEventListener('change', function () { discFilter.minMult = parseFloat(multSel.value); renderDiscovery(); });

  el.querySelectorAll('.add-btn:not([disabled])').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-player');
      var nextScout = SCOUTS[state.shortlist.length % SCOUTS.length].id;
      state.shortlist.push({ player: name, scout: nextScout, status: 'awaiting', reports: [] });
      saveState();
      renderDiscovery();
    });
  });
}

// ─── Rendering: Scouting Desk (assignments) ───────────────────

function renderAssignments() {
  var team = teamByName(state.club);
  var el = document.getElementById('view-assignments');
  var html = viewHeader('Scouting Desk', 'Assignments for the department — file reports to feed Tier 3 into the engine');

  if (state.shortlist.length === 0) {
    html += '<div class="empty-state"><div class="es-icon">&#9998;</div>Nothing assigned. ' +
      '<button class="linkish" onclick="showView(\'discovery\')">Shortlist targets in Discovery</button> first.</div>';
    el.innerHTML = html;
    return;
  }

  state.shortlist.forEach(function (entry) {
    var player = playerByName(entry.player);
    var hasReports = entry.reports.length > 0;
    html += '<div class="target-card"><div class="tc-top" style="cursor:default">' +
      '<div class="tc-who"><div class="t-name">' + escapeHtml(player.name) + '</div>' +
      '<div class="t-meta">' + player.position + ' · ' + player.age + ' · ' + escapeHtml(player.club) + '</div></div>' +
      '<div class="tc-nums">' +
      '<div class="tc-num"><div class="n-label">Assigned to</div><div>' +
      '<select class="assign-sel" data-player="' + escapeHtml(player.name) + '" style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text-bright);font-family:var(--font);padding:0.3rem 0.5rem;font-size:0.82rem">' +
      SCOUTS.map(function (s) {
        return '<option value="' + s.id + '"' + (entry.scout === s.id ? ' selected' : '') + '>' + escapeHtml(s.name) + '</option>';
      }).join('') + '</select></div></div>' +
      '<span class="status-chip ' + (hasReports ? 'reported' : 'awaiting') + '">' + (hasReports ? entry.reports.length + ' report' + (entry.reports.length > 1 ? 's' : '') + ' filed' : 'awaiting report') + '</span>' +
      '<button class="btn-primary" onclick="openReport(\'' + jsName(player.name) + '\')">' + (hasReports ? 'Add report' : 'File report') + '</button>' +
      '</div></div></div>';
  });
  el.innerHTML = html;

  el.querySelectorAll('.assign-sel').forEach(function (sel) {
    sel.addEventListener('change', function () {
      var entry = entryFor(sel.getAttribute('data-player'));
      if (entry) { entry.scout = sel.value; saveState(); }
    });
  });
}

// ─── Rendering: Scout report form ─────────────────────────────

var reportTarget = null;

function openReport(playerName) {
  reportTarget = playerName;
  showView('report');
}

function renderReport() {
  var el = document.getElementById('view-report');
  if (!reportTarget) { el.innerHTML = ''; return; }
  var player = playerByName(reportTarget);
  var team = teamByName(state.club);
  var entry = entryFor(reportTarget);
  var groups = t3GroupsFor(player.position);

  var html = '<div class="view-header">' +
    '<button class="btn-danger" style="padding-left:0" onclick="showView(\'assignments\')">&larr; Back to Scouting Desk</button>' +
    '<h2>Scout report — ' + escapeHtml(player.name) + '</h2>' +
    '<p class="subtitle">' + player.position + ' · ' + player.age + ' · ' + escapeHtml(player.club) + ' → ' + escapeHtml(team.name) +
    ' · these are the engine’s real Tier 3 dimensions — watch the valuation move as you assess</p></div>';

  html += '<div class="report-meta-row"><label style="font-size:0.85rem;color:var(--text-dim)">Filing as</label>' +
    '<select id="report-scout">' +
    SCOUTS.map(function (s) {
      return '<option value="' + s.id + '"' + (entry && entry.scout === s.id ? ' selected' : '') + '>' + escapeHtml(s.name) + ' — ' + escapeHtml(s.region) + '</option>';
    }).join('') + '</select></div>';

  html += '<div class="report-grid"><div>';
  groups.forEach(function (g) {
    html += '<div class="slider-group"><h4>' + g.title + '</h4>';
    g.fields.forEach(function (f) {
      html += '<div class="sl-row">' +
        '<label>' + f.label + (f.inverse ? ' <span class="inv">high = risk</span>' : '') + '</label>' +
        '<input type="range" min="1" max="10" step="1" value="5" data-field="' + f.id + '">' +
        '<span class="sl-val" id="slval-' + f.id + '">5</span></div>';
    });
    html += '</div>';
  });
  html += '<textarea id="report-note" placeholder="Written assessment for the Director of Football…"></textarea>' +
    '<div style="margin-top:0.9rem;display:flex;gap:0.6rem">' +
    '<button class="btn-primary" id="file-report">File report</button>' +
    '<button class="btn-secondary" onclick="showView(\'assignments\')">Cancel</button></div>';

  html += '</div><div class="live-panel"><h4>Live valuation impact</h4><div id="live-body"></div></div></div>';

  el.innerHTML = html;

  el.querySelectorAll('input[type=range]').forEach(function (sl) {
    sl.addEventListener('input', function () {
      document.getElementById('slval-' + sl.getAttribute('data-field')).textContent = sl.value;
      updateLivePanel();
    });
  });
  document.getElementById('file-report').addEventListener('click', fileReport);
  updateLivePanel();
}

function draftValues() {
  var values = {};
  document.querySelectorAll('#view-report input[type=range]').forEach(function (sl) {
    values[sl.getAttribute('data-field')] = parseInt(sl.value);
  });
  return values;
}

function updateLivePanel() {
  var player = playerByName(reportTarget);
  var team = teamByName(state.club);
  var entry = entryFor(reportTarget) || { reports: [] };

  var before = adjustedValuation(player, team, entry);
  var draftEntry = { reports: entry.reports.concat([{ scout: 'draft', values: draftValues(), note: '' }]) };
  var after = adjustedValuation(player, team, draftEntry);

  var dv = after.contextValue - before.contextValue;
  var body = lpRow('Market value', '<span class="after">' + fmtM(player.marketValue) + '</span>') +
    lpRow('Context value', '<span>' + fmtM(before.contextValue) + '</span><span class="arrow">→</span>' +
      '<span class="after ' + (dv > 0.05 ? 'up' : dv < -0.05 ? 'down' : '') + '">' + fmtM(after.contextValue) + '</span>') +
    lpRow('Multiplier', '<span>' + before.multiplier.toFixed(2) + 'x</span><span class="arrow">→</span>' +
      '<span class="after">' + after.multiplier.toFixed(2) + 'x</span>') +
    lpRow('Confidence', '<span>' + pct(before.confidence) + '</span><span class="arrow">→</span>' +
      '<span class="after up">' + pct(after.confidence) + '</span>') +
    '<div class="lp-row"><span class="lp-label">Verdict</span><span class="lp-verdicts">' +
    '<span class="verdict-chip ' + before.verdict + '">' + before.verdict + '</span><span class="arrow">→</span>' +
    '<span class="verdict-chip ' + after.verdict + '">' + after.verdict + '</span></span></div>';

  var t3 = after.factors.filter(function (f) { return f.tier === 3; });
  if (t3.length > 0) {
    body += '<div style="margin-top:0.8rem;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-dim)">Tier 3 factors (your input)</div>' +
      factorRowsHTML(t3);
  }
  document.getElementById('live-body').innerHTML = body;
}

function lpRow(label, valsHTML) {
  return '<div class="lp-row"><span class="lp-label">' + label + '</span><span class="lp-vals">' + valsHTML + '</span></div>';
}

function fileReport() {
  var entry = entryFor(reportTarget);
  if (!entry) {
    entry = { player: reportTarget, scout: SCOUTS[0].id, status: 'awaiting', reports: [] };
    state.shortlist.push(entry);
  }
  var scoutSel = document.getElementById('report-scout');
  var note = document.getElementById('report-note').value.trim();
  entry.reports.push({
    scout: scoutSel.value,
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    values: draftValues(),
    note: note
  });
  entry.status = 'reported';
  saveState();
  showView('dashboard');
}

// ─── Global actions ───────────────────────────────────────────

function removeTarget(playerName) {
  state.shortlist = state.shortlist.filter(function (e) { return e.player !== playerName; });
  saveState();
  renderAll();
}

// ─── Navigation & bootstrap ───────────────────────────────────

function showView(name) {
  document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.toggle('active', n.getAttribute('data-view') === (name === 'report' ? 'assignments' : name));
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'discovery') renderDiscovery();
  if (name === 'assignments') renderAssignments();
  if (name === 'report') renderReport();
}

function renderAll() {
  document.getElementById('club-name').textContent = state.club || '—';
  var team = state.club ? teamByName(state.club) : null;
  document.getElementById('club-budget').textContent = team ? 'window budget ' + fmtM(team.budget) : '';
  var active = document.querySelector('.nav-item.active');
  showView(active ? active.getAttribute('data-view') : 'dashboard');
}

function openClubModal() {
  var sel = document.getElementById('club-select');
  sel.innerHTML = TEAMS.map(function (t) {
    return '<option value="' + escapeHtml(t.name) + '"' + (state.club === t.name ? ' selected' : '') + '>' +
      escapeHtml(t.name) + ' — ' + escapeHtml(t.league) + '</option>';
  }).join('');
  document.getElementById('club-modal').classList.add('open');
}

document.getElementById('club-confirm').addEventListener('click', function () {
  var chosen = document.getElementById('club-select').value;
  document.getElementById('club-modal').classList.remove('open');
  if (chosen !== state.club) seedWorkspace(chosen);
  renderAll();
});

document.getElementById('switch-club').addEventListener('click', openClubModal);
document.getElementById('reset-demo').addEventListener('click', function () {
  localStorage.removeItem(STORE_KEY);
  location.reload();
});

document.querySelectorAll('.nav-item').forEach(function (btn) {
  btn.addEventListener('click', function () { showView(btn.getAttribute('data-view')); });
});

document.getElementById('roster-list').innerHTML = SCOUTS.map(function (s) {
  return '<div class="scout-row"><div class="scout-avatar">' + initials(s.name) + '</div>' +
    '<div class="scout-meta"><div class="s-name">' + escapeHtml(s.name) + '</div>' +
    '<div class="s-region">' + escapeHtml(s.region) + '</div></div></div>';
}).join('');

if (loadState() && state.club) {
  renderAll();
} else {
  openClubModal();
}
