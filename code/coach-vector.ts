/**
 * Coach Vector & Coach-Team Matching Engine for PitchIntel
 *
 * Answers: "What coach is the best structural fit for this team's squad?"
 *
 * Uses a ~75-dimension coach vector covering tactical system, player
 * development, personality, and track record. Matches against TeamContext
 * and ScoutProfile data to produce a weighted fit score with narrative.
 */

import { TeamContext, getTeamDatabase } from './data/teams-db.js';
import { ScoutProfile, getPlayerDatabase } from './data/players-db.js';

// ---------------------------------------------------------------------------
// 1. CoachVector interface (~75 dimensions)
// ---------------------------------------------------------------------------

export interface CoachVector {
  name: string;
  age: number;
  nationality: string;
  currentClub: string | null;
  yearsInManagement: number;
  careerWinRate: number;

  preferredFormation?: string;
  formationFlexibility?: number;
  avgPossession?: number;
  buildUpStyle?: 'short' | 'mixed' | 'direct';
  buildUpSpeed?: 'slow' | 'moderate' | 'fast';
  pressingIntensity?: number;
  pressingHeight?: number;
  defensiveLineHeight?: number;
  defensiveCompactness?: number;
  counterAttackFrequency?: number;
  crossingRate?: number;
  widthInPossession?: number;
  positionalPlayScore?: number;
  setPlayGoalRate?: number;
  pressTriggersPerMatch?: number;
  avgTeamMincut?: number;
  avgPassNetworkDensity?: number;
  avgHubDependency?: number;
  avgFormationStability?: number;
  avgSafeLanesCreated?: number;

  youngPlayerMinuteShare?: number;
  debutRate?: number;
  playerValueGrowth?: number;
  squadRotation?: number;
  tacticalAdaptability?: number;
  xGOverperformance?: number;

  motivationalIntensity?: number;
  mediaProfile?: number;
  playerRelationshipScore?: number;
  boardRelationshipScore?: number;
  transferApproach?: 'youth' | 'stars' | 'bargains' | 'balanced';
  culturalAdaptability?: number;
  crisisManagement?: number;
  avgTenureMonths?: number;
}

// ---------------------------------------------------------------------------
// 2. Coach Database (~25 coaches with realistic tactical profiles)
// ---------------------------------------------------------------------------

