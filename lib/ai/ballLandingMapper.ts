import type { BatterHand } from '@/types/fieldSetup';
import type { BallLandingLength, BallLandingLine, BallLandingSelection } from './types';

export const LINE_LABELS: Record<BallLandingLine, string> = {
  leg: 'Leg-side line',
  middle: 'Middle-stump line',
  off: 'Off-stump line',
  wide_off: 'Wide outside off',
};

export const LENGTH_LABELS: Record<BallLandingLength, string> = {
  yorker: 'Yorker length',
  full: 'Full length',
  good_length: 'Good length',
  short: 'Short length',
};

const MINI_PITCH_COLUMN_BOUNDARY_ONE = 0.25;
const MINI_PITCH_COLUMN_BOUNDARY_TWO = 0.5;
const MINI_PITCH_COLUMN_BOUNDARY_THREE = 0.75;

export function getMiniPitchReferencePositions(batterHand: BatterHand) {
  return batterHand === 'left'
    ? {
        wideOff: 0.875,
        offStump: 0.625,
        middleStump: 0.375,
        legStump: 0.125,
        wideLeg: 0.06,
      }
    : {
        wideOff: 0.125,
        offStump: 0.375,
        middleStump: 0.625,
        legStump: 0.875,
        wideLeg: 0.94,
      };
}

export function getMiniPitchAxisLabels(batterHand: BatterHand) {
  return batterHand === 'left'
    ? ['LEG', 'MIDDLE', 'OFF', 'WIDE OFF']
    : ['WIDE OFF', 'OFF', 'MIDDLE', 'LEG'];
}

export function clampNormalized(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function mapBallLandingPosition(
  x: number,
  y: number,
  batterHand: BatterHand = 'right'
): BallLandingSelection {
  const safeX = clampNormalized(x);
  const safeY = clampNormalized(y);

  let line: BallLandingLine = 'middle';

  if (batterHand === 'left') {
    if (safeX < MINI_PITCH_COLUMN_BOUNDARY_ONE) {
      line = 'leg';
    } else if (safeX < MINI_PITCH_COLUMN_BOUNDARY_TWO) {
      line = 'middle';
    } else if (safeX < MINI_PITCH_COLUMN_BOUNDARY_THREE) {
      line = 'off';
    } else {
      line = 'wide_off';
    }
  } else if (safeX < MINI_PITCH_COLUMN_BOUNDARY_ONE) {
    line = 'wide_off';
  } else if (safeX < MINI_PITCH_COLUMN_BOUNDARY_TWO) {
    line = 'off';
  } else if (safeX < MINI_PITCH_COLUMN_BOUNDARY_THREE) {
    line = 'middle';
  } else {
    line = 'leg';
  }

  let length: BallLandingLength = 'good_length';

  if (safeY < 0.14) {
    length = 'yorker';
  } else if (safeY < 0.38) {
    length = 'full';
  } else if (safeY < 0.68) {
    length = 'good_length';
  } else {
    length = 'short';
  }

  return {
    x: safeX,
    y: safeY,
    line,
    length,
  };
}

export function describeBallLandingSelection(selection: BallLandingSelection | null) {
  if (!selection) {
    return 'Choose a delivery spot to analyse';
  }

  return `${LENGTH_LABELS[selection.length]} on ${LINE_LABELS[selection.line].toLowerCase()}`;
}
