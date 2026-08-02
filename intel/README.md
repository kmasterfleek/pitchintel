# PitchIntel Women's Intelligence Corpus

This directory is the **held research layer** for PitchIntel Women — the output of
deep-research runs, versioned in git so the product works from durable, sourced
intelligence instead of re-researching on every question.

## How the two-mode research system works

**Mode A — Deep corpus (this directory).** Batch research runs sweep a topic
(market context, data landscape, frontier players) and land here as dated
markdown dossiers. Every factual claim carries its source URL inline. The
structured, engine-readable distillation of these dossiers lives in
`code/data/women/` as partial `PlayerVector`s — only dimensions the evidence
actually supports get populated, and the valuation engine's confidence score
degrades honestly for everything else.

**Mode B — Live desk.** For a named player not yet in the corpus, an on-demand
research run builds a dossier in minutes and appends it here + to the
structured corpus. In the product this is a backend endpoint (Claude API + web
search); in development it's a request to the agent.

## Conventions

- Filenames: `YYYY-MM-DD-<topic>.md` — the date is the research snapshot date.
- Never edit facts in an old dossier; supersede with a new dated file.
- A claim without a source URL doesn't go in the corpus.
- Refresh cadence follows the tournament calendar (each window is a data event
  for data-desert players): WAFCON (Jul–Aug 2026, in progress), UEFA WC play-offs
  (Oct–Dec 2026), Concacaf W Championship (Nov–Dec 2026), inter-confederation
  play-offs (Feb 2027), Women's World Cup Brazil (Jun 24 – Jul 25, 2027).

## Contents

- `2026-08-02-market-context.md` — WWC 2027 qualification state, transfer market
  growth, club investment climate, why the next 12 months are the window.
- `2026-08-02-data-landscape.md` — where public women's data exists and where it
  doesn't; the Jan 2026 FBRef/Opta collapse; the five data deserts.
- `2026-08-02-frontier-players.md` — the proven desert-to-star pattern (10
  players) and the current frontier watchlist (12 players/situations) with every
  concrete number found.
