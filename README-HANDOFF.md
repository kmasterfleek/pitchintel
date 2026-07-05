# PitchIntel — Handoff Package

A context-adjusted football player **valuation engine** (a Transfermarkt alternative)
that treats value as *relational* rather than a single number. The same player is
worth different amounts to different clubs depending on system fit, coaching style,
squad chemistry, structural impact, redundancy, and formation fit.

This folder is a **self-contained snapshot** assembled for handoff to a new team.
Everything needed to run the prototype is here — no external project files required.

---

## Where this came from

Original location on the source machine:

```
/Volumes/LaCie/ruvectors/RuVector-main 6 copy/src/pitch-intel
```

It was one module inside the larger **RuVector** graph/vector-database repo. All the
TypeScript here is self-contained (every import stays within this folder), so it was
lifted out cleanly. The parent RuVector repo also contains production-grade **Rust
crates** (dynamic MinCut, spectral sparsifier, PPR solver) that this prototype
re-implements in TypeScript for speed of iteration — see "Rust integration path" in
`code/TRANSFER.md` if that becomes relevant.

The original files remain untouched on the LaCie; this is a copy. macOS `._`
metadata files were stripped during the copy.

---

## What it does (the valuation idea)

The core thesis: **a player's value is not intrinsic — it's contextual.** The engine
scores every player against every team along six factors and produces a
context-adjusted value plus a plain-English explanation:

1. **System fit** — does their style match the team's passing-graph structure?
2. **Structural impact** — do they improve MinCut (defense) or PageRank flow (attack)?
3. **Chemistry** — do they pair well with existing players?
4. **Redundancy** — does the team already have what they offer?
5. **Dependency risk** — would buying them create a single point of failure?
6. **Formation fit** — do they suit the shape the team actually plays?

Representations are vector embeddings:
- **Player vector** — ~118 dimensions across three data tiers (public FBRef/Opta,
  tracking-derived, subjective scouting). Degrades gracefully when data is missing.
- **Coach vector** — ~75 dimensions (tactical system, development, personality,
  track record) for coach↔squad structural matching.
- **Team context** — formation, style, MinCut, network density, hub dependency,
  position depth, etc.

Underneath sits a graph-theory **tactical engine** (MinCut vulnerability corridors,
Personalized PageRank passing chains, spectral formation analysis) that the valuation
factors draw on.

---

## Current status (as of the source files, April 2026)

**Working, on synthetic + curated data:**
- Player vector (118-dim) and coach vector (75-dim) definitions
- Context-adjusted valuation engine (`transfer-intel.ts`)
- Gem scanner — bargains / overpays / perfect fits across ~80 players × ~30 teams
- Curated player DB (FBRef/Transfermarkt-derived) and team DB (5 top leagues)
- Coach-to-team structural matching
- Graph tactical core (MinCut, PPR, formation eigenvalues) — complete
- Self-contained web app + HTML demos (valuation UI, comparison, broadcast overlay)

**Not built yet / next priorities:**
- **Real data ingestion** — an `fbref-scraper.ts` + `profile-builder.ts` scaffold
  exists, but the databases are currently hand-curated / synthetic. Wiring in live
  FBRef/Opta/StatsBomb data is the #1 next step.
- **Threshold calibration on real matches** — all thresholds were tuned on synthetic
  data and will need retuning.
- Formation detection uses gap heuristics (should move to template matching).
- No camera/video position extraction; expects tracking data as input.

See `code/TRANSFER.md` for the deep technical writeup of the tactical core, the
algorithms, data formats (Metrica / EPTS / StatsBomb), and the product/market plan.

> Note: `TRANSFER.md` was written slightly before the newest valuation layer
> (`player-vector.ts`, `coach-vector.ts`, `transfer-intel.ts`, `gem-scanner.ts`,
> `app.ts`), so it focuses on the tactical engine. This README covers the valuation
> layer that sits on top.

---

## How to run

Requires Node 18+. From this folder:

```bash
npm install          # installs tsx + typescript (dev only)

npm run valuation    # context-adjusted valuations (transfer-intel.ts)
npm run gems         # bargain / overpay / perfect-fit scanner
npm run player-vector# player vector demo
npm run coach-match  # coach ↔ team fit
npm run team-dna     # multi-match team structural profile
npm run report       # CLI post-match tactical report

# Regenerate the self-contained HTML apps/demos:
npm run build:app        # -> code/pitchintel-app.html (main valuation UI)
npm run build:comparison # -> code/pitch-intel-comparison.html
npm run build:broadcast  # -> code/pitch-intel-broadcast.html
```

The pre-generated HTML files are already in `code/` and open directly in a browser
with no server — start with **`code/pitchintel-app.html`**.

---

## Beta site (public deployment)

The `site/` folder is a deployable static site: `index.html` (landing page with
waitlist signup), `app.html` (the valuation app with beta banner, disclaimer, and
Pro-button → waitlist modal), `how-it-works.html` (methodology page), and
`enterprise.html` (the club-facing scouting-department demo, below).

### Enterprise demo (`site/enterprise.html`)

A simulated club workspace showing the enterprise product: pick a club, the
engine surfaces candidates for your squad gaps from public Tier 1 data
(Discovery), you assign scouts (Scouting Desk), scouts file reports on the
engine's real 24 Tier 3 dimensions, and the DoF Dashboard shows valuations and
confidence moving as scouting lands — board notes included. State persists in
localStorage; "Reset demo" starts over.

It is generated by `code/enterprise.ts` + `code/enterprise-ui.js`
(`npm run build:enterprise`). Crucially it does NOT re-implement the valuation:
sections 2–4 of `player-vector.ts` (the 16-factor tiered engine) are transpiled
to plain JS at build time and embedded, and the build fails if the embedded
engine's output ever differs from the TypeScript original (parity check).

```bash
npm run build:site   # regenerates site/app.html + site/how-it-works.html
                     # (site/index.html is hand-authored — edit it directly)
```

**Deploy to Netlify** (email capture works out of the box via Netlify Forms —
submissions appear under Site → Forms in the Netlify dashboard):

```bash
npx netlify-cli login          # one-time, interactive
npx netlify-cli init           # one-time, creates the site
npx netlify-cli deploy --prod  # publishes site/ (configured in netlify.toml)
```

Notes:
- The waitlist forms POST to Netlify Forms (`name="waitlist"`, with a `source`
  field telling you where the signup came from: landing, app banner, Pro buttons).
  On any other host they fail silently — swap the form endpoint if not on Netlify.
- Analytics: nothing is wired in. Netlify Analytics (paid, zero-config) or a
  one-line Plausible/GoatCounter script in the three HTML files.
- The footer disclaimer marks valuations as illustrative demo-data output —
  keep it until real data is wired in.

---

## Folder map

```
PitchIntel-Handoff/
├── README-HANDOFF.md          # this file
├── package.json               # run scripts + tsx/typescript
├── tsconfig.json              # NodeNext / ESM config
└── code/
    ├── TRANSFER.md            # original deep technical + product doc
    ├── types.ts               # shared data structures
    ├── player-vector.ts       # 118-dim player embedding
    ├── coach-vector.ts        # 75-dim coach embedding + matching
    ├── transfer-intel.ts      # context-adjusted valuation engine
    ├── gem-scanner.ts         # market-wide bargain/overpay scan
    ├── team-dna.ts            # multi-match team profiling
    ├── app.ts                 # generates the self-contained web app
    ├── comparison.ts          # side-by-side HTML demo generator
    ├── broadcast.ts           # TV overlay HTML demo generator
    ├── demo.ts                # CLI match report
    ├── visualize.ts           # visualization helpers
    ├── graph/engine.ts        # MinCut, PPR, spectral, formation algos
    ├── analysis/tactical.ts   # frame-by-frame tactical pipeline
    ├── data/
    │   ├── players-db.ts      # curated player database
    │   ├── teams-db.ts        # curated team database
    │   ├── synthetic.ts       # synthetic match generator
    │   ├── fbref-scraper.ts   # real-data scraper scaffold (not yet wired in)
    │   └── profile-builder.ts # raw stats -> ScoutProfile/TeamContext
    └── *.html                 # pre-generated demos (open in browser)
```