export function getCoachDatabase(): CoachVector[] {
  return [
    // ── Currently at top clubs ──────────────────────────────────
    {
      name: 'Pep Guardiola', age: 53, nationality: 'Spain', currentClub: 'Manchester City', yearsInManagement: 15, careerWinRate: 0.73,
      preferredFormation: '4-3-3', formationFlexibility: 4, avgPossession: 65, buildUpStyle: 'short', buildUpSpeed: 'slow',
      pressingIntensity: 8, pressingHeight: 55, defensiveLineHeight: 0.8, defensiveCompactness: 0.75, counterAttackFrequency: 4,
      crossingRate: 18, widthInPossession: 0.8, positionalPlayScore: 0.95, setPlayGoalRate: 0.12, pressTriggersPerMatch: 65,
      avgTeamMincut: 0.72, avgPassNetworkDensity: 0.89, avgHubDependency: 0.4, avgFormationStability: 0.7, avgSafeLanesCreated: 2.1,
      youngPlayerMinuteShare: 0.15, debutRate: 3, playerValueGrowth: 25, squadRotation: 0.7, tacticalAdaptability: 0.8, xGOverperformance: 2.5,
      motivationalIntensity: 8, mediaProfile: 7, playerRelationshipScore: 7, boardRelationshipScore: 8,
      transferApproach: 'stars', culturalAdaptability: 7, crisisManagement: 7, avgTenureMonths: 48,
    },
    {
      name: 'Mikel Arteta', age: 42, nationality: 'Spain', currentClub: 'Arsenal', yearsInManagement: 5, careerWinRate: 0.58,
      preferredFormation: '4-3-3', formationFlexibility: 3, avgPossession: 58, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 9, pressingHeight: 52, defensiveLineHeight: 0.7, defensiveCompactness: 0.8, counterAttackFrequency: 6,
      crossingRate: 20, widthInPossession: 0.75, positionalPlayScore: 0.8, setPlayGoalRate: 0.18, pressTriggersPerMatch: 60,
      avgTeamMincut: 0.65, avgPassNetworkDensity: 0.82, avgHubDependency: 0.55, avgFormationStability: 0.8, avgSafeLanesCreated: 2.5,
      youngPlayerMinuteShare: 0.2, debutRate: 2, playerValueGrowth: 30, squadRotation: 0.4, tacticalAdaptability: 0.65, xGOverperformance: 1.5,
      motivationalIntensity: 9, mediaProfile: 6, playerRelationshipScore: 8, boardRelationshipScore: 9,
      transferApproach: 'balanced', culturalAdaptability: 7, crisisManagement: 7, avgTenureMonths: 36,
    },
    {
      name: 'Arne Slot', age: 46, nationality: 'Netherlands', currentClub: 'Liverpool', yearsInManagement: 6, careerWinRate: 0.58,
      preferredFormation: '4-3-3', formationFlexibility: 2, avgPossession: 57, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 8.5, pressingHeight: 53, defensiveLineHeight: 0.7, defensiveCompactness: 0.78, counterAttackFrequency: 6,
      crossingRate: 16, widthInPossession: 0.72, positionalPlayScore: 0.75, setPlayGoalRate: 0.1, pressTriggersPerMatch: 58,
      avgTeamMincut: 0.68, avgPassNetworkDensity: 0.78, avgHubDependency: 0.45, avgFormationStability: 0.82, avgSafeLanesCreated: 2.8,
      youngPlayerMinuteShare: 0.18, debutRate: 3, playerValueGrowth: 20, squadRotation: 0.45, tacticalAdaptability: 0.6, xGOverperformance: 1.0,
      motivationalIntensity: 7, mediaProfile: 4, playerRelationshipScore: 7, boardRelationshipScore: 8,
      transferApproach: 'balanced', culturalAdaptability: 6, crisisManagement: 6, avgTenureMonths: 30,
    },
    {
      name: 'Xabi Alonso', age: 43, nationality: 'Spain', currentClub: 'Bayer Leverkusen', yearsInManagement: 4, careerWinRate: 0.62,
      preferredFormation: '3-4-2-1', formationFlexibility: 4, avgPossession: 60, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 7.5, pressingHeight: 54, defensiveLineHeight: 0.75, defensiveCompactness: 0.72, counterAttackFrequency: 7,
      crossingRate: 22, widthInPossession: 0.78, positionalPlayScore: 0.82, setPlayGoalRate: 0.14, pressTriggersPerMatch: 55,
      avgTeamMincut: 0.67, avgPassNetworkDensity: 0.80, avgHubDependency: 0.5, avgFormationStability: 0.75, avgSafeLanesCreated: 2.4,
      youngPlayerMinuteShare: 0.22, debutRate: 4, playerValueGrowth: 35, squadRotation: 0.55, tacticalAdaptability: 0.75, xGOverperformance: 3.0,
      motivationalIntensity: 8, mediaProfile: 5, playerRelationshipScore: 9, boardRelationshipScore: 8,
      transferApproach: 'balanced', culturalAdaptability: 8, crisisManagement: 8, avgTenureMonths: 28,
    },
    {
      name: 'Carlo Ancelotti', age: 65, nationality: 'Italy', currentClub: 'Real Madrid', yearsInManagement: 28, careerWinRate: 0.60,
      preferredFormation: '4-3-3', formationFlexibility: 5, avgPossession: 55, buildUpStyle: 'mixed', buildUpSpeed: 'moderate',
      pressingIntensity: 11, pressingHeight: 45, defensiveLineHeight: 0.55, defensiveCompactness: 0.7, counterAttackFrequency: 8,
      crossingRate: 20, widthInPossession: 0.7, positionalPlayScore: 0.5, setPlayGoalRate: 0.1, pressTriggersPerMatch: 40,
      avgTeamMincut: 0.70, avgPassNetworkDensity: 0.78, avgHubDependency: 0.6, avgFormationStability: 0.65, avgSafeLanesCreated: 3.0,
      youngPlayerMinuteShare: 0.12, debutRate: 2, playerValueGrowth: 15, squadRotation: 0.5, tacticalAdaptability: 0.85, xGOverperformance: 2.0,
      motivationalIntensity: 6, mediaProfile: 6, playerRelationshipScore: 10, boardRelationshipScore: 8,
      transferApproach: 'stars', culturalAdaptability: 10, crisisManagement: 9, avgTenureMonths: 30,
    },
    {
      name: 'Hansi Flick', age: 59, nationality: 'Germany', currentClub: 'Barcelona', yearsInManagement: 6, careerWinRate: 0.66,
      preferredFormation: '4-2-3-1', formationFlexibility: 3, avgPossession: 60, buildUpStyle: 'short', buildUpSpeed: 'fast',
      pressingIntensity: 7, pressingHeight: 56, defensiveLineHeight: 0.85, defensiveCompactness: 0.7, counterAttackFrequency: 6,
      crossingRate: 17, widthInPossession: 0.75, positionalPlayScore: 0.7, setPlayGoalRate: 0.11, pressTriggersPerMatch: 62,
      avgTeamMincut: 0.64, avgPassNetworkDensity: 0.83, avgHubDependency: 0.45, avgFormationStability: 0.72, avgSafeLanesCreated: 2.2,
      youngPlayerMinuteShare: 0.28, debutRate: 5, playerValueGrowth: 30, squadRotation: 0.55, tacticalAdaptability: 0.65, xGOverperformance: 1.8,
      motivationalIntensity: 8, mediaProfile: 4, playerRelationshipScore: 7, boardRelationshipScore: 7,
      transferApproach: 'youth', culturalAdaptability: 6, crisisManagement: 6, avgTenureMonths: 24,
    },
    {
      name: 'Simone Inzaghi', age: 48, nationality: 'Italy', currentClub: 'Inter Milan', yearsInManagement: 8, careerWinRate: 0.55,
      preferredFormation: '3-5-2', formationFlexibility: 2, avgPossession: 53, buildUpStyle: 'mixed', buildUpSpeed: 'moderate',
      pressingIntensity: 10, pressingHeight: 48, defensiveLineHeight: 0.55, defensiveCompactness: 0.82, counterAttackFrequency: 9,
      crossingRate: 24, widthInPossession: 0.8, positionalPlayScore: 0.55, setPlayGoalRate: 0.13, pressTriggersPerMatch: 42,
      avgTeamMincut: 0.73, avgPassNetworkDensity: 0.77, avgHubDependency: 0.55, avgFormationStability: 0.85, avgSafeLanesCreated: 2.8,
      youngPlayerMinuteShare: 0.1, debutRate: 2, playerValueGrowth: 15, squadRotation: 0.55, tacticalAdaptability: 0.6, xGOverperformance: 1.0,
      motivationalIntensity: 7, mediaProfile: 4, playerRelationshipScore: 8, boardRelationshipScore: 7,
      transferApproach: 'balanced', culturalAdaptability: 5, crisisManagement: 7, avgTenureMonths: 36,
    },
    {
      name: 'Gian Piero Gasperini', age: 66, nationality: 'Italy', currentClub: 'Atalanta', yearsInManagement: 18, careerWinRate: 0.48,
      preferredFormation: '3-4-2-1', formationFlexibility: 2, avgPossession: 52, buildUpStyle: 'mixed', buildUpSpeed: 'fast',
      pressingIntensity: 7.5, pressingHeight: 54, defensiveLineHeight: 0.65, defensiveCompactness: 0.68, counterAttackFrequency: 10,
      crossingRate: 22, widthInPossession: 0.82, positionalPlayScore: 0.4, setPlayGoalRate: 0.09, pressTriggersPerMatch: 55,
      avgTeamMincut: 0.61, avgPassNetworkDensity: 0.76, avgHubDependency: 0.4, avgFormationStability: 0.6, avgSafeLanesCreated: 2.6,
      youngPlayerMinuteShare: 0.2, debutRate: 4, playerValueGrowth: 40, squadRotation: 0.6, tacticalAdaptability: 0.55, xGOverperformance: 2.5,
      motivationalIntensity: 9, mediaProfile: 5, playerRelationshipScore: 5, boardRelationshipScore: 7,
      transferApproach: 'bargains', culturalAdaptability: 4, crisisManagement: 7, avgTenureMonths: 48,
    },
    {
      name: 'Luis Enrique', age: 54, nationality: 'Spain', currentClub: 'PSG', yearsInManagement: 12, careerWinRate: 0.60,
      preferredFormation: '4-3-3', formationFlexibility: 3, avgPossession: 62, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 8, pressingHeight: 52, defensiveLineHeight: 0.72, defensiveCompactness: 0.72, counterAttackFrequency: 5,
      crossingRate: 15, widthInPossession: 0.7, positionalPlayScore: 0.78, setPlayGoalRate: 0.1, pressTriggersPerMatch: 55,
      avgTeamMincut: 0.63, avgPassNetworkDensity: 0.80, avgHubDependency: 0.45, avgFormationStability: 0.7, avgSafeLanesCreated: 2.5,
      youngPlayerMinuteShare: 0.25, debutRate: 4, playerValueGrowth: 22, squadRotation: 0.65, tacticalAdaptability: 0.65, xGOverperformance: 0.5,
      motivationalIntensity: 9, mediaProfile: 7, playerRelationshipScore: 6, boardRelationshipScore: 6,
      transferApproach: 'youth', culturalAdaptability: 6, crisisManagement: 6, avgTenureMonths: 28,
    },
    {
      name: 'Diego Simeone', age: 54, nationality: 'Argentina', currentClub: 'Atletico Madrid', yearsInManagement: 16, careerWinRate: 0.52,
      preferredFormation: '4-4-2', formationFlexibility: 2, avgPossession: 45, buildUpStyle: 'direct', buildUpSpeed: 'fast',
      pressingIntensity: 12, pressingHeight: 42, defensiveLineHeight: 0.3, defensiveCompactness: 0.92, counterAttackFrequency: 12,
      crossingRate: 22, widthInPossession: 0.5, positionalPlayScore: 0.2, setPlayGoalRate: 0.2, pressTriggersPerMatch: 38,
      avgTeamMincut: 0.75, avgPassNetworkDensity: 0.65, avgHubDependency: 0.55, avgFormationStability: 0.9, avgSafeLanesCreated: 3.5,
      youngPlayerMinuteShare: 0.1, debutRate: 2, playerValueGrowth: 10, squadRotation: 0.35, tacticalAdaptability: 0.4, xGOverperformance: 3.0,
      motivationalIntensity: 10, mediaProfile: 7, playerRelationshipScore: 7, boardRelationshipScore: 9,
      transferApproach: 'bargains', culturalAdaptability: 6, crisisManagement: 9, avgTenureMonths: 72,
    },

    // ── Available / recently departed ───────────────────────────
    {
      name: 'Jurgen Klopp', age: 57, nationality: 'Germany', currentClub: null, yearsInManagement: 18, careerWinRate: 0.58,
      preferredFormation: '4-3-3', formationFlexibility: 3, avgPossession: 55, buildUpStyle: 'mixed', buildUpSpeed: 'fast',
      pressingIntensity: 7, pressingHeight: 58, defensiveLineHeight: 0.75, defensiveCompactness: 0.72, counterAttackFrequency: 10,
      crossingRate: 22, widthInPossession: 0.78, positionalPlayScore: 0.45, setPlayGoalRate: 0.12, pressTriggersPerMatch: 68,
      avgTeamMincut: 0.68, avgPassNetworkDensity: 0.78, avgHubDependency: 0.45, avgFormationStability: 0.72, avgSafeLanesCreated: 2.0,
      youngPlayerMinuteShare: 0.2, debutRate: 3, playerValueGrowth: 35, squadRotation: 0.5, tacticalAdaptability: 0.7, xGOverperformance: 2.0,
      motivationalIntensity: 10, mediaProfile: 9, playerRelationshipScore: 9, boardRelationshipScore: 8,
      transferApproach: 'bargains', culturalAdaptability: 8, crisisManagement: 9, avgTenureMonths: 54,
    },
    {
      name: 'Thomas Tuchel', age: 51, nationality: 'Germany', currentClub: null, yearsInManagement: 10, careerWinRate: 0.59,
      preferredFormation: '3-4-2-1', formationFlexibility: 4, avgPossession: 58, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 8.5, pressingHeight: 52, defensiveLineHeight: 0.68, defensiveCompactness: 0.78, counterAttackFrequency: 7,
      crossingRate: 19, widthInPossession: 0.75, positionalPlayScore: 0.7, setPlayGoalRate: 0.13, pressTriggersPerMatch: 55,
      avgTeamMincut: 0.66, avgPassNetworkDensity: 0.79, avgHubDependency: 0.5, avgFormationStability: 0.7, avgSafeLanesCreated: 2.5,
      youngPlayerMinuteShare: 0.15, debutRate: 2, playerValueGrowth: 18, squadRotation: 0.6, tacticalAdaptability: 0.75, xGOverperformance: 1.5,
      motivationalIntensity: 8, mediaProfile: 7, playerRelationshipScore: 6, boardRelationshipScore: 4,
      transferApproach: 'stars', culturalAdaptability: 7, crisisManagement: 7, avgTenureMonths: 22,
    },
    {
      name: 'Zinedine Zidane', age: 52, nationality: 'France', currentClub: null, yearsInManagement: 6, careerWinRate: 0.64,
      preferredFormation: '4-3-3', formationFlexibility: 4, avgPossession: 55, buildUpStyle: 'mixed', buildUpSpeed: 'moderate',
      pressingIntensity: 10, pressingHeight: 47, defensiveLineHeight: 0.6, defensiveCompactness: 0.72, counterAttackFrequency: 8,
      crossingRate: 20, widthInPossession: 0.72, positionalPlayScore: 0.5, setPlayGoalRate: 0.11, pressTriggersPerMatch: 42,
      avgTeamMincut: 0.70, avgPassNetworkDensity: 0.78, avgHubDependency: 0.6, avgFormationStability: 0.68, avgSafeLanesCreated: 2.8,
      youngPlayerMinuteShare: 0.12, debutRate: 2, playerValueGrowth: 10, squadRotation: 0.5, tacticalAdaptability: 0.8, xGOverperformance: 2.5,
      motivationalIntensity: 8, mediaProfile: 8, playerRelationshipScore: 9, boardRelationshipScore: 7,
      transferApproach: 'stars', culturalAdaptability: 8, crisisManagement: 8, avgTenureMonths: 26,
    },
    {
      name: 'Mauricio Pochettino', age: 52, nationality: 'Argentina', currentClub: null, yearsInManagement: 12, careerWinRate: 0.50,
      preferredFormation: '4-2-3-1', formationFlexibility: 3, avgPossession: 53, buildUpStyle: 'mixed', buildUpSpeed: 'fast',
      pressingIntensity: 8, pressingHeight: 55, defensiveLineHeight: 0.7, defensiveCompactness: 0.7, counterAttackFrequency: 8,
      crossingRate: 20, widthInPossession: 0.72, positionalPlayScore: 0.5, setPlayGoalRate: 0.11, pressTriggersPerMatch: 58,
      avgTeamMincut: 0.55, avgPassNetworkDensity: 0.74, avgHubDependency: 0.5, avgFormationStability: 0.68, avgSafeLanesCreated: 2.8,
      youngPlayerMinuteShare: 0.25, debutRate: 5, playerValueGrowth: 35, squadRotation: 0.5, tacticalAdaptability: 0.65, xGOverperformance: 0.5,
      motivationalIntensity: 9, mediaProfile: 6, playerRelationshipScore: 8, boardRelationshipScore: 5,
      transferApproach: 'youth', culturalAdaptability: 7, crisisManagement: 5, avgTenureMonths: 30,
    },
    {
      name: 'Roberto De Zerbi', age: 45, nationality: 'Italy', currentClub: null, yearsInManagement: 8, careerWinRate: 0.45,
      preferredFormation: '4-2-3-1', formationFlexibility: 2, avgPossession: 62, buildUpStyle: 'short', buildUpSpeed: 'slow',
      pressingIntensity: 8, pressingHeight: 50, defensiveLineHeight: 0.72, defensiveCompactness: 0.68, counterAttackFrequency: 4,
      crossingRate: 14, widthInPossession: 0.68, positionalPlayScore: 0.88, setPlayGoalRate: 0.08, pressTriggersPerMatch: 52,
      avgTeamMincut: 0.52, avgPassNetworkDensity: 0.84, avgHubDependency: 0.48, avgFormationStability: 0.65, avgSafeLanesCreated: 2.6,
      youngPlayerMinuteShare: 0.22, debutRate: 4, playerValueGrowth: 40, squadRotation: 0.45, tacticalAdaptability: 0.5, xGOverperformance: -0.5,
      motivationalIntensity: 9, mediaProfile: 6, playerRelationshipScore: 7, boardRelationshipScore: 5,
      transferApproach: 'bargains', culturalAdaptability: 6, crisisManagement: 4, avgTenureMonths: 20,
    },
    {
      name: 'Graham Potter', age: 49, nationality: 'England', currentClub: null, yearsInManagement: 8, careerWinRate: 0.40,
      preferredFormation: '3-4-2-1', formationFlexibility: 5, avgPossession: 55, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 9, pressingHeight: 50, defensiveLineHeight: 0.65, defensiveCompactness: 0.72, counterAttackFrequency: 6,
      crossingRate: 18, widthInPossession: 0.75, positionalPlayScore: 0.65, setPlayGoalRate: 0.12, pressTriggersPerMatch: 50,
      avgTeamMincut: 0.55, avgPassNetworkDensity: 0.75, avgHubDependency: 0.42, avgFormationStability: 0.6, avgSafeLanesCreated: 2.8,
      youngPlayerMinuteShare: 0.25, debutRate: 5, playerValueGrowth: 30, squadRotation: 0.65, tacticalAdaptability: 0.7, xGOverperformance: 0.0,
      motivationalIntensity: 6, mediaProfile: 3, playerRelationshipScore: 8, boardRelationshipScore: 7,
      transferApproach: 'bargains', culturalAdaptability: 6, crisisManagement: 4, avgTenureMonths: 22,
    },
    {
      name: 'Nuno Espirito Santo', age: 50, nationality: 'Portugal', currentClub: null, yearsInManagement: 10, careerWinRate: 0.44,
      preferredFormation: '3-4-3', formationFlexibility: 2, avgPossession: 46, buildUpStyle: 'direct', buildUpSpeed: 'fast',
      pressingIntensity: 11, pressingHeight: 44, defensiveLineHeight: 0.4, defensiveCompactness: 0.85, counterAttackFrequency: 11,
      crossingRate: 24, widthInPossession: 0.65, positionalPlayScore: 0.3, setPlayGoalRate: 0.15, pressTriggersPerMatch: 36,
      avgTeamMincut: 0.65, avgPassNetworkDensity: 0.68, avgHubDependency: 0.55, avgFormationStability: 0.85, avgSafeLanesCreated: 3.2,
      youngPlayerMinuteShare: 0.12, debutRate: 2, playerValueGrowth: 20, squadRotation: 0.35, tacticalAdaptability: 0.4, xGOverperformance: 1.5,
      motivationalIntensity: 7, mediaProfile: 3, playerRelationshipScore: 7, boardRelationshipScore: 6,
      transferApproach: 'bargains', culturalAdaptability: 7, crisisManagement: 6, avgTenureMonths: 20,
    },
    {
      name: 'Marco Silva', age: 47, nationality: 'Portugal', currentClub: null, yearsInManagement: 10, careerWinRate: 0.42,
      preferredFormation: '4-2-3-1', formationFlexibility: 3, avgPossession: 52, buildUpStyle: 'mixed', buildUpSpeed: 'moderate',
      pressingIntensity: 9.5, pressingHeight: 50, defensiveLineHeight: 0.6, defensiveCompactness: 0.7, counterAttackFrequency: 7,
      crossingRate: 22, widthInPossession: 0.72, positionalPlayScore: 0.45, setPlayGoalRate: 0.13, pressTriggersPerMatch: 48,
      avgTeamMincut: 0.52, avgPassNetworkDensity: 0.72, avgHubDependency: 0.52, avgFormationStability: 0.68, avgSafeLanesCreated: 3.0,
      youngPlayerMinuteShare: 0.18, debutRate: 3, playerValueGrowth: 20, squadRotation: 0.45, tacticalAdaptability: 0.55, xGOverperformance: 0.0,
      motivationalIntensity: 7, mediaProfile: 4, playerRelationshipScore: 7, boardRelationshipScore: 6,
      transferApproach: 'balanced', culturalAdaptability: 8, crisisManagement: 5, avgTenureMonths: 18,
    },
    {
      name: 'Unai Emery', age: 53, nationality: 'Spain', currentClub: 'Aston Villa', yearsInManagement: 16, careerWinRate: 0.54,
      preferredFormation: '4-2-3-1', formationFlexibility: 4, avgPossession: 52, buildUpStyle: 'mixed', buildUpSpeed: 'moderate',
      pressingIntensity: 9, pressingHeight: 52, defensiveLineHeight: 0.6, defensiveCompactness: 0.75, counterAttackFrequency: 8,
      crossingRate: 20, widthInPossession: 0.7, positionalPlayScore: 0.55, setPlayGoalRate: 0.14, pressTriggersPerMatch: 52,
      avgTeamMincut: 0.58, avgPassNetworkDensity: 0.74, avgHubDependency: 0.5, avgFormationStability: 0.75, avgSafeLanesCreated: 2.6,
      youngPlayerMinuteShare: 0.15, debutRate: 3, playerValueGrowth: 22, squadRotation: 0.55, tacticalAdaptability: 0.72, xGOverperformance: 1.0,
      motivationalIntensity: 8, mediaProfile: 4, playerRelationshipScore: 7, boardRelationshipScore: 8,
      transferApproach: 'balanced', culturalAdaptability: 9, crisisManagement: 7, avgTenureMonths: 26,
    },
    {
      name: 'Ruben Amorim', age: 39, nationality: 'Portugal', currentClub: 'Manchester United', yearsInManagement: 4, careerWinRate: 0.62,
      preferredFormation: '3-4-3', formationFlexibility: 2, avgPossession: 55, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 8, pressingHeight: 53, defensiveLineHeight: 0.68, defensiveCompactness: 0.76, counterAttackFrequency: 7,
      crossingRate: 18, widthInPossession: 0.74, positionalPlayScore: 0.65, setPlayGoalRate: 0.12, pressTriggersPerMatch: 54,
      avgTeamMincut: 0.60, avgPassNetworkDensity: 0.76, avgHubDependency: 0.42, avgFormationStability: 0.72, avgSafeLanesCreated: 2.6,
      youngPlayerMinuteShare: 0.3, debutRate: 6, playerValueGrowth: 45, squadRotation: 0.5, tacticalAdaptability: 0.6, xGOverperformance: 1.5,
      motivationalIntensity: 8, mediaProfile: 5, playerRelationshipScore: 8, boardRelationshipScore: 7,
      transferApproach: 'youth', culturalAdaptability: 7, crisisManagement: 6, avgTenureMonths: 24,
    },

    // ── Rising stars ────────────────────────────────────────────
    {
      name: 'Thiago Motta', age: 42, nationality: 'Italy', currentClub: 'Juventus', yearsInManagement: 4, careerWinRate: 0.50,
      preferredFormation: '4-2-3-1', formationFlexibility: 3, avgPossession: 58, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 8.5, pressingHeight: 52, defensiveLineHeight: 0.68, defensiveCompactness: 0.74, counterAttackFrequency: 5,
      crossingRate: 16, widthInPossession: 0.7, positionalPlayScore: 0.72, setPlayGoalRate: 0.1, pressTriggersPerMatch: 52,
      avgTeamMincut: 0.62, avgPassNetworkDensity: 0.78, avgHubDependency: 0.42, avgFormationStability: 0.7, avgSafeLanesCreated: 2.5,
      youngPlayerMinuteShare: 0.28, debutRate: 6, playerValueGrowth: 40, squadRotation: 0.6, tacticalAdaptability: 0.6, xGOverperformance: 0.5,
      motivationalIntensity: 7, mediaProfile: 4, playerRelationshipScore: 8, boardRelationshipScore: 7,
      transferApproach: 'youth', culturalAdaptability: 7, crisisManagement: 5, avgTenureMonths: 18,
    },
    {
      name: 'Vincent Kompany', age: 38, nationality: 'Belgium', currentClub: 'Bayern Munich', yearsInManagement: 3, careerWinRate: 0.52,
      preferredFormation: '4-2-3-1', formationFlexibility: 3, avgPossession: 60, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 7.5, pressingHeight: 55, defensiveLineHeight: 0.78, defensiveCompactness: 0.7, counterAttackFrequency: 5,
      crossingRate: 17, widthInPossession: 0.75, positionalPlayScore: 0.75, setPlayGoalRate: 0.1, pressTriggersPerMatch: 56,
      avgTeamMincut: 0.58, avgPassNetworkDensity: 0.80, avgHubDependency: 0.45, avgFormationStability: 0.65, avgSafeLanesCreated: 2.4,
      youngPlayerMinuteShare: 0.25, debutRate: 5, playerValueGrowth: 30, squadRotation: 0.55, tacticalAdaptability: 0.6, xGOverperformance: -0.5,
      motivationalIntensity: 8, mediaProfile: 5, playerRelationshipScore: 8, boardRelationshipScore: 7,
      transferApproach: 'youth', culturalAdaptability: 8, crisisManagement: 5, avgTenureMonths: 18,
    },
    {
      name: 'Oliver Glasner', age: 50, nationality: 'Austria', currentClub: null, yearsInManagement: 8, careerWinRate: 0.46,
      preferredFormation: '3-4-2-1', formationFlexibility: 3, avgPossession: 48, buildUpStyle: 'mixed', buildUpSpeed: 'fast',
      pressingIntensity: 8, pressingHeight: 52, defensiveLineHeight: 0.6, defensiveCompactness: 0.78, counterAttackFrequency: 10,
      crossingRate: 24, widthInPossession: 0.78, positionalPlayScore: 0.35, setPlayGoalRate: 0.14, pressTriggersPerMatch: 50,
      avgTeamMincut: 0.58, avgPassNetworkDensity: 0.72, avgHubDependency: 0.48, avgFormationStability: 0.7, avgSafeLanesCreated: 2.8,
      youngPlayerMinuteShare: 0.18, debutRate: 3, playerValueGrowth: 25, squadRotation: 0.5, tacticalAdaptability: 0.6, xGOverperformance: 1.5,
      motivationalIntensity: 8, mediaProfile: 3, playerRelationshipScore: 7, boardRelationshipScore: 7,
      transferApproach: 'bargains', culturalAdaptability: 7, crisisManagement: 7, avgTenureMonths: 22,
    },
    {
      name: 'Ange Postecoglou', age: 59, nationality: 'Australia', currentClub: 'Tottenham', yearsInManagement: 14, careerWinRate: 0.52,
      preferredFormation: '4-3-3', formationFlexibility: 1, avgPossession: 58, buildUpStyle: 'short', buildUpSpeed: 'fast',
      pressingIntensity: 7.5, pressingHeight: 55, defensiveLineHeight: 0.78, defensiveCompactness: 0.62, counterAttackFrequency: 5,
      crossingRate: 18, widthInPossession: 0.78, positionalPlayScore: 0.6, setPlayGoalRate: 0.09, pressTriggersPerMatch: 56,
      avgTeamMincut: 0.50, avgPassNetworkDensity: 0.74, avgHubDependency: 0.5, avgFormationStability: 0.55, avgSafeLanesCreated: 3.0,
      youngPlayerMinuteShare: 0.2, debutRate: 4, playerValueGrowth: 25, squadRotation: 0.55, tacticalAdaptability: 0.35, xGOverperformance: -1.0,
      motivationalIntensity: 8, mediaProfile: 6, playerRelationshipScore: 8, boardRelationshipScore: 6,
      transferApproach: 'balanced', culturalAdaptability: 8, crisisManagement: 4, avgTenureMonths: 22,
    },
    {
      name: 'Kieran McKenna', age: 38, nationality: 'Northern Ireland', currentClub: null, yearsInManagement: 3, careerWinRate: 0.50,
      preferredFormation: '4-2-3-1', formationFlexibility: 3, avgPossession: 55, buildUpStyle: 'short', buildUpSpeed: 'moderate',
      pressingIntensity: 8, pressingHeight: 52, defensiveLineHeight: 0.68, defensiveCompactness: 0.75, counterAttackFrequency: 7,
      crossingRate: 18, widthInPossession: 0.72, positionalPlayScore: 0.65, setPlayGoalRate: 0.13, pressTriggersPerMatch: 52,
      avgTeamMincut: 0.56, avgPassNetworkDensity: 0.74, avgHubDependency: 0.44, avgFormationStability: 0.72, avgSafeLanesCreated: 2.8,
      youngPlayerMinuteShare: 0.3, debutRate: 6, playerValueGrowth: 50, squadRotation: 0.5, tacticalAdaptability: 0.6, xGOverperformance: 1.0,
      motivationalIntensity: 7, mediaProfile: 3, playerRelationshipScore: 9, boardRelationshipScore: 8,
      transferApproach: 'youth', culturalAdaptability: 6, crisisManagement: 5, avgTenureMonths: 18,
    },
  ];
}

