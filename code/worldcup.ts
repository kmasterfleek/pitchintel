/**
 * PitchIntel — World Cup 2026 Special
 *
 * Generates a static editorial page (pitchintel-worldcup.html): the
 * tournament's breakout stars, what the market is saying about them
 * (reported rumors, attributed), and what the ENGINE says — best-fit
 * clubs computed with the real tiered valuation engine at build time,
 * set against the hype.
 *
 * Research snapshot: July 19, 2026 (final day, Argentina vs Spain).
 * Rumors are media reports, not PitchIntel claims — attributed on-page.
 *
 * Usage: npx tsx code/worldcup.ts
 * Output: code/pitchintel-worldcup.html
 */

import { getTeamDatabase } from './data/teams-db.js';
import type { ScoutProfile } from './data/players-db.js';
import { computeEnhancedValuation, scoutProfileToVector } from './player-vector.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Featured players (profiles authored from public/tournament data) ─

interface WCPlayer {
  profile: ScoutProfile;
  flag: string;
  country: string;
  preWC: number;         // €M market value before the tournament (reported)
  postWC: number;        // €M post-tournament talk (reported)
  tournament: string[];  // storyline stat lines (from research)
  talking: string;       // "who's talking to them" — attributed rumors
  rumored: string[];     // rumored clubs that exist in our team DB
  scout: { name: string; region: string; initials: string };
  angle?: string;        // optional editorial angle override
}

const P = (p: ScoutProfile) => p;

