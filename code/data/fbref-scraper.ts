/**
 * FBRef Scraper
 *
 * Fetches player/team stats from fbref.com and extracts structured data.
 * Includes rate limiting (3 second delay between requests) and caching.
 * Falls back to cached data if scraping fails.
 *
 * FBRef HTML tables use `data-stat` attributes on <td> elements, which
 * makes regex extraction reliable without a DOM library.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

const CACHE_DIR = join(process.cwd(), 'src', 'pitch-intel', 'data', 'cache');
const RATE_LIMIT_MS = 3000; // 3 seconds between requests (be respectful)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Interfaces ─────────────────────────────────────────────

interface FBRefPlayerStats {
  name: string;
  team: string;
  position: string;
  age: number;
  matchesPlayed: number;
  minutes: number;
  goals: number;
  assists: number;
  passCompletion: number;       // percentage 0-100
  progressivePasses: number;    // per 90
  progressiveCarries: number;   // per 90
  tackles: number;              // per 90
  interceptions: number;        // per 90
  pressures: number;            // per 90
  pressureSuccessRate: number;  // percentage
  touches: number;              // per 90
  touchesDefThird: number;      // percentage in def third
  touchesMidThird: number;      // percentage in mid third
  touchesAttThird: number;      // percentage in att third
}

interface FBRefTeamStats {
  team: string;
  league: string;
  possession: number;           // average %
  passCompletion: number;       // team average %
  ppda: number;                 // passes per defensive action (lower = more pressing)
  goalsFor: number;
  goalsAgainst: number;
  xG: number;
  xGA: number;
}

// ─── League URL Map ─────────────────────────────────────────

const LEAGUE_IDS: Record<string, { id: number; slug: string }> = {
  'premier-league':  { id: 9,  slug: 'Premier-League-Stats' },
  'la-liga':         { id: 12, slug: 'La-Liga-Stats' },
  'serie-a':         { id: 11, slug: 'Serie-A-Stats' },
  'bundesliga':      { id: 20, slug: 'Bundesliga-Stats' },
  'ligue-1':         { id: 13, slug: 'Ligue-1-Stats' },
};

// ─── Rate Limiting ──────────────────────────────────────────

let lastRequestTime = 0;

async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    const delay = RATE_LIMIT_MS - elapsed;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

// ─── Cache Utilities ────────────────────────────────────────

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCachePath(cacheKey: string): string {
  // Sanitize cache key to a safe filename
  const safeKey = cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(CACHE_DIR, `${safeKey}.html`);
}

function isCacheValid(cachePath: string): boolean {
  if (!existsSync(cachePath)) return false;
  try {
    const stats = statSync(cachePath);
    const ageMs = Date.now() - stats.mtimeMs;
    return ageMs < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

// ─── Core Fetch ─────────────────────────────────────────────

/**
 * Fetches a URL with caching and rate limiting.
 *
 * - Returns cached version if available and < 7 days old.
 * - Respects the 3-second rate limit between requests.
 * - Falls back to stale cache if the live fetch fails.
 */