// ---------------------------------------------------------------------------
// 3. Coach-Team Fit scoring
// ---------------------------------------------------------------------------

export interface CoachTeamFit {
  coach: string;
  team: string;
  fitScore: number;
  multiplier: number;
  verdict: 'perfect' | 'strong' | 'good' | 'moderate' | 'poor' | 'mismatch';
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    explanation: string;
  }>;
  squadCompatibility: number;
  styleDelta: number;
  topStrength: string;
  topConcern: string;
  narrative: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map a team style string to a rough possession/counter spectrum 0-1 */
function styleToSpectrum(style: TeamContext['style']): number {
  switch (style) {
    case 'possession': return 0.85;
    case 'pressing': return 0.6;
    case 'balanced': return 0.5;
    case 'counter': return 0.2;
  }
}

/** Count players in a position group from the depth map */
function depthFor(depth: Map<string, number>, positions: string[]): number {
  return positions.reduce((sum, p) => sum + (depth.get(p) ?? 0), 0);
}

/** Does the formation require wing-backs (3-at-back)? */
function isThreeAtBack(formation: string): boolean {
  return formation.startsWith('3');
}

/** Does the formation use wingers explicitly? */
function usesWingers(formation: string): boolean {
  return formation.includes('3-3') || formation.includes('4-3-3') || formation.includes('3-4-3');
}

