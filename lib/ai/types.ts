import type { BatterHand, BowlingType, FieldFormat, OverPhase } from '@/types/fieldSetup';

export type BallLandingLine = 'leg' | 'middle' | 'off' | 'wide_off';
export type BallLandingLength = 'yorker' | 'full' | 'good_length' | 'short';
export type TacticalIntent = 'attacking' | 'balanced' | 'defensive';

export type BallLandingSelection = {
  x: number;
  y: number;
  line: BallLandingLine;
  length: BallLandingLength;
};

export type GhostFielder = {
  id: string;
  label: string;
  x: number;
  y: number;
  role?: string;
};

export type TacticalAdviceFielder = {
  role: string;
  area: string;
  reason: string;
};

export type TacticalAdviceVariant = {
  name: string;
  summary: string;
};

export type CurrentFieldFielder = {
  id: string;
  label: string;
  role: string;
  x: number;
  y: number;
  name?: string;
};

export type TacticalAdviceRequest = {
  batterHand?: BatterHand;
  bowlingType?: BowlingType;
  intent: TacticalIntent;
  line: BallLandingLine;
  length: BallLandingLength;
  selectedBall: {
    x: number;
    y: number;
  };
  currentFieldSummary?: string;
  currentFielders?: CurrentFieldFielder[];
  format?: FieldFormat;
  phase?: OverPhase;
};

export type TacticalAdviceResponse = {
  title: string;
  summary: string;
  tacticalReasoning: string;
  suggestedFielders: TacticalAdviceFielder[];
  riskAreas: string[];
  variants: TacticalAdviceVariant[];
  ghostFielders?: GhostFielder[];
  source?: 'edge' | 'fallback';
};

export const INTENT_OPTIONS: { label: string; value: TacticalIntent }[] = [
  { label: 'Attacking', value: 'attacking' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Defensive', value: 'defensive' },
];