const FEATURED: WCPlayer[] = [
  {
    profile: P({ name: 'Yan Diomandé', age: 19, position: 'LW', club: 'RB Leipzig', league: 'Bundesliga',
      nationality: 'Ivory Coast', marketValue: 100, contractYearsLeft: 4, passCompletionRate: 0.78,
      avgPassDistance: 11, defensiveWorkRate: 0.45, sprintCapacity: 30, avgSpeed: 7.4,
      currentPageRank: 0.24, currentConnections: 7, currentPassWeight: 0.3, avgX: 18, avgY: -22 }),
    flag: '&#127464;&#127470;', country: 'Ivory Coast',
    preWC: 100, postWC: 121,
    tournament: [
      'First player this century with 10+ completed dribbles AND 10+ chances created across his first three World Cup games (Opta).',
      '8 chances created from carries — second in the tournament only to Mbappé.',
      'Five successive high-level performances as Ivory Coast reached the knockouts.',
      'The arc is barely believable: playing semi-pro in America\'s UPSL in 2023, a nine-figure tug-of-war in 2026.',
    ],
    talking: 'The saga of the summer. He has reportedly agreed a five-year deal with PSG and spoken to Luis Enrique — but Leipzig want €120–130M, Liverpool\'s €100M offer (incl. bonuses) was rebuffed, and Leipzig now say they\'d rather keep him or loan him back. Manchester United and Manchester City are also reported in the race.',
    rumored: ['PSG', 'Liverpool', 'Manchester United', 'Manchester City'],
    scout: { name: 'Sam Okafor', region: 'West Africa & Ligue 1', initials: 'SO' },
  },
  {
    profile: P({ name: 'Ayyoub Bouaddi', age: 18, position: 'CM', club: 'Lille', league: 'Ligue 1',
      nationality: 'Morocco', marketValue: 55, contractYearsLeft: 3, passCompletionRate: 0.91,
      avgPassDistance: 13, defensiveWorkRate: 0.72, sprintCapacity: 18, avgSpeed: 6.9,
      currentPageRank: 0.3, currentConnections: 10, currentPassWeight: 0.4, avgX: -8, avgY: 2 }),
    flag: '&#127474;&#127462;', country: 'Morocco',
    preWC: 55, postWC: 86,
    tournament: [
      'The tournament\'s biggest value riser: reported estimates up ~€31M in five weeks.',
      'Most touches of any player on the pitch in the 1–1 draw with Brazil, at 18.',
      'Anchored Morocco\'s midfield to the quarterfinals with elite passing accuracy.',
    ],
    talking: 'Lille are reportedly demanding €80M+. Liverpool and Arsenal have made fresh inquiries since the tournament began — Arsenal reported "best placed" — with PSG approaching and Real Madrid monitoring without making him a priority.',
    rumored: ['Arsenal', 'Liverpool', 'PSG', 'Real Madrid'],
    scout: { name: 'Sam Okafor', region: 'West Africa & Ligue 1', initials: 'SO' },
  },
  {
    profile: P({ name: 'Johan Manzambi', age: 20, position: 'CAM', club: 'Freiburg', league: 'Bundesliga',
      nationality: 'Switzerland', marketValue: 45, contractYearsLeft: 3, passCompletionRate: 0.84,
      avgPassDistance: 12, defensiveWorkRate: 0.58, sprintCapacity: 24, avgSpeed: 7.1,
      currentPageRank: 0.27, currentConnections: 8, currentPassWeight: 0.34, avgX: 10, avgY: 4 }),
    flag: '&#127464;&#127469;', country: 'Switzerland',
    preWC: 45, postWC: 65,
    tournament: [
      '3 goals and 2 assists in four matches — youngest Swiss player ever to score a World Cup double (20y 247d).',
      'Top 50 in the tournament for progressive carries despite carrying an injury.',
      'Arrived off a 16-goal Bundesliga season and a Europa League Young Player of the Season award.',
    ],
    talking: 'Reported price talk has jumped from €55M to €70M during the tournament. Manchester United see him as a midfield-rebuild fit, Chelsea are reportedly exploring a route via sister club Strasbourg, and Newcastle — with long-standing interest — have reportedly been told they\'re at the front of the queue.',
    rumored: ['Manchester United', 'Chelsea', 'Newcastle'],
    scout: { name: 'Lars Lindqvist', region: 'Scandinavia & Bundesliga', initials: 'LL' },
  },
  {
    profile: P({ name: 'Felix Nmecha', age: 25, position: 'CM', club: 'Borussia Dortmund', league: 'Bundesliga',
      nationality: 'Germany', marketValue: 40, contractYearsLeft: 3, passCompletionRate: 0.88,
      avgPassDistance: 15, defensiveWorkRate: 0.65, sprintCapacity: 20, avgSpeed: 7.0,
      currentPageRank: 0.29, currentConnections: 9, currentPassWeight: 0.38, avgX: -2, avgY: -3 }),
    flag: '&#127465;&#127466;', country: 'Germany',
    preWC: 40, postWC: 55,
    tournament: [
      'No player at the World Cup made more line-breaking passes leading to goals (3).',
      'Germany\'s standout in an otherwise short campaign — knocked out on penalties by Paraguay in the round of 32.',
    ],
    talking: 'Manchester United and Liverpool are reported to be monitoring him. A short national-team campaign means the price hasn\'t fully inflated — yet.',
    rumored: ['Manchester United', 'Liverpool'],
    scout: { name: 'Lars Lindqvist', region: 'Scandinavia & Bundesliga', initials: 'LL' },
  },
  {
    profile: P({ name: 'Julio Enciso', age: 22, position: 'CAM', club: 'Strasbourg', league: 'Ligue 1',
      nationality: 'Paraguay', marketValue: 30, contractYearsLeft: 4, passCompletionRate: 0.81,
      avgPassDistance: 13, defensiveWorkRate: 0.5, sprintCapacity: 25, avgSpeed: 7.2,
      currentPageRank: 0.25, currentConnections: 7.5, currentPassWeight: 0.31, avgX: 12, avgY: -6 }),
    flag: '&#127477;&#127486;', country: 'Paraguay',
    preWC: 30, postWC: 42,
    tournament: [
      'Paraguay\'s spark all tournament — opened the scoring in the round of 32 against Germany, the game that sent the four-time champions home on penalties.',
      'Carried a mid-table Ligue 1 club\'s creative load into a giant-killing World Cup run.',
    ],
    talking: 'Quieter than his tournament deserves — no concrete bids reported yet. Which is precisely when a well-run club moves: before the market reprices him.',
    rumored: [],
    scout: { name: 'Marta Vidal', region: 'South America & La Liga', initials: 'MV' },
    angle: 'The window before the hype',
  },
  {
    profile: P({ name: 'Ismael Saibari', age: 24, position: 'ST', club: 'PSV Eindhoven', league: 'Eredivisie',
      nationality: 'Morocco', marketValue: 40, contractYearsLeft: 3, passCompletionRate: 0.79,
      avgPassDistance: 10, defensiveWorkRate: 0.48, sprintCapacity: 27, avgSpeed: 7.3,
      currentPageRank: 0.22, currentConnections: 6.5, currentPassWeight: 0.3, avgX: 22, avgY: 3 }),
    flag: '&#127474;&#127462;', country: 'Morocco',
    preWC: 40, postWC: 50,
    tournament: [
      'Led Morocco with 151 runs in behind and kept elite shot quality (0.17 xG per shot).',
      'Injured in the round of 16 against Canada — mid-transfer.',
    ],
    talking: 'Reported to be completing a move to Bayern Munich — agreed before the injury. The deal every rival DoF is now stress-testing: does a tournament knock change a €50M medical?',
    rumored: ['Bayern Munich'],
    scout: { name: 'Sam Okafor', region: 'West Africa & Ligue 1', initials: 'SO' },
    angle: 'The mid-deal injury',
  },
  {
    profile: P({ name: 'Elijah Just', age: 24, position: 'ST', club: 'Motherwell', league: 'Scottish Premiership',
      nationality: 'New Zealand', marketValue: 3, contractYearsLeft: 2, passCompletionRate: 0.74,
      avgPassDistance: 9, defensiveWorkRate: 0.55, sprintCapacity: 26, avgSpeed: 7.2,
      currentPageRank: 0.18, currentConnections: 5.5, currentPassWeight: 0.26, avgX: 24, avgY: -8 }),
    flag: '&#127475;&#127487;', country: 'New Zealand',
    preWC: 3, postWC: 12,
    tournament: [
      'Three group-stage goals for New Zealand — from the Scottish Premiership.',
      'Reported pre-tournament value ~€3M; suitors are now told to quadruple it.',
    ],
    talking: 'The tournament\'s cult hero — and the phone is ringing: Celtic and Rangers are now reported to be circling. Still no big-six chatter, which is exactly the window a mid-table club should be moving in.',
    rumored: [],
    scout: { name: 'Jimmy Barnes', region: 'UK & EFL', initials: 'JB' },
    angle: 'The €3M lottery ticket',
  },
  {
    profile: P({ name: 'Alex Freeman', age: 21, position: 'RB', club: 'Villarreal', league: 'La Liga',
      nationality: 'USA', marketValue: 20, contractYearsLeft: 4, passCompletionRate: 0.86,
      avgPassDistance: 14, defensiveWorkRate: 0.78, sprintCapacity: 28, avgSpeed: 7.1,
      currentPageRank: 0.24, currentConnections: 8, currentPassWeight: 0.33, avgX: -18, avgY: 20 }),
    flag: '&#127482;&#127480;', country: 'USA',
    preWC: 20, postWC: 30,
    tournament: [
      'Led the tournament in progressive passes (28) — from right back.',
      'Covered space wide, defended 1-v-1, and carried the host nation through the round of 32.',
    ],
    talking: 'No reported bids yet — host-nation breakouts historically get repriced last, after the circus leaves town.',
    rumored: [],
    scout: { name: 'Marta Vidal', region: 'South America & La Liga', initials: 'MV' },
    angle: 'The host-nation discount',
  },
];