/** Count available wingers in squad */
function wingerCount(depth: Map<string, number>): number {
  return depthFor(depth, ['LW', 'RW', 'LM', 'RM']);
}

/** Count available centre-backs */
function cbCount(depth: Map<string, number>): number {
  return depthFor(depth, ['CB']);
}

/** Count available wide defenders / wing-backs */
function wbCount(depth: Map<string, number>): number {
  return depthFor(depth, ['LB', 'RB']);
}

/** Avg defensive work rate of squad players (proxy for pressing suitability) */
function avgDefensiveWorkRate(players: ScoutProfile[]): number {
  if (players.length === 0) return 0.5;
  return players.reduce((s, p) => s + p.defensiveWorkRate, 0) / players.length;
}

/** Avg sprint capacity of squad (proxy for counter-attacking and high-line suitability) */
function avgSprintCapacity(players: ScoutProfile[]): number {
  if (players.length === 0) return 22;
  return players.reduce((s, p) => s + p.sprintCapacity, 0) / players.length;
}

/** Avg speed of CBs specifically */
function avgCBSpeed(players: ScoutProfile[]): number {
  const cbs = players.filter(p => p.position === 'CB');
  if (cbs.length === 0) return 5.5;
  return cbs.reduce((s, p) => s + p.avgSpeed, 0) / cbs.length;
}

