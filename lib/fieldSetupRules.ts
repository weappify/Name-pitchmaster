import type { PlayerMarker } from '@/context/FieldMarkersContext';
import type {
  BatterHand,
  BowlingType,
  FieldConfig,
  FieldFormat,
  OverPhase,
} from '@/types/fieldSetup';

export type MarkerRole = 'fielder' | 'bowler' | 'keeper';

const CANVAS_SIZE = 500;
const CANVAS_CENTER = CANVAS_SIZE / 2;
const INNER_RING_RADIUS = (30 / 70) * 220;

export const DEFAULT_FIELD_CONFIG: FieldConfig = {
  bowlingType: 'pace',
  format: 'test',
  overPhase: 'none',
  batterHand: 'right',
};

export const FORMAT_OPTIONS: { label: string; value: FieldFormat }[] = [
  { label: 'Test / Multi-day', value: 'test' },
  { label: 'ODI', value: 'odi' },
  { label: 'T20', value: 't20' },
];

export const OVER_PHASE_OPTIONS: Record<FieldFormat, { label: string; value: OverPhase }[]> = {
  test: [{ label: 'No restrictions', value: 'none' }],
  odi: [
    { label: '1-10', value: '1-10' },
    { label: '11-40', value: '11-40' },
    { label: '41-50', value: '41-50' },
  ],
  t20: [
    { label: '1-6', value: '1-6' },
    { label: '7-20', value: '7-20' },
  ],
};

type RestrictionRule = {
  label: string;
  maxOutsideRing: number | null;
};

type RestrictionStatus = RestrictionRule & {
  currentOutsideRingCount: number;
  isExceeded: boolean;
};

type SpecialMarkerPosition = Pick<PlayerMarker, 'x' | 'y'>;

const SPECIAL_MARKER_POSITIONS: Record<
  BowlingType,
  {
    b: SpecialMarkerPosition;
    wk: SpecialMarkerPosition;
  }
> = {
  spin: {
    b: { x: 0.5, y: 0.58 },
    wk: { x: 0.5, y: 0.42 },
  },
  pace: {
    b: { x: 0.5, y: 0.66 },
    wk: { x: 0.5, y: 0.38 },
  },
};

export function normalizeFieldConfig(
  value: Partial<FieldConfig> | null | undefined
): FieldConfig {
  const bowlingType =
    value?.bowlingType === 'spin' || value?.bowlingType === 'pace'
      ? value.bowlingType
      : DEFAULT_FIELD_CONFIG.bowlingType;
  const format =
    value?.format === 'test' || value?.format === 'odi' || value?.format === 't20'
      ? value.format
      : DEFAULT_FIELD_CONFIG.format;
  const allowedOverPhases = new Set(OVER_PHASE_OPTIONS[format].map((option) => option.value));
  const overPhase = allowedOverPhases.has(value?.overPhase as OverPhase)
    ? (value?.overPhase as OverPhase)
    : format === 'test'
      ? 'none'
      : OVER_PHASE_OPTIONS[format][0]?.value ?? 'none';
  const batterHand =
    value?.batterHand === 'left' || value?.batterHand === 'right'
      ? value.batterHand
      : DEFAULT_FIELD_CONFIG.batterHand;

  return {
    bowlingType,
    format,
    overPhase,
    batterHand,
  };
}

export function getFieldSideLabels(batterHand: BatterHand) {
  return batterHand === 'left'
    ? {
        left: 'Leg Side',
        right: 'Off Side',
      }
    : {
        left: 'Off Side',
        right: 'Leg Side',
      };
}

export function getFieldNameWithBowlingType(name: string, bowlingType: BowlingType) {
  const trimmedName = name.trim();
  const suffix = `(${bowlingType})`;

  if (trimmedName.toLowerCase().endsWith(suffix)) {
    return trimmedName;
  }

  return `${trimmedName} ${suffix}`;
}

export function getDefaultSpecialPositions(config: FieldConfig) {
  return SPECIAL_MARKER_POSITIONS[config.bowlingType];
}

export function applyDefaultSpecialMarkerPositions(
  markers: PlayerMarker[],
  config: FieldConfig
) {
  const specialPositions = getDefaultSpecialPositions(config);

  return markers.map((marker) => {
    if (marker.id === 'b') {
      return { ...marker, ...specialPositions.b };
    }

    if (marker.id === 'wk') {
      return { ...marker, ...specialPositions.wk };
    }

    return { ...marker };
  });
}

