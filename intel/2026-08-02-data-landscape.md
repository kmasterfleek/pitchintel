# Women's Football Data Landscape — research snapshot 2026-08-02

Mode A deep-research dossier. Every claim carries its source URL.

## 1. Public advanced-stats coverage

**FBRef — the free-stats hub, now gutted**
- Under its Opta partnership (2022), FBRef carried advanced stats — xG, xA, progressive passes, shot-creating actions, scout reports — for WSL, NWSL, Frauen-Bundesliga, Serie A Femminile, Première Ligue, A-League Women, Liga F, and UWCL (https://herfootballhub.com/how-to-use-womens-football-data/)
- **Critical: on January 20, 2026, Stats Perform/Opta terminated FBRef's data access**, requiring immediate deletion. All advanced metrics vanished from every women's competition, leaving only basic scores, appearances, goals and assists (https://www.theixsports.com/the-ix-soccer/fbrefs-loss-advanced-stats-womens-soccer-data-accessibility/; https://www.sports-reference.com/blog/2026/01/fbref-stathead-data-update/). As of this writing the data has not been restored. The IX called it "a disaster for women's soccer data," noting only Fotmob and Sofascore still show xG for multiple women's leagues, with fragmented coverage.
- FBRef retains basic pages for a longer tail of women's leagues, e.g., Brazilian Série A1 (https://fbref.com/en/comps/206/history/Serie-A1-Seasons), NWSL (https://fbref.com/en/comps/182/NWSL-Stats), WSL (https://fbref.com/en/comps/189/Womens-Super-League-Stats)

**StatsBomb (Hudl) — the best free event data in football is women's**
- **May 27, 2026: Hudl StatsBomb released five complete domestic women's league seasons as free open data** — WSL, Serie A Women, Frauen-Bundesliga, Liga F (all 2023/24) plus full NWSL 2023: 771 matches, 62 teams, ~1,500 players, full event data with xG, via statsbombpy/StatsBombR (https://www.hudl.com/blog/statsbomb-free-womens-data-wsl-ligaf-bundesliga-seriea-nwsl)
- Full open-data women's holdings (competitions.json): FA WSL 2018/19–2020/21 + 2023/24; NWSL 2018 + 2023; Frauen-Bundesliga, Liga F, Serie A Women 2023/24; UEFA Women's Euro 2022 and 2025; Women's World Cup 2019 and 2023 (https://github.com/statsbomb/open-data)
- Caveat: snapshots of past seasons, not a live feed — current-season women's event data remains paywalled.

**Opta / Stats Perform — deepest commercial coverage, no longer free anywhere**
- Claims coverage of "over 90% of elite women's football leagues," women's competitions collectable at Tier 1 spec, women-specific models (xG trained on women's data), Opta Vision tracking-enriched data (https://www.statsperform.com/womens-sports/)

**Wyscout / Hudl — the scouting-video standard**
- ~900+ competitions globally, explicitly expanding women's coverage; Hudl League Exchange gives clubs footage + data for the entire WSL and WSL2; 2024–2028 Romanian FA deal hosts Liga I Feminin; Hudl is Official Scouting Analysis Provider of Canada's Northern Super League; Wyscout is the data backbone for TransferRoom's women's marketplace (https://www.hudl.com/en_gb/products/wyscout; https://www.hudl.com/blog/the-growing-role-of-video-analysis-in-womens-football-with-bristol-city-wfc; https://sports.yahoo.com/articles/inside-transferroom-launch-women-football-101607104.html)

## 2. The gaps — and how scouting actually works

- **Many women's matches, especially below the top level, are simply not filmed**; no film means no event data can ever be collected. Men's-trained models (e.g., xG) can't be reliably applied (https://beyondthepitch24.substack.com/p/the-data-deficit-in-womens-football)
- Even Soccerdonna cannot value players in Liga MX Femenil or Brazil's Série A1 because its volunteer analysts can't watch enough matches (https://theriseofwomensfootball.com/womens-football-market-values-global-hierarchy)
- Africa: coverage/filming gaps keep African players "underrepresented in global scouting systems"; most female players in many African leagues are on short-term contracts with no health insurance or social security (https://africasacountry.com/2024/08/the-mirage-of-progress-in-womens-football)
- FIFA's *Setting the Pace* benchmarking now covers 86 leagues and 669 clubs (up from 34 leagues) including "data and digital" as a tracked category (https://inside.fifa.com/news/womens-football-benchmarking-report-detailed-global-insights-recommendations)

**How scouting works today**
- "Eyes, ears and numbers": video + in-person scouting, agent relationships, then data. Working tools: Wyscout, Soccerdonna, FBRef, and DAZN-as-a-scouting-tool. Only a handful of clubs (Chelsea, Arsenal, Man City, Man United) have dedicated full-time women's recruitment departments (https://sportsologygroup.com/articles/elevating-scouting-and-recruitment-in-womens-football-a-comprehensive-approach)
- WSL recruitment professionalizing but tiny: single named heads of recruitment at Man United, West Ham, Brighton, Arsenal; Leicester's data analysts found Jutta Rantala and Yuka Momiki; Liverpool: "data and clips" plus a call (https://richlaverty.substack.com/p/how-wsl-recruitment-is-changing-window)
- International tournaments are the de facto scouting infrastructure for data-dark regions: WAFCON described as "one of the sport's most important scouting windows" and "a shop window for NWSL clubs"; Michelle Alozie: "If people can't watch these players, they won't have opportunities to sign for bigger clubs" (https://www.espn.com/espn/story/_/id/45809107/nwsl-michelle-alozie-hopes-wafcon-leads-more-african-players-us-league)
- Video-CV platforms fill part of the gap from the player side (Veo/WomanGoal) (https://www.veo.co/en-us/article/womangoal-where-dreams-meet-opportunity-through-the-power-of-video)

## 3. Market values and contracts

- Women's market values live on Soccerdonna: values only since 2021, run by volunteers covering leagues they personally follow, qualitative judgment not an algorithm, explicit holes (no values for Mexico or Brazil). Top value trajectory: Marozsán €425k (2021) → Bonmatí €1.6m (2026), ~20 players above €800k (https://theriseofwomensfootball.com/womens-football-market-values-global-hierarchy)
- Fees mostly nonexistent or undisclosed: in 2019, under 4% of 833 global women's transfers involved any fee; 86% involved out-of-contract players (https://www.pressreader.com/uk/the-daily-telegraph-sport/20200201/281792811010577); English transfer lists still show fee after fee as "Undisclosed" (https://en.wikipedia.org/wiki/List_of_English_women%27s_football_transfers_winter_2025%E2%80%9326)
- **Competitive landscape for a valuation product**: (a) Soccerdonna — subjective, volunteer, sparse; (b) TransferRoom's Women's Marketplace, launched early 2026 (ex-Lioness Claire Rafferty) — 50+ clubs within a month, Wyscout-fed, algorithmic expected-fee/salary benchmarks, closed B2B (https://blog.transferroom.com/transferroom-launches-dedicated-womens-marketplace; https://tech.sportbusiness.com/2026/03/building-a-transfer-marketplace-of-her-own/). **No public, stats-driven women's player-valuation product currently exists.**

## 4. Tracking and video availability

- UWCL: DAZN free-YouTube era (2021–2025) ended; from 2025/26 Disney+ is the pan-European home of all 75 UWCL matches through 2029/30; CBS holds US rights. A step backward for open scouting access (https://thewaltdisneycompany.eu/disney-becomes-the-home-of-uefa-womens-champions-league-across-europe/)
- WSL: five-year Sky Sports/BBC deal from 2025/26 with every match shown domestically; 13 new international broadcasters plus the league's own YouTube channel carrying matches globally; CBS holds US rights 2026/27–2029/30 (https://www.wslfootball.com/news/international-broadcast-partners-confirmed)
- NWSL: every match across CBS (38), ESPN (36), Prime Video (27), Scripps/ION (50), free ad-supported Victory+ (57), and NWSL+ (40) for 2026–27 (https://equalizersoccer.com/2025/09/16/the-nwsl-announces-expanded-television-rights-deals-for-2026-and-2027/)
- Latin America: Brasileirão Feminino A1 across TV Globo, TV Brasil, sportv, N Sports, CBF TV, getv, UOL; Liga MX Femenil in the US via CBS/Fox/TelevisaUnivision; Copa Libertadores Femenina streams free on Pluto TV. Yet practical watchability is poor enough that Mexico/Brazil still lack market values (https://en.wikipedia.org/wiki/Campeonato_Brasileiro_de_Futebol_Feminino_S%C3%A9rie_A1; https://senalnews.com/es/digital/pluto-tv-transmitira-conmebol-libertadores-femenina-2025-por-cuarto-ano-consecutivo)
- **Tracking**: SkillCorner extracts tracking/physical data from any single-camera source across 140+ leagues including growing women's coverage; "Data On Demand" exists precisely because women's football often relies on single-camera setups (https://skillcorner.com/us/articles/our-global-data-coverage; https://skillcorner.com/articles/data-on-demand). **Implication: wherever broadcast video exists, tracking can be generated retroactively — video availability is the true bottleneck, not tracking tech.**

## Top 5 data deserts (promising players, near-zero digital footprint)

1. **African domestic leagues** (Nigeria NWFL, Zambia, Morocco, …) — no event data, most matches unfilmed; scouting happens almost entirely at WAFCON and CAF Champions League windows
2. **South American domestic leagues outside Brazil's A1** (Colombia, Argentina, Chile, Ecuador, Paraguay) — visibility concentrated in one short free-streamed tournament (Libertadores Femenina on Pluto TV)
3. **Liga MX Femenil and Brazilian Série A1** — despite broadcasts, outside every public analytics pipeline; even Soccerdonna assigns no market values
4. **European second divisions and mid-tier first divisions** (below WSL2; Portugal, Netherlands, Scandinavia beyond top clubs, Eastern Europe) — coverage below tier 1 is ad hoc
5. **Caribbean and Central American leagues** — absent from every provider list; players surface only via national-team windows and US college pipelines

## Strategic takeaways

1. The Jan 2026 FBRef–Opta divorce removed the only free advanced-stats source for women's football — a public valuation engine built on the May 2026 StatsBomb open releases plus Fotmob/Sofascore live xG would instantly fill a vacuum.
2. No stats-driven public women's valuation product exists; incumbents are a volunteer editorial site and a closed B2B marketplace.
3. Fee data will stay sparse (entire global market $28.6m in 2025) — frame "valuation" as expected-demand/replacement-cost.
4. Video, not tracking tech, is the binding constraint in the deserts: single-camera-to-tracking pipelines mean any league that gets streamed becomes data-addressable.