/** Avg pass completion of midfielders (proxy for build-up quality) */
function avgMidPassCompletion(players: ScoutProfile[]): number {
  const mids = players.filter(p => ['CM', 'CDM', 'CAM'].includes(p.position));
  if (mids.length === 0) return 0.84;
  return mids.reduce((s, p) => s + p.passCompletionRate, 0) / mids.length;
}

/** Average age of the squad */
function avgAge(players: ScoutProfile[]): number {
  if (players.length === 0) return 26;
  return players.reduce((s, p) => s + p.age, 0) / players.length;
}

/** Fraction of squad under 23 */
function youthFraction(players: ScoutProfile[]): number {
  if (players.length === 0) return 0.2;
  return players.filter(p => p.age < 23).length / players.length;
}

// ── Main evaluation ─────────────────────────────────────────────────────────

export function evaluateCoachTeamFit(
  coach: CoachVector,
  team: TeamContext,
  players?: ScoutProfile[],
): CoachTeamFit {
  const teamPlayers = players ?? [];
  const factors: CoachTeamFit['factors'] = [];

  // Factor 1: Tactical Style Match (weight 2.0)
  const teamSpectrum = styleToSpectrum(team.style);
  const coachPossession = (coach.avgPossession ?? 53) / 100;
  const styleDiff = Math.abs(coachPossession - teamSpectrum);
  const styleScore = 1 - styleDiff * 2;
  factors.push({
    name: 'Tactical Style Match',
    score: clamp(styleScore, -1, 1),
    weight: 2.0,
    explanation: styleDiff < 0.15
      ? `${coach.name}'s style aligns naturally with ${team.name}'s current approach`
      : styleDiff < 0.3
        ? `Some tactical adjustment needed - ${coach.name} prefers ${(coach.avgPossession ?? 53)}% possession vs ${team.name}'s ${team.style} style`
        : `Major style overhaul required - ${coach.name} would transform ${team.name}'s playing identity`,
  });

  // Factor 2: Squad Profile Match (weight 2.5) — THE KEY FACTOR
  let squadScore = 0;
  let squadExplanation = '';

  if (teamPlayers.length > 0) {
    const dwr = avgDefensiveWorkRate(teamPlayers);
    const sprint = avgSprintCapacity(teamPlayers);
    const cbSpd = avgCBSpeed(teamPlayers);
    const midPass = avgMidPassCompletion(teamPlayers);

    // Pressing suitability: does squad work rate match coach pressing demands?
    const coachPressingDemand = 1 - ((coach.pressingIntensity ?? 10) - 6) / 8;
    const pressingFit = 1 - Math.abs(dwr - coachPressingDemand) * 2;

    // High-line suitability: fast CBs for high-line coaches
    const lineRisk = (coach.defensiveLineHeight ?? 0.5) > 0.65
      ? (cbSpd - 5.2) / 0.8
      : 0.5;

    // Build-up suitability: short-pass coaches need technical midfielders
    const buildUpFit = coach.buildUpStyle === 'short'
      ? (midPass - 0.8) / 0.12
      : 0.5;

    // Counter-attack suitability: fast forwards needed for transition coaches
    const counterFit = (coach.counterAttackFrequency ?? 6) > 8
      ? (sprint - 20) / 10
      : 0.5;

    squadScore = (pressingFit * 0.3 + clamp(lineRisk, -1, 1) * 0.25
      + clamp(buildUpFit, -1, 1) * 0.25 + clamp(counterFit, -1, 1) * 0.2);

    const weakPoints: string[] = [];
    if (pressingFit < 0.2) weakPoints.push('low work-rate squad vs high pressing demands');
    if (lineRisk < 0 && (coach.defensiveLineHeight ?? 0.5) > 0.65) weakPoints.push('slow CBs exposed by high line');
    if (buildUpFit < 0 && coach.buildUpStyle === 'short') weakPoints.push('midfield lacks passing quality for short build-up');
    if (counterFit < 0 && (coach.counterAttackFrequency ?? 6) > 8) weakPoints.push('squad lacks pace for transitions');

    squadExplanation = weakPoints.length === 0
      ? `${team.name}'s player profiles suit ${coach.name}'s demands well`
      : `Concerns: ${weakPoints.join('; ')}`;
  } else {
    squadScore = 0;
    squadExplanation = 'No individual player data available - using team-level estimates only';
  }

  factors.push({
    name: 'Squad Profile Match',
    score: clamp(squadScore, -1, 1),
    weight: 2.5,
    explanation: squadExplanation,
  });

  // Factor 3: Formation Compatibility (weight 1.5)
  const coachFormation = coach.preferredFormation ?? '4-3-3';
  const coachNeedsThreeAtBack = isThreeAtBack(coachFormation);
  const teamCBs = cbCount(team.positionDepth);
  const teamWBs = wbCount(team.positionDepth);
  const teamWingers = wingerCount(team.positionDepth);

  let formationScore = 0;
  if (coachNeedsThreeAtBack) {
    // 3-at-back needs 5+ CBs and wing-backs
    const cbFit = teamCBs >= 5 ? 0.5 : teamCBs >= 4 ? 0 : -0.5;
    const wbFit = teamWBs >= 4 ? 0.5 : teamWBs >= 3 ? 0.1 : -0.3;
    formationScore = cbFit + wbFit;
  } else {
    // 4-at-back: wingers for 4-3-3, midfield depth for 4-2-3-1
    if (usesWingers(coachFormation)) {
      formationScore = teamWingers >= 6 ? 0.6 : teamWingers >= 4 ? 0.2 : -0.4;
    } else {
      const midDepth = depthFor(team.positionDepth, ['CM', 'CDM', 'CAM']);
      formationScore = midDepth >= 7 ? 0.5 : midDepth >= 5 ? 0.2 : -0.3;
    }
  }

  // Bonus for matching current formation
  if (coachFormation === team.formation) {
    formationScore += 0.3;
  }

  // Flexibility mitigates mismatch
  formationScore += ((coach.formationFlexibility ?? 3) - 3) * 0.1;

  factors.push({
    name: 'Formation Compatibility',
    score: clamp(formationScore, -1, 1),
    weight: 1.5,
    explanation: coachFormation === team.formation
      ? `${coach.name}'s preferred ${coachFormation} matches ${team.name}'s current setup`
      : coachNeedsThreeAtBack && teamCBs < 5
        ? `${coach.name} favours ${coachFormation} but ${team.name} only have ${teamCBs} CBs - recruitment needed`
        : `${coach.name} would switch from ${team.formation} to ${coachFormation}`,
  });

  // Factor 4: Network Structure (weight 1.5)
  const coachHub = coach.avgHubDependency ?? 0.5;
  const teamHub = team.hubDependency;
  const hubDelta = coachHub - teamHub;
  let networkScore = 0;

  // If coach distributes and team is over-reliant on one player = good (rescue)
  if (coachHub < 0.45 && teamHub > 0.6) {
    networkScore = 0.7;
  } else if (Math.abs(hubDelta) < 0.15) {
    networkScore = 0.4;
  } else if (coachHub > 0.6 && teamHub > 0.6) {
    networkScore = 0.1;
  } else {
    networkScore = -0.1 * Math.abs(hubDelta) * 5;
  }

  // Network density match
  const densityDelta = Math.abs((coach.avgPassNetworkDensity ?? 0.75) - team.networkDensity);
  networkScore -= densityDelta;

  factors.push({
    name: 'Network Structure',
    score: clamp(networkScore, -1, 1),
    weight: 1.5,
    explanation: coachHub < 0.45 && teamHub > 0.6
      ? `${coach.name} would reduce ${team.name}'s over-reliance on ${team.hubPlayer}`
      : Math.abs(hubDelta) < 0.15
        ? `${coach.name}'s network approach matches ${team.name}'s current hub dependency`
        : `${coach.name}'s preferred network structure differs significantly from current setup`,
  });

  // Factor 5: Defensive Philosophy Match (weight 1.5)
  const coachLine = coach.defensiveLineHeight ?? 0.5;
  const coachCompact = coach.defensiveCompactness ?? 0.7;
  const teamMincut = team.avgMincut;

  let defScore = 0;
  // High-line coach + high MinCut team = team already solid enough for risk
  if (coachLine > 0.65 && teamMincut > 0.65) {
    defScore = 0.6;
  } else if (coachLine > 0.65 && teamMincut < 0.55) {
    defScore = -0.4;
  } else if (coachLine < 0.45 && teamMincut > 0.6) {
    defScore = 0.3;
  } else {
    defScore = 0.2;
  }

  // Compact coach rescuing a leaky defence
  if (coachCompact > 0.8 && teamMincut < 0.55) {
    defScore += 0.3;
  }

  // MinCut alignment
  const mincutDelta = Math.abs((coach.avgTeamMincut ?? 0.6) - teamMincut);
  defScore -= mincutDelta * 0.5;

  factors.push({
    name: 'Defensive Philosophy Match',
    score: clamp(defScore, -1, 1),
    weight: 1.5,
    explanation: coachLine > 0.65 && teamMincut < 0.55
      ? `${coach.name}'s high defensive line is risky with ${team.name}'s weak MinCut of ${teamMincut.toFixed(2)}`
      : coachCompact > 0.8 && teamMincut < 0.55
        ? `${coach.name}'s defensive compactness could shore up ${team.name}'s leaky defence`
        : `Defensive philosophies are broadly compatible`,
  });

  // Factor 6: Development Profile (weight 1.0)
  let devScore = 0;
  const teamYouth = teamPlayers.length > 0 ? youthFraction(teamPlayers) : 0.2;
  const teamAvgAge = teamPlayers.length > 0 ? avgAge(teamPlayers) : 26;
  const coachYouthShare = coach.youngPlayerMinuteShare ?? 0.15;
  const coachDebutRate = coach.debutRate ?? 3;

  if (teamYouth > 0.3) {
    // Young squad benefits from development coach
    devScore = coachYouthShare > 0.2 ? 0.6 : coachYouthShare > 0.15 ? 0.2 : -0.3;
  } else if (teamAvgAge > 28) {
    // Ageing squad needs win-now mentality
    devScore = coach.careerWinRate > 0.55 ? 0.5 : 0;
  } else {
    devScore = 0.2;
  }

  // Value growth track record
  devScore += ((coach.playerValueGrowth ?? 20) - 20) / 100;

  factors.push({
    name: 'Development Profile',
    score: clamp(devScore, -1, 1),
    weight: 1.0,
    explanation: teamYouth > 0.3 && coachYouthShare > 0.2
      ? `${coach.name}'s track record of developing young players suits ${team.name}'s youthful squad`
      : teamYouth > 0.3 && coachYouthShare < 0.15
        ? `${team.name}'s young squad may not get enough opportunities under ${coach.name}`
        : `Development profile is a reasonable match`,
  });

  // Factor 7: Cultural & Personality Fit (weight 1.0)
  const adaptability = coach.culturalAdaptability ?? 5;
  const boardRel = coach.boardRelationshipScore ?? 5;
  const playerRel = coach.playerRelationshipScore ?? 5;
  const crisis = coach.crisisManagement ?? 5;

  let culturalScore = (adaptability / 10) * 0.3 + (boardRel / 10) * 0.25
    + (playerRel / 10) * 0.25 + (crisis / 10) * 0.2;
  culturalScore = culturalScore * 2 - 1;

  // Teams in crisis get a boost for crisis managers
  if (teamMincut < 0.52 && crisis >= 8) {
    culturalScore += 0.2;
  }

  factors.push({
    name: 'Cultural & Personality Fit',
    score: clamp(culturalScore, -1, 1),
    weight: 1.0,
    explanation: adaptability >= 8
      ? `${coach.name}'s high cultural adaptability makes transition smoother`
      : boardRel < 5
        ? `${coach.name}'s history of board conflicts is a concern`
        : `Personality profile is within normal range for this role`,
  });

  // Factor 8: Performance Track Record (weight 1.0)
  const winRate = coach.careerWinRate;
  const xgOver = coach.xGOverperformance ?? 0;
  const crisisMgmt = coach.crisisManagement ?? 5;

  let perfScore = (winRate - 0.45) * 2 + xgOver * 0.05 + (crisisMgmt - 5) * 0.05;

  factors.push({
    name: 'Performance Track Record',
    score: clamp(perfScore, -1, 1),
    weight: 1.0,
    explanation: winRate > 0.58
      ? `${coach.name}'s ${(winRate * 100).toFixed(0)}% career win rate is elite`
      : winRate > 0.50
        ? `${coach.name}'s ${(winRate * 100).toFixed(0)}% win rate is solid but not dominant`
        : `${coach.name}'s ${(winRate * 100).toFixed(0)}% win rate reflects experience at smaller clubs`,
  });

  // ── Aggregate ───────────────────────────────────────────────
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weightedSum = factors.reduce((s, f) => s + f.score * f.weight, 0);
  const rawScore = weightedSum / totalWeight;

  // Map from [-1, 1] to [0, 100]
  const fitScore = Math.round(clamp((rawScore + 1) * 50, 0, 100));

  // Multiplier: maps fit score to a performance effect
  const multiplier = Number(lerp(0.85, 1.25, fitScore / 100).toFixed(2));

  // Verdict
  let verdict: CoachTeamFit['verdict'];
  if (fitScore >= 80) verdict = 'perfect';
  else if (fitScore >= 70) verdict = 'strong';
  else if (fitScore >= 60) verdict = 'good';
  else if (fitScore >= 50) verdict = 'moderate';
  else if (fitScore >= 35) verdict = 'poor';
  else verdict = 'mismatch';

  // Squad compatibility from factor 2
  const squadCompatibility = Number(
    clamp((factors[1].score + 1) / 2, 0, 1).toFixed(2),
  );

  // Style delta
  const styleDelta = Number(styleDiff.toFixed(2));

  // Top strength and top concern
  const sorted = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight);
  const topStrength = sorted[0].explanation;
  const worst = [...factors].sort((a, b) => a.score * a.weight - b.score * b.weight);
  const topConcern = worst[0].explanation;

  // Narrative generation
  const narrative = generateNarrative(coach, team, fitScore, verdict, factors, squadCompatibility);

  return {
    coach: coach.name,
    team: team.name,
    fitScore,
    multiplier,
    verdict,
    factors,
    squadCompatibility,
    styleDelta,
    topStrength,
    topConcern,
    narrative,
  };
}