// ─── The Crazy Files ──────────────────────────────────────────────────
// Lower-division, semi-pro and free-agent stories — the players the data
// barely covers, which is precisely where scouting bandwidth wins.

interface CrazyPlayer {
  profile: ScoutProfile;
  flag: string;
  country: string;
  status: string;        // contract-status chip
  statusHot: boolean;
  story: string[];
  engineNote: string;    // authored editorial line about what the engine can/can't see
  scout: { name: string; region: string; initials: string };
}

const CRAZY: CrazyPlayer[] = [
  {
    profile: P({ name: 'Vozinha', age: 40, position: 'GK', club: 'Unattached (last: Chaves)', league: 'Liga Portugal 2',
      nationality: 'Cape Verde', marketValue: 0.3, contractYearsLeft: 0, passCompletionRate: 0.72,
      avgPassDistance: 32, defensiveWorkRate: 0.5, sprintCapacity: 8, avgSpeed: 5.2,
      currentPageRank: 0.1, currentConnections: 4, currentPassWeight: 0.2, avgX: -48, avgY: 0 }),
    flag: '&#127464;&#127483;', country: 'Cape Verde',
    status: 'FREE AGENT — "I\'m looking for a good project"', statusHot: true,
    story: [
      'Worked as an electrician; didn\'t sign a professional contract until 26. Career route: Angola, Moldova, Cyprus, Portugal\'s second division.',
      'Seven saves in the 0–0 that held Spain in the group opener; eight more in the 3–2 extra-time epic against Argentina.',
      'Reported ~14M new Instagram followers mid-tournament. At 40, he told reporters after elimination: "At the moment I\'m a free agent and I\'m looking for a good project. I hope to find one soon."',
    ],
    engineNote: 'The engine\'s honest answer: almost no usable club data — second-division minutes, 40 years old, goalkeeper markets barely graph. This is a pure Tier 3 signing: a scout\'s eyes, a medical, and a dressing-room bet. The model\'s job here is to price the risk, not to find him.',
    scout: { name: 'Sam Okafor', region: 'West Africa & Ligue 1', initials: 'SO' },
  },
  {
    profile: P({ name: 'Sidny Lopes Cabral', age: 23, position: 'LB', club: 'Trabzonspor', league: 'Süper Lig',
      nationality: 'Cape Verde', marketValue: 8, contractYearsLeft: 4, passCompletionRate: 0.8,
      avgPassDistance: 13, defensiveWorkRate: 0.68, sprintCapacity: 27, avgSpeed: 7.1,
      currentPageRank: 0.2, currentConnections: 6.5, currentPassWeight: 0.28, avgX: -14, avgY: -24 }),
    flag: '&#127464;&#127483;', country: 'Cape Verde',
    status: 'REPORTED MOVE — Trabzonspor, off the back of the tournament', statusHot: false,
    story: [
      'The 103rd-minute equalizer against Argentina — cut inside past Mac Allister, curled into the top corner past Mart&iacute;nez — took 88.7% of the public vote for Goal of the Tournament.',
      'Rotterdam-born, developed via Benfica\'s system after a breakout at Estrela da Amadora; reports list him anywhere from left-back to left wing — which tells you how new all of this is.',
      'Eighteen months ago he was a Portuguese second-tier name. Now he has the most-watched goal on the planet.',
    ],
    engineNote: 'One golazo moved his price more than two seasons of league data. That is exactly the montage-vs-context trap from the top of this page — the engine grades him on the eighteen months, not the eight seconds.',
    scout: { name: 'Sam Okafor', region: 'West Africa & Ligue 1', initials: 'SO' },
  },
  {
    profile: P({ name: 'Pico Lopes', age: 34, position: 'CB', club: 'Shamrock Rovers', league: 'League of Ireland',
      nationality: 'Cape Verde', marketValue: 0.4, contractYearsLeft: 1, passCompletionRate: 0.84,
      avgPassDistance: 18, defensiveWorkRate: 0.75, sprintCapacity: 12, avgSpeed: 6.2,
      currentPageRank: 0.16, currentConnections: 6, currentPassWeight: 0.28, avgX: -34, avgY: 4 }),
    flag: '&#127464;&#127483;', country: 'Cape Verde',
    status: 'CONTRACTED — Shamrock Rovers (League of Ireland)', statusHot: false,
    story: [
      'Dublin-born, eligible through his father — he ignored Cape Verde\'s first call-up messages because he assumed they were spam.',
      'Ever-present through the entire run: draws with Spain, Uruguay and Saudi Arabia, then the extra-time near-miss against the world champions.',
      'Went straight from marking League of Ireland strikers to marking Lautaro Mart&iacute;nez — and held the line for 100+ minutes.',
    ],
    engineNote: 'League of Ireland tracking data essentially doesn\'t reach the public tier — the engine sees a €0.4M 34-year-old and five World Cup matches. A club that had filed ONE scout report on him in 2024 would have had this information for the price of a flight to Dublin.',
    scout: { name: 'Jimmy Barnes', region: 'UK & EFL', initials: 'JB' },
  },
  {
    profile: P({ name: 'Eloy Room', age: 37, position: 'GK', club: 'Journeyman (ex-PSV, Columbus Crew)', league: 'career: Eredivisie & MLS',
      nationality: 'Cura&ccedil;ao', marketValue: 0.5, contractYearsLeft: 0, passCompletionRate: 0.74,
      avgPassDistance: 30, defensiveWorkRate: 0.5, sprintCapacity: 8, avgSpeed: 5.1,
      currentPageRank: 0.1, currentConnections: 4, currentPassWeight: 0.2, avgX: -48, avgY: 0 }),
    flag: '&#127464;&#127484;', country: 'Cura&ccedil;ao',
    status: 'VETERAN — the smallest nation ever at a World Cup (pop. 155,000)', statusHot: false,
    story: [
      '15 saves against Ecuador — the most ever recorded in a 90-minute World Cup match — earning Cura&ccedil;ao their only point.',
      'Cura&ccedil;ao are the smallest country by population ever to reach a World Cup. Their keeper made sure they left with a number in the points column.',
      'At 37, the tournament was a farewell audition broadcast to two billion people.',
    ],
    engineNote: 'One match, fifteen data points of the only kind that matters for a keeper. The engine can\'t weight a single game — a goalkeeping coach watching the tape can, in ninety minutes.',
    scout: { name: 'Marta Vidal', region: 'South America & La Liga', initials: 'MV' },
  },
  {
    profile: P({ name: 'Orlando Gill', age: 26, position: 'GK', club: 'San Lorenzo', league: 'Liga Profesional (ARG)',
      nationality: 'Paraguay', marketValue: 4, contractYearsLeft: 2, passCompletionRate: 0.76,
      avgPassDistance: 28, defensiveWorkRate: 0.5, sprintCapacity: 9, avgSpeed: 5.4,
      currentPageRank: 0.11, currentConnections: 4.5, currentPassWeight: 0.22, avgX: -47, avgY: 0 }),
    flag: '&#127477;&#127486;', country: 'Paraguay',
    status: 'RISING — international debut only last September', statusHot: false,
    story: [
      '23 saves across the tournament — the most of any goalkeeper.',
      'Two penalty saves in the shootout that eliminated Germany in the round of 32.',
      'First capped ten months before the tournament. From San Lorenzo\'s rotation to the World Cup\'s save leaderboard.',
    ],
    engineNote: 'The rare crazy-file case with real league data behind it — Argentine Primera minutes graph well enough for Tier 1. The engine can actually underwrite this one; European moves for South American keepers in their mid-20s are historically the market\'s best GK value.',
    scout: { name: 'Marta Vidal', region: 'South America & La Liga', initials: 'MV' },
  },
  {
    profile: P({ name: 'Haissem Hassan', age: 24, position: 'RW', club: 'Real Oviedo', league: 'Segunda Divisi&oacute;n',
      nationality: 'Egypt', marketValue: 4, contractYearsLeft: 2, passCompletionRate: 0.79,
      avgPassDistance: 11, defensiveWorkRate: 0.5, sprintCapacity: 26, avgSpeed: 7.2,
      currentPageRank: 0.2, currentConnections: 6.5, currentPassWeight: 0.28, avgX: 16, avgY: 21 }),
    flag: '&#127466;&#127468;', country: 'Egypt',
    status: 'SHOP WINDOW — club relegated, price still tiny', statusHot: true,
    story: [
      'Didn\'t play a single group-stage minute. Debuted in the round of 32 against Australia and became Egypt\'s knockout-stage spark.',
      'His club, Real Oviedo, were relegated from La Liga weeks before the tournament — a knockout-stage winger priced by a relegated balance sheet.',
      'The classic distressed-asset setup: the club needs the fee more than the player.',
    ],
    engineNote: 'Relegation prices the club, not the player — the engine\'s redundancy and system-fit factors don\'t care what division his employer just fell into. Squads thin on the right flank should be running this file this week, before Segunda tape turns into La Liga tape.',
    scout: { name: 'Marta Vidal', region: 'South America & La Liga', initials: 'MV' },
  },
];

