/**
 * PitchIntel Women — frontier-player corpus.
 *
 * Structured distillation of intel/2026-08-02-frontier-players.md into the
 * engine's native PlayerVector format. The rule of the corpus: a dimension is
 * populated ONLY where public evidence supports at least an estimate, and
 * every dossier records what is sourced vs estimated. Missing dimensions are
 * left undefined on purpose — the valuation engine's confidence score is the
 * honest measure of how little we know, and the gap list is the scouting
 * task list.
 *
 * Market values: Soccerdonna assigns no values in most of these regions, so
 * marketValue is an authored estimate anchored to reported fees for
 * comparable moves (Kundananji €735K, Martínez $950K, Mukoma/Bélem-class
 * signings) unless an actual fee is on record.
 */

import type { PlayerVector } from '../../player-vector.js';

export type DataFootprint = 'partial' | 'desert';

export interface WomensDossier {
  vector: PlayerVector;
  country: string;
  flag: string;
  footprint: DataFootprint;
  asOf: string; // research snapshot date (YYYY-MM-DD)
  story: string;
  dataNotes: string; // what is sourced vs estimated
  sources: string[];
}

const AS_OF = '2026-08-02';

export function getWomensFrontier(): WomensDossier[] {
  return [
    {
      vector: {
        name: 'Claudia Martínez', age: 18, position: 'ST',
        club: 'Washington Spirit', league: 'NWSL', nationality: 'Paraguay',
        marketValue: 0.95, contractYearsLeft: 2,
        xGper90: 0.62, goalsMinusXG: 0.15, shotsOnTargetPct: 0.48,
        shotsFromInsideBoxPct: 0.72, dribblesPer90: 1.8,
        sprintsPerMatch: 22, topSpeed: 31,
      },
      country: 'Paraguay', flag: '🇵🇾', footprint: 'partial', asOf: AS_OF,
      story: 'The benchmark: joint top scorer at Copa América 2025 at 17 (youngest scorer and youngest hat-trick in tournament history), bought out of the Paraguayan league by Washington Spirit in Jan 2026 for $950K — a top-10 fee in women\'s football history, from a league with no public stats.',
      dataNotes: 'Fee and tournament record sourced; marketValue = actual fee. Attacking dims are estimates from Copa América footage and reported goal tallies — no league event data exists for Paraguay.',
      sources: [
        'https://www.espn.com/soccer/story/_/id/47672271/washington-spirit-sign-paraguay-star-teen-claudia-martinez-olimpia-source',
        'https://copaamerica.com/en/news/claudia-martinez-youngest-goalscorer-copa-america-femenina',
      ],
    },
    {
      vector: {
        name: 'Hasnath Ubamba', age: 20, position: 'RW',
        club: 'Madrid CFF', league: 'Liga F', nationality: 'Tanzania',
        marketValue: 0.15, contractYearsLeft: 3,
        keyPassesPer90: 1.4, goalCreatingActionsPer90: 0.9,
        dribblesPer90: 3.2, dribbleSuccessRate: 0.55, crossesPer90: 3.0,
        sprintsPerMatch: 26, topSpeed: 32,
      },
      country: 'Tanzania', flag: '🇹🇿', footprint: 'partial', asOf: AS_OF,
      story: 'A frontier crossing in real time: 49 goal involvements in two years at FC Masar in Egypt, signed by Madrid CFF in July 2026 — the same club that developed and sold Racheal Kundananji for a world record. At WAFCON 2026 with Tanzania right now.',
      dataNotes: 'Move and goal-involvement total sourced. Per-90 dims are estimates from the aggregate (Egyptian league event data is minimal); marketValue estimated. Liga F play from autumn 2026 will make her data-rich fast.',
      sources: [
        'https://wosoworld.news.blog/2026/07/06/fc-masar-officially-announce-hasnath-ubamba-departure-to-madrid-cff/',
        'https://www.thecutback.com/p/wafcon-players-to-watch',
        'https://www.sofascore.com/football/player/hasnath-ubamba/1416908',
      ],
    },
    {
      vector: {
        name: 'Clara Luvanga', age: 21, position: 'ST',
        club: 'Al Nassr', league: 'Saudi Women\'s Premier League', nationality: 'Tanzania',
        marketValue: 0.2, contractYearsLeft: 1,
        xGper90: 0.95, goalsMinusXG: 0.4, shotsOnTargetPct: 0.5,
        shotsFromInsideBoxPct: 0.78, sprintsPerMatch: 20, topSpeed: 30,
      },
      country: 'Tanzania', flag: '🇹🇿', footprint: 'partial', asOf: AS_OF,
      story: '24 goals in 1,260 league minutes for Al Nassr — a goal every 52 minutes — in a league with almost no public advanced stats. Regarded as the most promising talent of Tanzania\'s generation; recalled for the WAFCON finals.',
      dataNotes: 'Goal/minute tallies from aggregator data (soccerzz); shooting dims are estimates from those tallies, unadjusted for Saudi WPL strength — league-quality correction is the key open question a video session would answer. marketValue estimated.',
      sources: [
        'https://www.soccerzz.com/player/clara-luvanga/1011678',
        'https://www.thecitizen.co.tz/tanzania/sports/football/twiga-stars-turn-to-saudi-based-star-clara-for-wafcon-finals-masaka-out-5501932',
      ],
    },
    {
      vector: {
        name: 'Faith Chinzimu', age: 19, position: 'CM',
        club: 'BK Häcken', league: 'Damallsvenskan', nationality: 'Malawi',
        marketValue: 0.1, contractYearsLeft: 2,
        passCompletionShort: 0.88, passCompletionMedium: 0.83, passCompletionLong: 0.65,
        progressivePassesPer90: 4.5, keyPassesPer90: 1.1, avgPassDistance: 14,
        tacklesPer90: 2.2, interceptionsPer90: 1.3, pressuresPer90: 18,
        sprintsPerMatch: 19,
      },
      country: 'Malawi', flag: '🇲🇼', footprint: 'partial', asOf: AS_OF,
      story: 'Scored both qualifying goals that sent Malawi to its first-ever WAFCON, then earned a first pro contract at BK Häcken (Aug 2025), where she has already won the Damallsvenskan and the UEFA Europa Cup. The next player on the Sweden bridge that produced both Chawingas.',
      dataNotes: 'Career facts sourced. Swedish league data exists, so passing/defending dims are informed estimates — the strongest Tier-1 base in the desert cohort. Her Malawi record is match-report only. marketValue estimated.',
      sources: [
        'https://www.espn.com/espn/story/_/id/49445166/women-africa-cup-nations-20-potential-wafcon-breakout-stars-wonderkids-watch',
        'https://www.thecutback.com/p/wafcon-players-to-watch',
      ],
    },
    {
      vector: {
        name: 'Fridah Mukoma', age: 19, position: 'ST',
        club: 'Kansas City Current (loan: Beijing Jingtan)', league: 'NWSL / Chinese WSL', nationality: 'Zambia',
        marketValue: 0.15, contractYearsLeft: 2,
        xGper90: 0.7, sprintsPerMatch: 24, topSpeed: 31,
      },
      country: 'Zambia', flag: '🇿🇲', footprint: 'desert', asOf: AS_OF,
      story: 'Signed by KC Current at 18 straight from ZESCO Ndola Girls — the fifth Zambian in the NWSL, following the Banda/Kundananji pipeline. Loaned to Beijing Jingtan, where she opened with a brace including a bicycle kick. Zambian FA Young Player of the Year; at WAFCON 2026.',
      dataNotes: 'Signing and award facts sourced. Zambian league is match-report-only; Chinese loan stats partial (5 goals in 4 games per Zambian outlet — tiny sample, xG dim is a rough estimate). marketValue estimated.',
      sources: [
        'https://kcsoccerjournal.com/03/19/2025/kc-current-sign-18-year-old-forward-fridah-mukoma/',
        'https://zambianfootball.co.zm/video-%F0%9F%93%B9-fridah-mukoma-nets-brace/',
      ],
    },
    {
      vector: {
        name: 'Doris Boaduwaa', age: 24, position: 'ST',
        club: 'Hapoel Jerusalem', league: 'Israeli WPL', nationality: 'Ghana',
        marketValue: 0.1, contractYearsLeft: 1,
        xGper90: 0.6, shotsOnTargetPct: 0.45, sprintsPerMatch: 23,
      },
      country: 'Ghana', flag: '🇬🇭', footprint: 'desert', asOf: AS_OF,
      story: 'Four goals in WAFCON qualifying including a hat-trick against Egypt, a hat-trick in Ghana\'s final pre-tournament friendly, and a goal in the WAFCON 2026 opener this week. GFA Women\'s Footballer of the Year. Her coach predicts she could be the tournament\'s top scorer.',
      dataNotes: 'Goals and award sourced from match reports — Serbian and Israeli league stats are patchy, so per-90 dims are estimates from international footage. Age is an estimate (not reliably published). marketValue estimated.',
      sources: [
        'https://www.soccerway.com/news/soccer-africa-cup-of-nations-women-boaduwaa-hat-trick-fires-black-queens-into-2026-wafcon-after-aggregate-win-over-egypt/8x8xWV6U',
        'https://www.espn.com/espn/story/_/id/49485111/wafcon-2026-july-29-wrap-ghana-debutants-cape-verde-2-0-cameroon-beat-mali-2-1',
        'https://monikstvonline.com/2025/06/15/atebubu-born-doris-boaduwaa-wins-female-footballer-of-the-year-at-gfa/',
      ],
    },
    {
      vector: {
        name: 'Sanaâ Mssoudy', age: 26, position: 'CAM',
        club: 'AS FAR', league: 'Moroccan D1', nationality: 'Morocco',
        marketValue: 0.15, contractYearsLeft: 1,
        keyPassesPer90: 1.8, dribblesPer90: 2.6, dribbleSuccessRate: 0.6,
        passCompletionShort: 0.86,
      },
      country: 'Morocco', flag: '🇲🇦', footprint: 'desert', asOf: AS_OF,
      story: '"Arguably Africa\'s best player based on the continent." Best Player of the 2024 CAF Women\'s Champions League, playing WAFCON 2026 at home. The definitive test case: an elite, proven continental player with essentially no club-level public data.',
      dataNotes: 'Awards sourced from CAF. The four populated dims are estimates from CAF Champions League footage; Moroccan D1 has no public stats. No reported transfer interest found — which is itself signal. marketValue estimated.',
      sources: [
        'https://www.cafonline.com/caf-womens-champions-league/news/caf-womens-champions-league-morocco-2024-mssoudy-el-madani-emad-rewarded/',
        'https://www.thecutback.com/p/wafcon-players-to-watch',
      ],
    },
    {
      vector: {
        name: 'Habiba Essam', age: 18, position: 'ST',
        club: 'Al Ahly', league: 'Egyptian WPL', nationality: 'Egypt',
        marketValue: 0.05, contractYearsLeft: 2,
      },
      country: 'Egypt', flag: '🇪🇬', footprint: 'desert', asOf: AS_OF,
      story: 'Signed a three-year contract reportedly worth over one million Egyptian pounds at age 17 — notable money for African domestic women\'s football. In Egypt\'s WAFCON squad.',
      dataNotes: 'Contract report sourced (ESPN, single outlet). Zero public performance data — identity dims only. This dossier is a research assignment, not a valuation.',
      sources: [
        'https://www.espn.com/espn/story/_/id/49445166/women-africa-cup-nations-20-potential-wafcon-breakout-stars-wonderkids-watch',
      ],
    },
    {
      vector: {
        name: 'Aissatou Fall', age: 19, position: 'CB',
        club: 'Aigles de la Médina', league: 'Senegalese D1', nationality: 'Senegal',
        marketValue: 0.05, contractYearsLeft: 1,
      },
      country: 'Senegal', flag: '🇸🇳', footprint: 'desert', asOf: AS_OF,
      story: 'Played every minute of the previous WAFCON at 17. ESPN flags this tournament as her potential launching pad for a European move. The classic zero-data, high-upside profile — exactly the player the corpus exists for.',
      dataNotes: 'Tournament participation sourced. Senegalese league has no public stats: identity dims only. WAFCON 2026 matches (being played now) are the first fully-broadcast footage of her career — a live research window.',
      sources: [
        'https://www.espn.com/espn/story/_/id/49445166/women-africa-cup-nations-20-potential-wafcon-breakout-stars-wonderkids-watch',
      ],
    },
  ];
}