function generateNarrative(
  coach: CoachVector,
  team: TeamContext,
  fitScore: number,
  verdict: string,
  factors: CoachTeamFit['factors'],
  squadCompat: number,
): string {
  const bestFactor = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  const worstFactor = [...factors].sort((a, b) => a.score * a.weight - b.score * b.weight)[0];

  const openingPhrases: Record<string, string> = {
    perfect: `${coach.name} is a near-ideal fit for ${team.name}.`,
    strong: `${coach.name} would be a strong appointment at ${team.name}.`,
    good: `${coach.name} is a credible candidate for ${team.name}.`,
    moderate: `${coach.name} at ${team.name} would be a mixed bag.`,
    poor: `${coach.name} at ${team.name} raises serious questions.`,
    mismatch: `${coach.name} at ${team.name} would be a culture shock.`,
  };

  const opening = openingPhrases[verdict] ?? `${coach.name} at ${team.name}: verdict is ${verdict}.`;

  let detail = '';
  if (bestFactor.name === 'Squad Profile Match' && squadCompat > 0.6) {
    detail += ` The squad's player profiles are well-suited to ${coach.name}'s demands.`;
  } else if (bestFactor.name === 'Tactical Style Match') {
    detail += ` The tactical alignment is natural, minimizing transition friction.`;
  } else if (bestFactor.name === 'Network Structure') {
    detail += ` ${coach.name}'s approach to network distribution would address ${team.name}'s structural issues.`;
  } else if (bestFactor.name === 'Performance Track Record') {
    detail += ` ${coach.name}'s proven winning pedigree is the main draw.`;
  } else {
    detail += ` The strongest factor is ${bestFactor.name.toLowerCase()}.`;
  }

  let concern = '';
  if (worstFactor.score < 0) {
    if (worstFactor.name === 'Formation Compatibility') {
      concern += ` However, the formation switch to ${coach.preferredFormation ?? 'a new system'} needs squad reinforcement.`;
    } else if (worstFactor.name === 'Defensive Philosophy Match') {
      concern += ` The defensive transition is the biggest risk — expect growing pains at the back.`;
    } else if (worstFactor.name === 'Squad Profile Match') {
      concern += ` The squad profile is a concern: key players may not suit ${coach.name}'s system.`;
    } else {
      concern += ` The main worry is ${worstFactor.name.toLowerCase()}.`;
    }
  }

  return (opening + detail + concern).trim();
}

