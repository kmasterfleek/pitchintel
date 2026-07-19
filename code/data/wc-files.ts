/**
 * World Cup 2026 "Crazy Files" — the lower-division / semi-pro / free-agent
 * tournament stories, as ScoutProfiles. Shared between the World Cup special
 * page (code/worldcup.ts) and the enterprise demo (code/enterprise.ts), where
 * they land on the Northbridge United shortlist.
 *
 * Profiles are authored public-data estimates (research snapshot Jul 19 2026);
 * see the sources cited on the World Cup page.
 */

import type { ScoutProfile } from './players-db.js';

export interface WCFile {
  profile: ScoutProfile;
  flag: string;
  country: string;
}

export function getWCFiles(): WCFile[] {
  return [
    {
      profile: { name: 'Vozinha', age: 40, position: 'GK', club: 'Unattached (last: Chaves)', league: 'Liga Portugal 2',
        nationality: 'Cape Verde', marketValue: 0.3, contractYearsLeft: 0, passCompletionRate: 0.72,
        avgPassDistance: 32, defensiveWorkRate: 0.5, sprintCapacity: 8, avgSpeed: 5.2,
        currentPageRank: 0.1, currentConnections: 4, currentPassWeight: 0.2, avgX: -48, avgY: 0 },
      flag: '&#127464;&#127483;', country: 'Cape Verde',
    },
    {
      profile: { name: 'Sidny Lopes Cabral', age: 23, position: 'LB', club: 'Trabzonspor', league: 'Süper Lig',
        nationality: 'Cape Verde', marketValue: 8, contractYearsLeft: 4, passCompletionRate: 0.8,
        avgPassDistance: 13, defensiveWorkRate: 0.68, sprintCapacity: 27, avgSpeed: 7.1,
        currentPageRank: 0.2, currentConnections: 6.5, currentPassWeight: 0.28, avgX: -14, avgY: -24 },
      flag: '&#127464;&#127483;', country: 'Cape Verde',
    },
    {
      profile: { name: 'Pico Lopes', age: 34, position: 'CB', club: 'Shamrock Rovers', league: 'League of Ireland',
        nationality: 'Cape Verde', marketValue: 0.4, contractYearsLeft: 1, passCompletionRate: 0.84,
        avgPassDistance: 18, defensiveWorkRate: 0.75, sprintCapacity: 12, avgSpeed: 6.2,
        currentPageRank: 0.16, currentConnections: 6, currentPassWeight: 0.28, avgX: -34, avgY: 4 },
      flag: '&#127464;&#127483;', country: 'Cape Verde',
    },
    {
      profile: { name: 'Eloy Room', age: 37, position: 'GK', club: 'Journeyman', league: 'ex-PSV, Columbus Crew',
        nationality: 'Curaçao', marketValue: 0.5, contractYearsLeft: 0, passCompletionRate: 0.74,
        avgPassDistance: 30, defensiveWorkRate: 0.5, sprintCapacity: 8, avgSpeed: 5.1,
        currentPageRank: 0.1, currentConnections: 4, currentPassWeight: 0.2, avgX: -48, avgY: 0 },
      flag: '&#127464;&#127484;', country: 'Curaçao',
    },
    {
      profile: { name: 'Orlando Gill', age: 26, position: 'GK', club: 'San Lorenzo', league: 'Liga Profesional (ARG)',
        nationality: 'Paraguay', marketValue: 4, contractYearsLeft: 2, passCompletionRate: 0.76,
        avgPassDistance: 28, defensiveWorkRate: 0.5, sprintCapacity: 9, avgSpeed: 5.4,
        currentPageRank: 0.11, currentConnections: 4.5, currentPassWeight: 0.22, avgX: -47, avgY: 0 },
      flag: '&#127477;&#127486;', country: 'Paraguay',
    },
    {
      profile: { name: 'Haissem Hassan', age: 24, position: 'RW', club: 'Real Oviedo', league: 'Segunda División',
        nationality: 'Egypt', marketValue: 4, contractYearsLeft: 2, passCompletionRate: 0.79,
        avgPassDistance: 11, defensiveWorkRate: 0.5, sprintCapacity: 26, avgSpeed: 7.2,
        currentPageRank: 0.2, currentConnections: 6.5, currentPassWeight: 0.28, avgX: 16, avgY: 21 },
      flag: '&#127466;&#127468;', country: 'Egypt',
    },
  ];
}