export function getMarkerCircleText(
  marker: Pick<PlayerMarker, 'id' | 'label' | 'playerId'>,
  assignedPlayerNumber: number | null
) {
  if (isBowlerMarker(marker.id)) {
    return 'B';
  }

  if (isWicketkeeperMarker(marker.id)) {
    return 'WK';
  }

  const trimmedLabel = marker.label.trim();
  const defaultLabel = getDefaultMarkerLabel(marker.id);
  const hasManualLabelOverride = trimmedLabel !== '' && trimmedLabel !== defaultLabel;

  if (hasManualLabelOverride) {
    return trimmedLabel;
  }

  if (assignedPlayerNumber !== null) {
    return String(assignedPlayerNumber);
  }

  return trimmedLabel || defaultLabel;
}

export function isBowlerMarker(markerId: string) {
  return markerId.trim().toLowerCase() === 'b';
}

export function isWicketkeeperMarker(markerId: string) {
  return markerId.trim().toLowerCase() === 'wk';
}

export function isFixedRoleMarker(markerId: string) {
  return isBowlerMarker(markerId) || isWicketkeeperMarker(markerId);
}

export function getMarkerRole(markerId: string): MarkerRole {
  if (isBowlerMarker(markerId)) {
    return 'bowler';
  }

  if (isWicketkeeperMarker(markerId)) {
    return 'keeper';
  }

  return 'fielder';
}

export function getMarkerRoleLabel(markerId: string) {
  const role = getMarkerRole(markerId);

  if (role === 'bowler') {
    return 'Bowler';
  }

  if (role === 'keeper') {
    return 'Keeper';
  }

  return 'Fielder';
}

function getDefaultMarkerLabel(markerId: string) {
  const normalizedId = markerId.trim().toLowerCase();

  if (isBowlerMarker(normalizedId)) {
    return 'B';
  }

  if (isWicketkeeperMarker(normalizedId)) {
    return 'WK';
  }

  if (/^f[1-9]$/.test(normalizedId)) {
    return normalizedId.toUpperCase();
  }

  return markerId.trim();
}

export function getAssignedPlayerIds(
  markers: Pick<PlayerMarker, 'id' | 'playerId'>[],
  currentMarkerId?: string | null
) {
  return new Set(
    markers
      .filter((marker) => marker.id !== currentMarkerId)
      .map((marker) => marker.playerId)
      .filter((playerId): playerId is string => Boolean(playerId))
  );
}

export function getDuplicateAssignedPlayerIds(markers: Pick<PlayerMarker, 'playerId'>[]) {
  const counts = new Map<string, number>();

  markers.forEach((marker) => {
    if (!marker.playerId) {
      return;
    }

    counts.set(marker.playerId, (counts.get(marker.playerId) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([playerId]) => playerId);
}

export function getFieldRestrictionRule(config: FieldConfig): RestrictionRule {
  if (config.format === 'test') {
    return {
      label: 'Test / Multi-day',
      maxOutsideRing: null,
    };
  }

  const ruleKey = `${config.format}:${config.overPhase}`;
  const rules: Record<string, RestrictionRule> = {
    't20:1-6': { label: 'T20 overs 1-6', maxOutsideRing: 2 },
    't20:7-20': { label: 'T20 overs 7-20', maxOutsideRing: 5 },
    'odi:1-10': { label: 'ODI overs 1-10', maxOutsideRing: 2 },
    'odi:11-40': { label: 'ODI overs 11-40', maxOutsideRing: 4 },
    'odi:41-50': { label: 'ODI overs 41-50', maxOutsideRing: 5 },
  };

  return (
    rules[ruleKey] ?? {
      label: 'No restrictions',
      maxOutsideRing: null,
    }
  );
}

function isOutsideInnerRing(marker: Pick<PlayerMarker, 'x' | 'y'>) {
  const dx = marker.x * CANVAS_SIZE - CANVAS_CENTER;
  const dy = marker.y * CANVAS_SIZE - CANVAS_CENTER;

  return Math.sqrt(dx * dx + dy * dy) > INNER_RING_RADIUS;
}

export function getFieldRestrictionStatus(
  markers: Pick<PlayerMarker, 'id' | 'x' | 'y'>[],
  config: FieldConfig
): RestrictionStatus {
  const rule = getFieldRestrictionRule(config);
  const currentOutsideRingCount = markers.filter(
    (marker) => marker.id !== 'b' && marker.id !== 'wk' && isOutsideInnerRing(marker)
  ).length;

  return {
    ...rule,
    currentOutsideRingCount,
    isExceeded:
      rule.maxOutsideRing !== null && currentOutsideRingCount > rule.maxOutsideRing,
  };
}

export function getFieldRestrictionMessage(status: RestrictionStatus) {
  if (status.maxOutsideRing === null) {
    return null;
  }

  return `${status.label} allows max ${status.maxOutsideRing} fielders outside the inner ring. Current setup has ${status.currentOutsideRingCount}.`;
}