// ---------------------------------------------------------------------------
// 4. Cosine similarity for coach comparison
// ---------------------------------------------------------------------------

function coachToNumericVector(c: CoachVector): number[] {
  return [
    c.careerWinRate,
    (c.avgPossession ?? 53) / 100,
    (c.pressingIntensity ?? 10) / 14,
    c.defensiveLineHeight ?? 0.5,
    c.defensiveCompactness ?? 0.7,
    (c.counterAttackFrequency ?? 6) / 14,
    c.widthInPossession ?? 0.7,
    c.positionalPlayScore ?? 0.5,
    c.avgHubDependency ?? 0.5,
    c.avgPassNetworkDensity ?? 0.75,
    c.avgTeamMincut ?? 0.6,
    c.avgFormationStability ?? 0.7,
    (c.buildUpStyle === 'short' ? 1 : c.buildUpStyle === 'mixed' ? 0.5 : 0),
    (c.buildUpSpeed === 'fast' ? 1 : c.buildUpSpeed === 'moderate' ? 0.5 : 0),
    c.youngPlayerMinuteShare ?? 0.15,
    (c.playerValueGrowth ?? 20) / 50,
    c.squadRotation ?? 0.5,
    c.tacticalAdaptability ?? 0.5,
    (c.xGOverperformance ?? 0 + 2) / 6,
    (c.motivationalIntensity ?? 5) / 10,
    (c.mediaProfile ?? 5) / 10,
    (c.playerRelationshipScore ?? 5) / 10,
    (c.culturalAdaptability ?? 5) / 10,
    (c.crisisManagement ?? 5) / 10,
    (c.formationFlexibility ?? 3) / 5,
    (c.setPlayGoalRate ?? 0.12),
    (c.crossingRate ?? 20) / 30,
    (c.pressingHeight ?? 50) / 60,
  ];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// 5. main() — runnable with `npx tsx src/pitch-intel/coach-vector.ts`
// ---------------------------------------------------------------------------

function printSeparator(label: string): void {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`  ${label}`);
  console.log('='.repeat(72));
}

