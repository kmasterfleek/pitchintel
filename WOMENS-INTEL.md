# PitchIntel Women — the scarce-data intelligence system

## The repositioning

The men's product was new paint on a crowded wall: Transfermarkt, FBRef, Opta,
Wyscout all exist, and a valuation engine competes on being *smarter*. Women's
football inverts this. As of mid-2026 (see `intel/2026-08-02-data-landscape.md`):

- The only free advanced-stats source (FBRef/Opta) was **shut off in January
  2026** and has not returned.
- Market values are one volunteer-run editorial site (Soccerdonna) that cannot
  even cover Mexico or Brazil.
- The transfer market grew **+80% year-on-year** to $28.6M with the world
  record broken four times in 20 months — while club scouting departments are
  1–4 people (vs 20+ in comparable men's clubs).
- The proven star pipeline runs through data deserts: Banda, Kundananji, both
  Chawingas, Dumornay, Martínez — all found via tournaments, not databases.
- The 2027 Women's World Cup (Brazil, Jun 24 – Jul 25) is under a year away,
  and its qualifiers ARE the scouting windows for the deserts. WAFCON is
  happening right now (through Aug 16, 2026).

**No public, stats-driven women's valuation product exists.** In women's
football, PitchIntel doesn't compete on being smarter — it competes on
*knowing anything at all, honestly*.

## Why this engine, specifically

`player-vector.ts` was designed for graceful degradation: all 112 optional
dimensions can be missing, factors skip what they can't score, and every
valuation carries an explicit **confidence** number. In the men's game that's
a nice-to-have. Here it is the product:

> "€200K at 23% confidence — and here are the exact dimensions one video
> session would unlock."

Scarcity stops being a bug and becomes the work queue. The engine converts
missing data into a ranked scouting task list, which is precisely what a
1-person recruitment department needs.

## The two research modes (answer: both, in a specific split)

**Mode A — Deep corpus (research once, hold the data).** Batch deep-research
runs sweep a topic and land as dated, fully-sourced markdown dossiers in
`intel/`, distilled into engine-native partial `PlayerVector`s in
`code/data/women/`. Git is the database: versioned, diffable, cheap to hold,
and every claim carries its source URL. This is the compounding asset — each
run makes the next one cheaper, and the corpus is defensible in a way
real-time lookups are not. **Run cadence: the tournament calendar.** Each
qualifying window is a data event for desert players (WAFCON now; UEFA
play-offs Oct–Dec 2026; Concacaf W Championship Nov–Dec 2026;
inter-confederation play-offs Feb 2027; the World Cup itself).

**Mode B — Live desk (in-the-moment intelligence).** For a named player not
in the corpus — "board asks about X tonight" — an on-demand research run
builds a sourced dossier in minutes and *appends it to the corpus*, so live
work is never thrown away. In the product this is a backend endpoint (Claude
API + web search, exactly the agent runs that built today's corpus); in
development it's a request in this repo.

The token-heavy work is Mode A, and it's bounded: a full corpus refresh is a
handful of parallel research agents per window, not a continuous burn. Mode B
is per-query and cheap. The mistake to avoid is doing Mode B repeatedly
without writing results back — that's paying corpus prices for cache misses
forever.

## The corpus rules

1. A dimension is populated **only** where public evidence supports at least
   an estimate; each dossier's `dataNotes` says what is sourced vs estimated.
2. Every factual claim in `intel/` carries its source URL. No source, no fact.
3. Old dossiers are never edited — superseded by new dated files.
4. Market values in uncovered regions are authored estimates anchored to
   reported fees for comparable moves, and say so.
5. The engine is never re-implemented or forked — same
   `computeEnhancedValuation`, same parity discipline as the enterprise demo.

## What exists now

| Piece | Where | What |
|---|---|---|
| Research corpus (Mode A, run 1) | `intel/2026-08-02-*.md` | Market context, data landscape, frontier players — fully sourced |
| Structured frontier corpus | `code/data/women/frontier.ts` | 9 real players as partial PlayerVectors with provenance |
| Buyer-club contexts | `code/data/women/clubs.ts` | 6 frontier-active clubs (Kynisca group, NWSL desert-buyers, Madrid CFF) |
| Corpus runner | `code/womens-frontier.ts` (`npm run women`) | Honesty table → context valuations → scout-trip ROI ladder |

The ROI ladder is the demo that sells it: Aissatou Fall (CB, 19, Senegalese
D1 — zero public data) goes from 14% confidence / 3 active factors to 61% /
10 factors through two simulated units of scouting work, with every added
number labeled as simulation.

## Where it goes next

1. **Real Tier-1 ingestion for the data-rich end**: StatsBomb's free open
   data (771 women's matches across WSL/NWSL/Liga F/FB/Serie A) calibrates
   the engine on real women's event data — league-quality priors, position
   norms, women-specific thresholds.
2. **WAFCON watch desk (Mode B, live)**: the tournament runs through Aug 16.
   Every desert player in the corpus is being broadcast for the first time —
   dossier updates per matchday are the cheapest data acquisition this
   product will ever get.
3. **Product surface**: a women's enterprise demo (the Northbridge pattern —
   a fictional mature club so no real-club claims are needed) where the
   Discovery view is the honesty table and filing a Tier-3 report visibly
   moves confidence — the loop the CLI already proves.
4. **Editorial surface**: the World Cup special pattern, rebuilt for the road
   to Brazil 2027 — qualification windows as recurring content moments.