async function fetchWithCache(url: string, cacheKey: string): Promise<string> {
  ensureCacheDir();
  const cachePath = getCachePath(cacheKey);

  // Return fresh cache if available
  if (isCacheValid(cachePath)) {
    return readFileSync(cachePath, 'utf-8');
  }

  // Attempt live fetch
  try {
    await respectRateLimit();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PitchIntel/1.0 (research; rate-limited; cached)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Cache the result
    writeFileSync(cachePath, html, 'utf-8');

    return html;
  } catch (error) {
    // Fall back to stale cache if it exists
    if (existsSync(cachePath)) {
      console.warn(
        `[fbref-scraper] Live fetch failed for "${cacheKey}", using stale cache. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      return readFileSync(cachePath, 'utf-8');
    }

    throw new Error(
      `[fbref-scraper] Failed to fetch "${url}" and no cache available: ` +
      `${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── HTML Parsing Utilities ─────────────────────────────────

/**
 * Extracts the value of a specific data-stat cell from a table row.
 * Handles cells that contain <a> tags (returns inner text) or plain text.
 */
function extractDataStat(rowHtml: string, stat: string): string {
  // Match <td ... data-stat="stat" ...>content</td> or <th ... data-stat="stat" ...>content</th>
  const pattern = new RegExp(
    `<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)</(?:td|th)>`,
    'i'
  );
  const match = rowHtml.match(pattern);
  if (!match) return '';

  let content = match[1].trim();

  // Strip HTML tags to get inner text (handles <a href="...">Player Name</a>)
  content = content.replace(/<[^>]*>/g, '').trim();

  return content;
}

/**
 * Safely parses a numeric string, returning a default if the value
 * is empty, non-numeric, or otherwise unparseable.
 */
function safeParseFloat(value: string, fallback: number = 0): number {
  if (!value || value.trim() === '') return fallback;
  const cleaned = value.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * Parses FBRef age format "25-123" (years-days) into a numeric age.
 */
function parseAge(ageStr: string): number {
  if (!ageStr) return 0;
  const parts = ageStr.split('-');
  const years = parseInt(parts[0], 10);
  if (isNaN(years)) return 0;
  // If days component present, add fractional year
  if (parts.length > 1) {
    const days = parseInt(parts[1], 10);
    if (!isNaN(days)) {
      return years + days / 365;
    }
  }
  return years;
}

/**
 * Extracts all <tr> rows from a <tbody> within a specific table.
 * Returns an array of raw HTML strings, one per row.
 */
function extractTableRows(html: string, tableId: string): string[] {
  // Find the table by id
  const tablePattern = new RegExp(
    `<table[^>]*id="${tableId}"[^>]*>[\\s\\S]*?</table>`,
    'i'
  );
  const tableMatch = html.match(tablePattern);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[0];

  // Extract <tbody> content
  const tbodyPattern = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i;
  const tbodyMatch = tableHtml.match(tbodyPattern);
  if (!tbodyMatch) return [];

  const tbodyHtml = tbodyMatch[1];

  // Extract individual rows, skipping spacer/header rows (class="thead" or "spacer")
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[] = [];
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(tbodyHtml)) !== null) {
    const fullRow = rowMatch[0];
    // Skip spacer rows and sub-header rows
    if (fullRow.includes('class="spacer"') || fullRow.includes('class="thead"')) {
      continue;
    }
    // Skip rows that are just section dividers (no data-stat="player")
    if (!fullRow.includes('data-stat="player"') && !fullRow.includes('data-stat="team"')) {
      continue;
    }
    rows.push(fullRow);
  }

  return rows;
}

// ─── Player Stats Parsing ───────────────────────────────────

/**
 * Parses FBRef standard stats table HTML into structured player stats.
 *
 * Expects a table with id="stats_standard" containing rows with
 * data-stat attributes on <td> elements. Handles missing columns
 * gracefully by defaulting to 0.
 *
 * Some per-90 stats may need post-processing: if FBRef provides
 * totals rather than per-90, we divide by (minutes / 90).
 */
function parsePlayerStatsTable(html: string): FBRefPlayerStats[] {
  const rows = extractTableRows(html, 'stats_standard');
  const players: FBRefPlayerStats[] = [];

  for (const row of rows) {
    const name = extractDataStat(row, 'player');
    if (!name) continue; // Skip rows without a player name

    const team = extractDataStat(row, 'team_id');
    const position = extractDataStat(row, 'position');
    const age = Math.floor(parseAge(extractDataStat(row, 'age')));
    const matchesPlayed = safeParseFloat(extractDataStat(row, 'games'));
    const minutes = safeParseFloat(extractDataStat(row, 'minutes'));

    // Goals and assists
    const goals = safeParseFloat(extractDataStat(row, 'goals'));
    const assists = safeParseFloat(extractDataStat(row, 'assists'));

    // Passing
    const passCompletion = safeParseFloat(extractDataStat(row, 'passes_pct'));

    // Per-90 normalization factor
    const per90 = minutes > 0 ? minutes / 90 : 1;

    // Progressive stats (FBRef may store totals; normalize to per-90)
    const progressivePassesTotal = safeParseFloat(
      extractDataStat(row, 'progressive_passes')
    );
    const progressiveCarriesTotal = safeParseFloat(
      extractDataStat(row, 'progressive_carries')
    );

    // Defensive stats
    const tacklesTotal = safeParseFloat(extractDataStat(row, 'tackles'));
    const interceptionsTotal = safeParseFloat(extractDataStat(row, 'interceptions'));

    // Pressing stats
    const pressuresTotal = safeParseFloat(extractDataStat(row, 'pressures'));
    const pressuresSuccessful = safeParseFloat(
      extractDataStat(row, 'pressure_regains')
    );
    const pressureSuccessRate = pressuresTotal > 0
      ? (pressuresSuccessful / pressuresTotal) * 100
      : safeParseFloat(extractDataStat(row, 'pressure_regain_pct'));

    // Touches and zone distribution
    const touchesTotal = safeParseFloat(extractDataStat(row, 'touches'));
    const touchesDef = safeParseFloat(extractDataStat(row, 'touches_def_3rd'));
    const touchesMid = safeParseFloat(extractDataStat(row, 'touches_mid_3rd'));
    const touchesAtt = safeParseFloat(extractDataStat(row, 'touches_att_3rd'));

    // Convert zone touches to percentages
    const totalZoneTouches = touchesDef + touchesMid + touchesAtt;
    const touchesDefPct = totalZoneTouches > 0
      ? (touchesDef / totalZoneTouches) * 100 : 33.3;
    const touchesMidPct = totalZoneTouches > 0
      ? (touchesMid / totalZoneTouches) * 100 : 33.3;
    const touchesAttPct = totalZoneTouches > 0
      ? (touchesAtt / totalZoneTouches) * 100 : 33.3;

    players.push({
      name,
      team,
      position,
      age,
      matchesPlayed,
      minutes,
      goals,
      assists,
      passCompletion,
      progressivePasses: per90 > 0 ? progressivePassesTotal / per90 : 0,
      progressiveCarries: per90 > 0 ? progressiveCarriesTotal / per90 : 0,
      tackles: per90 > 0 ? tacklesTotal / per90 : 0,
      interceptions: per90 > 0 ? interceptionsTotal / per90 : 0,
      pressures: per90 > 0 ? pressuresTotal / per90 : 0,
      pressureSuccessRate,
      touches: per90 > 0 ? touchesTotal / per90 : 0,
      touchesDefThird: touchesDefPct,
      touchesMidThird: touchesMidPct,
      touchesAttThird: touchesAttPct,
    });
  }

  return players;
}

// ─── Team Stats Parsing ─────────────────────────────────────

/**
 * Parses FBRef team stats tables into structured team data.
 *
 * Tries multiple table IDs since FBRef uses different IDs across
 * league summary pages (e.g., "stats_squads_standard_for",
 * "stats_squads_standard_against").
 */
function parseTeamStatsTable(html: string): FBRefTeamStats[] {
  // FBRef team stats may live in various table IDs
  const possibleTableIds = [
    'stats_squads_standard_for',
    'stats_squads_standard',
    'results',
    'overall',
  ];

  let rows: string[] = [];
  for (const tableId of possibleTableIds) {
    rows = extractTableRows(html, tableId);
    if (rows.length > 0) break;
  }

  // If no structured table found, try to extract from a generic stats table
  if (rows.length === 0) {
    rows = extractTableRows(html, 'stats_standard');
  }

  const teams: FBRefTeamStats[] = [];

  // Also try to extract "against" stats for xGA
  const againstRows = extractTableRows(html, 'stats_squads_standard_against');
  const againstMap = new Map<string, { goalsAgainst: number; xGA: number }>();

  for (const row of againstRows) {
    const teamName = extractDataStat(row, 'team')
      || extractDataStat(row, 'team_id')
      || extractDataStat(row, 'squad');
    if (!teamName) continue;
    againstMap.set(teamName, {
      goalsAgainst: safeParseFloat(extractDataStat(row, 'goals')),
      xGA: safeParseFloat(extractDataStat(row, 'xg'))
        || safeParseFloat(extractDataStat(row, 'xg_against')),
    });
  }

  // Extract league name from page title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
  const leagueFromTitle = pageTitle.replace(/Stats.*$/i, '').trim() || 'Unknown';

  for (const row of rows) {
    const team = extractDataStat(row, 'team')
      || extractDataStat(row, 'team_id')
      || extractDataStat(row, 'squad');
    if (!team) continue;

    const possession = safeParseFloat(extractDataStat(row, 'possession'));
    const passCompletion = safeParseFloat(extractDataStat(row, 'passes_pct'));
    const goalsFor = safeParseFloat(extractDataStat(row, 'goals'));
    const xG = safeParseFloat(extractDataStat(row, 'xg'));

    // PPDA: passes per defensive action — derived from opponent data if available
    // FBRef doesn't have a direct PPDA column; we estimate from pressing stats
    const pressures = safeParseFloat(extractDataStat(row, 'pressures'));
    const tackles = safeParseFloat(extractDataStat(row, 'tackles'));
    const interceptions = safeParseFloat(extractDataStat(row, 'interceptions'));
    const defensiveActions = pressures + tackles + interceptions;
    const matchesPlayed = safeParseFloat(extractDataStat(row, 'games'))
      || safeParseFloat(extractDataStat(row, 'matches_played'))
      || 1;

    // Rough PPDA estimate: opponent passes / team defensive actions per match
    // Lower value = more intense pressing
    const ppda = defensiveActions > 0
      ? (matchesPlayed * 450) / defensiveActions // ~450 passes per match average
      : 10; // neutral default

    // Pull "against" data from the separate table
    const against = againstMap.get(team);

    teams.push({
      team,
      league: leagueFromTitle,
      possession,
      passCompletion,
      ppda: Math.round(ppda * 100) / 100,
      goalsFor,
      goalsAgainst: against?.goalsAgainst ?? 0,
      xG,
      xGA: against?.xGA ?? 0,
    });
  }

  return teams;
}

// ─── League Scraper ─────────────────────────────────────────

/**
 * Scrapes a full league's player stats from FBRef.
 *
 * @param league - League key: 'premier-league', 'la-liga', 'serie-a',
 *                 'bundesliga', or 'ligue-1'
 * @returns Array of player stats for all players in the league
 * @throws If the league key is unrecognized or fetch fails with no cache
 */
async function scrapeLeaguePlayerStats(league: string): Promise<FBRefPlayerStats[]> {
  const leagueKey = league.toLowerCase().replace(/\s+/g, '-');
  const leagueInfo = LEAGUE_IDS[leagueKey];

  if (!leagueInfo) {
    const available = Object.keys(LEAGUE_IDS).join(', ');
    throw new Error(
      `Unknown league "${league}". Available: ${available}`
    );
  }

  const url = `https://fbref.com/en/comps/${leagueInfo.id}/stats/${leagueInfo.slug}`;
  const cacheKey = `league_players_${leagueKey}`;

  const html = await fetchWithCache(url, cacheKey);
  const players = parsePlayerStatsTable(html);

  if (players.length === 0) {
    console.warn(
      `[fbref-scraper] No players parsed for "${league}". ` +
      `The page structure may have changed.`
    );
  }

  return players;
}

// ─── Exports ────────────────────────────────────────────────

export {
  FBRefPlayerStats,
  FBRefTeamStats,
  scrapeLeaguePlayerStats,
  fetchWithCache,
  parsePlayerStatsTable,
  parseTeamStatsTable,
  LEAGUE_IDS,
  CACHE_DIR,
};