function printFit(fit: CoachTeamFit, rank: number): void {
  const badge = fit.verdict === 'perfect' ? '[PERFECT]'
    : fit.verdict === 'strong' ? '[STRONG]'
    : fit.verdict === 'good' ? '[GOOD]'
    : fit.verdict === 'moderate' ? '[MODERATE]'
    : fit.verdict === 'poor' ? '[POOR]'
    : '[MISMATCH]';

  console.log(`\n  #${rank} ${fit.coach} ${badge}`);
  console.log(`     Fit Score: ${fit.fitScore}/100  |  Multiplier: x${fit.multiplier}  |  Squad Compat: ${(fit.squadCompatibility * 100).toFixed(0)}%  |  Style Delta: ${fit.styleDelta.toFixed(2)}`);
  console.log(`     Strength: ${fit.topStrength}`);
  console.log(`     Concern:  ${fit.topConcern}`);
  console.log(`     Narrative: ${fit.narrative}`);
}

function main(): void {
  const coaches = getCoachDatabase();
  const teams = getTeamDatabase();
  const allPlayers = getPlayerDatabase();

  // Helper: get players for a team (approximate by club name matching)
  function teamPlayers(teamName: string): ScoutProfile[] {
    const clubVariants: Record<string, string[]> = {
      'Tottenham': ['Tottenham Hotspur'],
      'Manchester United': ['Manchester United'],
      'Juventus': ['Juventus'],
      'Chelsea': ['Chelsea'],
      'Napoli': ['Napoli'],
      'Arsenal': ['Arsenal'],
      'Manchester City': ['Manchester City'],
      'Liverpool': ['Liverpool'],
      'Barcelona': ['Barcelona'],
      'Real Madrid': ['Real Madrid'],
      'Inter Milan': ['Inter Milan'],
    };
    const names = clubVariants[teamName] ?? [teamName];
    return allPlayers.filter(p => names.includes(p.club));
  }

  // Teams that might realistically change coaches
  const targetTeamNames = ['Tottenham', 'Manchester United', 'Juventus', 'Chelsea', 'Napoli'];
  const targetTeams = targetTeamNames
    .map(n => teams.find(t => t.name === n))
    .filter((t): t is TeamContext => t !== undefined);

  // Only evaluate coaches who are available (null currentClub) or at other clubs
  // In a real scenario we'd filter to available coaches only, but for analysis
  // we evaluate all coaches for each team

  printSeparator('COACH-TEAM FIT ANALYSIS');
  console.log('  Evaluating the best structural coach-team matches\n');

  for (const team of targetTeams) {
    printSeparator(`${team.name.toUpperCase()} (${team.league})`);
    console.log(`  Current: ${team.formation} | Style: ${team.style} | Hub: ${team.hubPlayer} (dep: ${team.hubDependency}) | MinCut: ${team.avgMincut}`);

    const players = teamPlayers(team.name);
    console.log(`  Players in database: ${players.length}`);

    // Evaluate all coaches except the one currently at this team
    const fits = coaches
      .filter(c => c.currentClub !== team.name && c.currentClub !== team.name.replace(' ', ''))
      .map(c => evaluateCoachTeamFit(c, team, players))
      .sort((a, b) => b.fitScore - a.fitScore);

    // Top 3
    console.log('\n  --- TOP 3 BEST FIT ---');
    fits.slice(0, 3).forEach((f, i) => printFit(f, i + 1));

    // Worst fit
    console.log('\n  --- WORST FIT (for the contrarian angle) ---');
    const worst = fits[fits.length - 1];
    printFit(worst, fits.length);
  }

  // ── Coach Similarity Matrix ──────────────────────────────────
  printSeparator('COACH SIMILARITY MATRIX');
  console.log('  Cosine similarity of coach tactical vectors\n');

  const vectors = coaches.map(c => ({
    name: c.name,
    vec: coachToNumericVector(c),
  }));

  // Find most similar pairs
  const pairs: Array<{ a: string; b: string; sim: number }> = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      pairs.push({
        a: vectors[i].name,
        b: vectors[j].name,
        sim: cosineSimilarity(vectors[i].vec, vectors[j].vec),
      });
    }
  }

  pairs.sort((a, b) => b.sim - a.sim);

  console.log('  MOST SIMILAR COACHES:');
  pairs.slice(0, 10).forEach((p, i) => {
    console.log(`    ${i + 1}. ${p.a.padEnd(24)} <-> ${p.b.padEnd(24)} similarity: ${(p.sim * 100).toFixed(1)}%`);
  });

  console.log('\n  MOST DIFFERENT COACHES:');
  pairs.slice(-5).reverse().forEach((p, i) => {
    console.log(`    ${i + 1}. ${p.a.padEnd(24)} <-> ${p.b.padEnd(24)} similarity: ${(p.sim * 100).toFixed(1)}%`);
  });

  // Per-coach: find each coach's closest tactical twin
  console.log('\n  TACTICAL TWINS (each coach\'s closest match):');
  for (const v of vectors) {
    let bestSim = -1;
    let bestName = '';
    for (const other of vectors) {
      if (other.name === v.name) continue;
      const sim = cosineSimilarity(v.vec, other.vec);
      if (sim > bestSim) {
        bestSim = sim;
        bestName = other.name;
      }
    }
    console.log(`    ${v.name.padEnd(24)} -> ${bestName.padEnd(24)} (${(bestSim * 100).toFixed(1)}%)`);
  }
}

main();
