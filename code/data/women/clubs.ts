/**
 * PitchIntel Women — buyer-club contexts.
 *
 * Authored TeamContext estimates for six clubs that are demonstrably active
 * at the scouting frontier (see intel/2026-08-02-market-context.md and
 * intel/2026-08-02-frontier-players.md): the Kynisca group clubs, the NWSL
 * clubs buying directly from data-desert leagues, and the proven
 * develop-and-sell pathway club. Tactical numbers are estimates from public
 * reporting and match viewing, not computed from event data — the same
 * honest-estimate convention as the frontier corpus. Budgets are €M and
 * reflect the women's fee market (world record: €1.65M, Sep 2025).
 */

import type { TeamContext } from '../teams-db.js';

export function getWomensClubs(): TeamContext[] {
  return [
    {
      name: 'Washington Spirit',
      league: 'NWSL',
      budget: 2.0,
      formation: '4-3-3',
      style: 'pressing',
      avgMincut: 0.58,
      networkDensity: 0.74,
      weakestZone: 'left flank',
      hubPlayer: 'Trinity Rodman',
      hubDependency: 0.55,
      pressEfficiency: 0.5,
      positionDepth: new Map([['GK', 2], ['CB', 4], ['LB', 1], ['RB', 2], ['CDM', 2], ['CM', 3], ['CAM', 1], ['LM', 1], ['RM', 1], ['LW', 1], ['RW', 2], ['ST', 2]]),
      avgPlayerCentrality: 0.26,
      avgPlayerConnections: 6.8,
    },
    {
      name: 'Kansas City Current',
      league: 'NWSL',
      budget: 2.0,
      formation: '4-3-3',
      style: 'counter',
      avgMincut: 0.55,
      networkDensity: 0.7,
      weakestZone: 'center-left',
      hubPlayer: 'Temwa Chawinga',
      hubDependency: 0.68,
      pressEfficiency: 0.44,
      positionDepth: new Map([['GK', 2], ['CB', 4], ['LB', 2], ['RB', 2], ['CDM', 2], ['CM', 3], ['CAM', 1], ['LM', 1], ['RM', 1], ['LW', 2], ['RW', 1], ['ST', 1]]),
      avgPlayerCentrality: 0.25,
      avgPlayerConnections: 6.5,
    },
    {
      name: 'OL Lyonnes',
      league: 'Première Ligue',
      budget: 3.0,
      formation: '4-3-3',
      style: 'possession',
      avgMincut: 0.68,
      networkDensity: 0.84,
      weakestZone: 'right flank',
      hubPlayer: 'Melchie Dumornay',
      hubDependency: 0.6,
      pressEfficiency: 0.52,
      positionDepth: new Map([['GK', 3], ['CB', 4], ['LB', 2], ['RB', 2], ['CDM', 2], ['CM', 4], ['CAM', 2], ['LM', 1], ['RM', 1], ['LW', 2], ['RW', 1], ['ST', 2]]),
      avgPlayerCentrality: 0.29,
      avgPlayerConnections: 7.6,
    },
    {
      name: 'London City Lionesses',
      league: 'WSL',
      budget: 2.5,
      formation: '4-2-3-1',
      style: 'balanced',
      avgMincut: 0.56,
      networkDensity: 0.72,
      weakestZone: 'right flank',
      hubPlayer: 'Grace Geyoro',
      hubDependency: 0.62,
      pressEfficiency: 0.46,
      positionDepth: new Map([['GK', 2], ['CB', 3], ['LB', 2], ['RB', 1], ['CDM', 2], ['CM', 3], ['CAM', 1], ['LM', 1], ['RM', 1], ['LW', 1], ['RW', 1], ['ST', 2]]),
      avgPlayerCentrality: 0.27,
      avgPlayerConnections: 7.0,
    },
    {
      name: 'Brighton Women',
      league: 'WSL',
      budget: 1.2,
      formation: '4-2-3-1',
      style: 'balanced',
      avgMincut: 0.52,
      networkDensity: 0.68,
      weakestZone: 'center',
      hubPlayer: 'Chiamaka Nnadozie',
      hubDependency: 0.42,
      pressEfficiency: 0.42,
      positionDepth: new Map([['GK', 2], ['CB', 3], ['LB', 2], ['RB', 2], ['CDM', 2], ['CM', 3], ['CAM', 1], ['LM', 1], ['RM', 1], ['LW', 1], ['RW', 1], ['ST', 1]]),
      avgPlayerCentrality: 0.24,
      avgPlayerConnections: 6.4,
    },
    {
      name: 'Madrid CFF',
      league: 'Liga F',
      budget: 0.4,
      formation: '4-4-2',
      style: 'counter',
      avgMincut: 0.5,
      networkDensity: 0.66,
      weakestZone: 'center',
      hubPlayer: '(young collective)',
      hubDependency: 0.35,
      pressEfficiency: 0.4,
      positionDepth: new Map([['GK', 2], ['CB', 3], ['LB', 2], ['RB', 2], ['CDM', 2], ['CM', 3], ['CAM', 1], ['LM', 1], ['RM', 1], ['LW', 1], ['RW', 1], ['ST', 2]]),
      avgPlayerCentrality: 0.23,
      avgPlayerConnections: 6.0,
    },
  ];
}