const SOURCES: { label: string; url: string }[] = [
  { label: 'ESPN — Breakout stars of the 2026 World Cup', url: 'https://www.espn.com/soccer/story/_/id/49308560/world-cup-breakout-stars-diomande-freeman-manzambi-puerta' },
  { label: 'beIN SPORTS — The 5 players who boosted their market value most', url: 'https://www.beinsports.com/en-us/soccer/fifa-world-cup-2026/articles/the-5-players-who-boosted-their-market-value-the-most-at-the-world-cup-2026-07-16' },
  { label: 'ESPN — Diomandé close to preferred PSG move', url: 'https://www.espn.com/soccer/story/_/id/49211932/yan-diomande-close-move-paris-saint-germain' },
  { label: 'This Is Anfield — PSG baulk at Leipzig fee', url: 'https://www.thisisanfield.com/2026/07/yan-diomande-transfer-psg-price-tag-liverpool-leipzig-keita/' },
  { label: 'Sofascore — WC breakouts attracting Premier League interest', url: 'https://www.sofascore.com/news/which-young-breakout-stars-have-premier-league-recruiters-attention' },
  { label: 'Football Whispers — World Cup 2026 market movers', url: 'https://footballwhispers.com/blog/world-cup-2026-market-movers/' },
  { label: 'GiveMeSport — Why post-tournament transfers are risky business', url: 'https://www.givemesport.com/why-post-international-tournament-transfers-risk-soccer/' },
  { label: 'FIFA — Superstars shining at the 2026 World Cup', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/superstars-shining' },
  { label: 'beIN SPORTS — Vozinha: from electrician to Cape Verde hero', url: 'https://www.beinsports.com/en-us/soccer/fifa-world-cup-2026/articles/the-inspiring-story-of-vozinha-from-working-as-an-electrician-to-becoming-cape-verde-s-hero-at-the-2026-fifa-world-cup-2026-07-05' },
  { label: 'beIN SPORTS — Vozinha hopes to find a new team after the World Cup', url: 'https://www.beinsports.com/en-us/soccer/fifa-world-cup-2026/articles/vozinha-hopes-to-find-a-new-team-after-the-world-cup-2026-07-18' },
  { label: 'ESPN — Cape Verde GK Vozinha stopped Spain, gained 14M followers', url: 'https://www.espn.com/soccer/story/_/id/49074487/cape-verde-gk-vozinha-stopped-world-cup-favourites-spain-gained-14m-followers' },
  { label: 'FIFA — Sidny Lopes Cabral voted Round of 32\'s best goal', url: 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/sidny-lopes-cabral-cabo-verde-round-of-32-best-goal' },
  { label: 'beIN SPORTS — Who is Sidny Lopes Cabral?', url: 'https://www.beinsports.com/en-us/soccer/fifa-world-cup-2026/articles/who-is-sidny-lopes-cabral-cape-verde-s-breakout-star-at-the-2026-world-cup-2026-07-03' },
  { label: 'Planet Football — Top 10 cult heroes of the 2026 World Cup', url: 'https://www.planetfootball.com/lists-and-rankings/world-cup-2026-cult-hero-ranking' },
  { label: 'NBC Sports — Lesser-known players making waves', url: 'https://www.nbcsports.com/soccer/news/the-lesser-known-players-making-waves-at-the-2026-world-cup-so-far' },
];

// ─── Engine pass ──────────────────────────────────────────────────────

interface FitRow { team: string; multiplier: number; contextValue: number; why: string; }

function esc(s: string): string {
  return s.replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function computeFits(p: WCPlayer, teams: ReturnType<typeof getTeamDatabase>) {
  const vec = scoutProfileToVector(p.profile);
  const all = teams
    .map(t => {
      const v = computeEnhancedValuation(vec, t);
      const top = v.factors.slice().sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
      return {
        team: t.name,
        multiplier: v.multiplier,
        contextValue: v.contextValue,
        why: top ? top.explanation : '',
      } as FitRow;
    })
    .sort((a, b) => b.multiplier - a.multiplier);
  const best = all.filter(r => r.team !== p.profile.club).slice(0, 3);
  const rumored = p.rumored
    .map(name => all.find(r => r.team === name))
    .filter((r): r is FitRow => !!r);
  return { best, rumored };
}

function verdictLine(p: WCPlayer, best: FitRow[], rumored: FitRow[]): string {
  const hype = Math.round((p.postWC / p.preWC - 1) * 100);
  const top = best[0];
  if (rumored.length === 0) {
    return `No reported suitors, a +${hype}% tournament repricing, and the engine still finds ` +
      `${top.multiplier.toFixed(2)}x contexts. This is the file a scouting desk opens <em>before</em> the market does.`;
  }
  // rumored[0] is the primary reported destination — anchor the verdict there.
  const primary = rumored[0];
  const inTop = best.some(b => b.team === primary.team);
  if (inTop) {
    return `The rumor mill and the engine agree: ${esc(primary.team)} is a top-3 structural fit (${primary.multiplier.toFixed(2)}x). ` +
      `The open question is the +${hype}% tournament premium — fit covers hype here only if the fee stays near pre-tournament value.`;
  }
  return `The engine's best contexts (${best.map(b => esc(b.team)).join(', ')}) are NOT the clubs in the headlines. ` +
    `${esc(primary.team)} rates ${primary.multiplier.toFixed(2)}x vs ${top.multiplier.toFixed(2)}x at ${esc(top.team)} — ` +
    `a +${hype}% premium on top of a weaker fit is how tournament transfers go wrong.`;
}

// ─── Page ─────────────────────────────────────────────────────────────

function playerCard(p: WCPlayer, teams: ReturnType<typeof getTeamDatabase>): string {
  const { best, rumored } = computeFits(p, teams);
  const hype = Math.round((p.postWC / p.preWC - 1) * 100);

  const fitRow = (r: FitRow, tag?: string) =>
    `<div class="fit-row">
      <span class="fit-club">${esc(r.team)}${tag ? ' <span class="fit-tag">' + tag + '</span>' : ''}</span>
      <span class="fit-bar"><i style="width:${Math.min(100, Math.round((r.multiplier - 0.6) / 0.9 * 100))}%"></i></span>
      <span class="fit-mult ${r.multiplier >= 1.15 ? 'g' : r.multiplier < 0.9 ? 'r' : ''}">${r.multiplier.toFixed(2)}x</span>
      <span class="fit-val">&euro;${r.contextValue}M</span>
    </div>`;

  const rumoredNames = new Set(rumored.map(r => r.team));

  return `
  <article class="wc-card">
    <div class="wc-head">
      <div>
        <div class="wc-name">${p.flag} ${esc(p.profile.name)}</div>
        <div class="wc-meta">${p.profile.position} · ${p.profile.age} · ${esc(p.profile.club)} (${esc(p.profile.league)}) · ${esc(p.country)}</div>
      </div>
      <div class="wc-values">
        <span class="val-chip">pre-WC &euro;${p.preWC}M</span>
        <span class="val-arrow">&rarr;</span>
        <span class="val-chip hot">talk &euro;${p.postWC}M <b>+${hype}%</b></span>
      </div>
    </div>
    ${p.angle ? `<div class="wc-angle">${esc(p.angle)}</div>` : ''}
    <div class="wc-cols">
      <div class="wc-col">
        <h4>&#127942; The tournament</h4>
        <ul>${p.tournament.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <h4>&#128227; Who's talking</h4>
        <p class="wc-talking">${esc(p.talking)}</p>
        <div class="wc-scout">
          <span class="scout-avatar">${p.scout.initials}</span>
          <span><strong>Who should scout them:</strong> ${esc(p.scout.name)} — ${esc(p.scout.region)}.
          <a href="enterprise.html">File the Tier&nbsp;3 report &rarr;</a></span>
        </div>
      </div>
      <div class="wc-col engine">
        <h4>&#9881;&#65039; What the engine says <span class="engine-note">(context value on pre-WC &euro;${p.preWC}M)</span></h4>
        <div class="fit-label">Best structural fits, all 30 clubs</div>
        ${best.map(r => fitRow(r, rumoredNames.has(r.team) ? 'also rumored' : undefined)).join('')}
        ${rumored.filter(r => !best.some(b => b.team === r.team)).length > 0 ? `
        <div class="fit-label" style="margin-top:0.6rem">The clubs in the headlines</div>
        ${rumored.filter(r => !best.some(b => b.team === r.team)).map(r => fitRow(r)).join('')}` : ''}
        <div class="wc-verdict"><span class="v-label">Fit vs hype</span> ${verdictLine(p, best, rumored)}</div>
      </div>
    </div>
  </article>`;
}

function crazyCard(p: CrazyPlayer, teams: ReturnType<typeof getTeamDatabase>): string {
  const vec = scoutProfileToVector(p.profile);
  const fits = teams
    .map(t => ({ t, v: computeEnhancedValuation(vec, t) }))
    .sort((a, b) => b.v.multiplier - a.v.multiplier);
  const best = fits[0];
  const conf = Math.round(best.v.confidence * 100);

  return `
  <article class="crazy-card">
    <div class="wc-head">
      <div>
        <div class="wc-name">${p.flag} ${esc(p.profile.name)}</div>
        <div class="wc-meta">${p.profile.position} · ${p.profile.age} · ${p.profile.club} (${p.profile.league}) · ${p.country}</div>
      </div>
      <span class="status-pill${p.statusHot ? ' hot' : ''}">${p.status}</span>
    </div>
    <ul class="crazy-story">${p.story.map(s => `<li>${s}</li>`).join('')}</ul>
    <div class="crazy-engine">
      <span class="ce-label">&#9881;&#65039; Engine check</span>
      best structural fit <strong>${esc(best.t.name)}</strong> at <strong>${best.v.multiplier.toFixed(2)}x</strong>
      (&euro;${best.v.contextValue}M on a &euro;${p.profile.marketValue}M base) &middot; data confidence <strong>${conf}%</strong>.
      ${p.engineNote}
    </div>
    <div class="wc-scout">
      <span class="scout-avatar">${p.scout.initials}</span>
      <span><strong>Who should scout them:</strong> ${esc(p.scout.name)} — ${esc(p.scout.region)}.
      <a href="enterprise.html">File the Tier&nbsp;3 report &rarr;</a></span>
    </div>
  </article>`;
}

async function main() {
  const teams = getTeamDatabase();
  const cards = FEATURED.map(p => playerCard(p, teams)).join('\n');
  const crazyCards = CRAZY.map(p => crazyCard(p, teams)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>World Cup 2026 Special — PitchIntel</title>
<meta name="description" content="The World Cup is football's most expensive shop window. Eight breakout stars: what the market says, what the rumors say, and what the engine says.">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#06080c;--bg2:#0d1117;--card:#111827;--border:#1a2236;--border-light:#243049;
--text:#c8d4e0;--text-dim:#6b7d94;--text-bright:#e8eef4;--accent:#00b4ff;--accent-dim:rgba(0,180,255,0.15);
--green:#00e88a;--green-dim:rgba(0,232,138,0.15);--red:#ff3860;--red-dim:rgba(255,56,96,0.12);
--gold:#ffb800;--gold-dim:rgba(255,184,0,0.12);--font:'Inter',system-ui,-apple-system,sans-serif}
html{font-size:15px;scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--font);line-height:1.6}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1000px;margin:0 auto;padding:0 1.25rem}
header{position:sticky;top:0;z-index:100;background:rgba(6,8,12,0.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
.header-inner{max-width:1000px;margin:0 auto;padding:0 1.25rem;display:flex;align-items:center;justify-content:space-between;height:60px}
.logo{font-size:1.3rem;font-weight:800}.logo .p{color:var(--text-bright)}.logo .i{color:var(--accent)}
.wc-chip{margin-left:0.6rem;padding:0.15rem 0.6rem;border-radius:999px;background:var(--gold-dim);color:var(--gold);font-size:0.65rem;font-weight:800;letter-spacing:1px;vertical-align:middle}
nav{display:flex;gap:1.25rem;font-size:0.9rem;font-weight:600}
nav a{color:var(--text-dim)}nav a:hover{color:var(--text-bright);text-decoration:none}
.hero{padding:4rem 0 2.5rem;text-align:center;background:radial-gradient(ellipse 70% 60% at 50% -10%,rgba(255,184,0,0.12),transparent)}
.hero .kicker{color:var(--gold);font-weight:800;letter-spacing:2px;font-size:0.8rem;text-transform:uppercase}
.hero h1{font-size:clamp(1.9rem,5vw,3rem);font-weight:900;letter-spacing:-1px;color:var(--text-bright);margin:0.6rem auto 1rem;max-width:760px;line-height:1.15}
.hero p{color:var(--text-dim);max-width:640px;margin:0 auto;font-size:1.05rem}
.thesis{max-width:820px;margin:2rem auto 0;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:1.4rem 1.6rem;text-align:left;font-size:0.95rem}
.thesis strong{color:var(--gold)}
.thesis .warn{color:var(--text-dim);font-size:0.88rem;margin-top:0.6rem}
.wc-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:1.5rem 1.6rem;margin-bottom:1.4rem}
.wc-head{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:baseline}
.wc-name{font-size:1.3rem;font-weight:800;color:var(--text-bright)}
.wc-meta{color:var(--text-dim);font-size:0.85rem}
.wc-values{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap}
.val-chip{background:var(--bg2);border:1px solid var(--border);border-radius:999px;padding:0.25rem 0.8rem;font-size:0.82rem;font-weight:700;color:var(--text)}
.val-chip.hot{border-color:var(--gold);color:var(--gold)}
.val-chip b{font-weight:800}
.val-arrow{color:var(--text-dim)}
.wc-angle{display:inline-block;margin-top:0.6rem;background:var(--gold-dim);color:var(--gold);font-size:0.72rem;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;padding:0.2rem 0.7rem;border-radius:999px}
.wc-cols{display:grid;grid-template-columns:1fr 1.1fr;gap:1.6rem;margin-top:1.1rem}
@media(max-width:820px){.wc-cols{grid-template-columns:1fr}}
.wc-col h4{font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-bright);margin:0.9rem 0 0.5rem}
.wc-col h4:first-child{margin-top:0}
.wc-col ul{padding-left:1.1rem;font-size:0.88rem;color:var(--text)}
.wc-col li{margin-bottom:0.35rem}
.wc-talking{font-size:0.88rem;color:var(--text)}
.wc-scout{display:flex;gap:0.6rem;align-items:flex-start;margin-top:0.9rem;font-size:0.85rem;background:var(--bg2);border-radius:10px;padding:0.7rem 0.9rem}
.scout-avatar{width:28px;height:28px;border-radius:50%;background:var(--accent-dim);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.72rem;flex-shrink:0}
.wc-col.engine{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem}
.engine-note{font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-dim);font-size:0.75rem}
.fit-label{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.8px;color:var(--text-dim);margin-bottom:0.35rem}
.fit-row{display:flex;align-items:center;gap:0.7rem;padding:0.28rem 0;font-size:0.88rem}
.fit-club{width:11.5rem;flex-shrink:0;font-weight:600;color:var(--text-bright)}
.fit-tag{font-size:0.62rem;font-weight:800;color:var(--gold);background:var(--gold-dim);border-radius:999px;padding:0.08rem 0.45rem;letter-spacing:0.4px;text-transform:uppercase}
.fit-bar{flex:1;height:7px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden}
.fit-bar i{display:block;height:100%;background:var(--accent);border-radius:4px}
.fit-mult{width:3.4rem;text-align:right;font-weight:800;font-variant-numeric:tabular-nums}
.fit-mult.g{color:var(--green)}.fit-mult.r{color:var(--red)}
.fit-val{width:4.2rem;text-align:right;color:var(--text-dim);font-variant-numeric:tabular-nums;font-size:0.82rem}
.wc-verdict{margin-top:0.9rem;border-top:1px dashed var(--border);padding-top:0.8rem;font-size:0.88rem}
.wc-verdict .v-label{display:inline-block;background:var(--gold-dim);color:var(--gold);font-size:0.64rem;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;padding:0.14rem 0.5rem;border-radius:999px;margin-right:0.4rem}
.crazy-section{margin-top:3rem;border-top:1px solid var(--border);background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(255,56,96,0.07),transparent);padding:3rem 0 1rem}
.crazy-head{max-width:760px;margin:0 auto 2rem;text-align:center}
.crazy-head .kicker{color:var(--red);font-weight:800;letter-spacing:2px;font-size:0.8rem;text-transform:uppercase}
.crazy-head h2{font-size:clamp(1.5rem,4vw,2.2rem);font-weight:900;color:var(--text-bright);letter-spacing:-0.5px;margin:0.5rem 0 0.8rem}
.crazy-head p{color:var(--text-dim);font-size:0.95rem;text-align:left}
.crazy-head p strong{color:var(--text)}
.crazy-card{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--red);border-radius:14px;padding:1.4rem 1.6rem;margin-bottom:1.2rem}
.status-pill{font-size:0.72rem;font-weight:800;letter-spacing:0.5px;padding:0.28rem 0.8rem;border-radius:999px;background:var(--bg2);border:1px solid var(--border-light);color:var(--text);max-width:100%}
.status-pill.hot{border-color:var(--red);color:var(--red);background:var(--red-dim)}
.crazy-story{padding-left:1.1rem;font-size:0.9rem;margin:0.9rem 0}
.crazy-story li{margin-bottom:0.4rem}
.crazy-engine{background:var(--bg2);border-radius:10px;padding:0.8rem 1rem;font-size:0.86rem;color:var(--text)}
.crazy-engine .ce-label{display:inline-block;background:var(--accent-dim);color:var(--accent);font-size:0.64rem;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;padding:0.14rem 0.5rem;border-radius:999px;margin-right:0.4rem}
.crazy-card .wc-scout{margin-top:0.8rem}
.cta-strip{background:linear-gradient(180deg,transparent,rgba(0,180,255,0.06));border-top:1px solid var(--border);text-align:center;padding:3rem 0;margin-top:2.5rem}
.cta-strip h2{color:var(--text-bright);font-size:1.5rem;font-weight:800;margin-bottom:0.5rem}
.cta-strip p{color:var(--text-dim);max-width:560px;margin:0 auto 1.4rem}
.btn{display:inline-block;background:var(--accent);color:#fff !important;padding:0.65rem 1.5rem;border-radius:8px;font-weight:700;margin:0 0.4rem}
.btn:hover{opacity:0.9;text-decoration:none !important}
.btn.gold{background:var(--gold);color:#06080c !important}
footer{border-top:1px solid var(--border);padding:2rem 0 3rem;color:var(--text-dim);font-size:0.78rem;line-height:1.8}
.sources{margin-top:0.8rem}
.sources a{display:block}
</style>
</head>
<body>

<header>
  <div class="header-inner">
    <div class="logo"><span class="p">Pitch</span><span class="i">Intel</span><span class="wc-chip">&#127942; WC 2026</span></div>
    <nav>
      <a href="#crazy" style="color:var(--red)">The Crazy Files</a>
      <a href="index.html">Home</a>
      <a href="app.html">App</a>
      <a href="how-it-works.html">How it works</a>
      <a href="enterprise.html">For clubs</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="wrap">
    <div class="kicker">World Cup 2026 Special &middot; published on final day</div>
    <h1>The world's most expensive shop window</h1>
    <p>Argentina vs Spain tonight. Messi leads the Golden Boot on eight. And thirty-plus tournament names are already in this summer's transfer dossiers. Here's what the market says, what the rumors say — and what the engine says.</p>
    <div class="thesis">
      <strong>The tournament question every DoF gets wrong:</strong> did the World Cup reveal new information about a player, or did it just make the same information more expensive?
      A scout gets at most eight matches of evidence. Post-tournament fees routinely price in the hype anyway.
      <div class="warn">The standing warning: six goals in 2014 bought James Rodr&iacute;guez a ~&pound;63M move to Real Madrid — and a loan exit within three years. PitchIntel scores the <em>context</em>, not the montage: every player below is valued against all 30 clubs on pre-tournament data, so you can see exactly where fit covers the premium — and where it doesn't.</div>
    </div>
  </div>
</section>

<main class="wrap" style="padding-top:2rem">
${cards}
</main>

<section id="crazy" class="crazy-section">
  <div class="wrap">
    <div class="crazy-head">
      <div class="kicker">The Crazy Files</div>
      <h2>From spam-folder call-ups to the world stage</h2>
      <p>Cape Verde — smallest country by land ever at a World Cup — drew with Spain, drew with Uruguay, and took the champions to the 103rd minute. Cura&ccedil;ao brought 155,000 people's worth of nation and left with a point. These squads are stocked from second divisions, the League of Ireland, and free agency — players the data economy barely covers. <strong>For the stars above, the tournament added hype to good data. For these players, the tournament IS the data.</strong> That asymmetry is the whole scouting opportunity.</p>
    </div>
    ${crazyCards}
  </div>
</section>

<section class="cta-strip">
  <div class="wrap">
    <h2>Run the numbers yourself</h2>
    <p>Every valuation above came from the live engine. Point it at your club — or open the scouting-department demo and file the Tier 3 report on any of these players.</p>
    <a class="btn" href="app.html">Open the app</a>
    <a class="btn gold" href="enterprise.html">Enterprise demo</a>
  </div>
</section>

<footer>
  <div class="wrap">
    <strong>About this page.</strong> Market values and transfer interest are media reports as of July 19, 2026 (converted, approximate), attributed below — PitchIntel makes no claims about any negotiation. Engine valuations are illustrative, computed on authored public-data profiles against our curated 30-club database. Player profiles here use Tier 1 (public) data only — the whole point: this is what the engine sees <em>before</em> a scout ever files a report.
    <div class="sources"><strong>Sources:</strong>
      ${SOURCES.map(s => `<a href="${s.url}" rel="noopener">${esc(s.label)}</a>`).join('\n      ')}
    </div>
    Contact: <a href="mailto:kunal@generativeducation.com">kunal@generativeducation.com</a>
  </div>
</footer>

</body>
</html>`;

  const outPath = join(dirname(fileURLToPath(import.meta.url)), 'pitchintel-worldcup.html');
  writeFileSync(outPath, html, 'utf-8');
  console.log(`Written to ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);

  // Build-time sanity: print each player's top fit so the editorial claims track the engine.
  for (const p of FEATURED) {
    const { best } = computeFits(p, teams);
    console.log(`  ${p.profile.name}: best fit ${best[0].team} ${best[0].multiplier}x (€${best[0].contextValue}M)`);
  }
}

main();
