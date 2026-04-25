import type { PlayerMarker } from '@/context/FieldMarkersContext';

export type BowlingType = 'spin' | 'pace';
export type FieldFormat = 'test' | 'odi' | 't20';
export type OverPhase = 'none' | '1-6' | '7-20' | '1-10' | '11-40' | '41-50';
export type BatterHand = 'right' | 'left';

export type FieldConfig = {
  bowlingType: BowlingType;
  format: FieldFormat;
  overPhase: OverPhase;
  batterHand: BatterHand;
};

export type FieldSetup = {
  id: string;
  name: string;
  markers: PlayerMarker[];
  teamId?: string | null;
  fieldConfig: FieldConfig;
  createdAt: string;
  updatedAt: string;
};
