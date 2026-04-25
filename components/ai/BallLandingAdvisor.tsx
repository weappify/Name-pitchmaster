import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  describeBallLandingSelection,
  getMiniPitchAxisLabels,
  getMiniPitchReferencePositions,
  mapBallLandingPosition,
} from '@/lib/ai/ballLandingMapper';
import type { BatterHand } from '@/types/fieldSetup';
import type { BallLandingSelection } from '@/lib/ai/types';

type BallLandingAdvisorProps = {
  batterHand: BatterHand;
  value: BallLandingSelection | null;
  onChange: (selection: BallLandingSelection) => void;
};

type PitchLayout = {
  width: number;
  height: number;
};

const DEFAULT_LAYOUT: PitchLayout = { width: 1, height: 1 };
const BALL_RADIUS = 12;

function clampBallPosition(value: number, size: number) {
  return Math.min(Math.max(value, BALL_RADIUS), Math.max(size - BALL_RADIUS, BALL_RADIUS));
}

function getBallCenter(selection: BallLandingSelection | null, layout: PitchLayout) {
  const safeWidth = Math.max(layout.width, 1);
  const safeHeight = Math.max(layout.height, 1);
  const fallbackX = safeWidth / 2;
  const fallbackY = safeHeight / 2;

  if (!selection) {
    return { x: fallbackX, y: fallbackY };
  }

  return {
    x: clampBallPosition(selection.x * safeWidth, safeWidth),
    y: clampBallPosition(selection.y * safeHeight, safeHeight),
  };
}

function getSelectionFromPoint(
  locationX: number,
  locationY: number,
  layout: PitchLayout,
  batterHand: BatterHand
) {
  const safeWidth = Math.max(layout.width, 1);
  const safeHeight = Math.max(layout.height, 1);

  return mapBallLandingPosition(
    clampBallPosition(locationX, safeWidth) / safeWidth,
    clampBallPosition(locationY, safeHeight) / safeHeight,
    batterHand
  );
}

export function BallLandingAdvisor({ batterHand, value, onChange }: BallLandingAdvisorProps) {
  const [layout, setLayout] = useState<PitchLayout>(DEFAULT_LAYOUT);
  const layoutRef = useRef<PitchLayout>(DEFAULT_LAYOUT);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastSelectionRef = useRef<BallLandingSelection | null>(value);
  const axisLabels = useMemo(() => getMiniPitchAxisLabels(batterHand), [batterHand]);
  const referencePositions = useMemo(() => getMiniPitchReferencePositions(batterHand), [batterHand]);
  const verticalGuidePositions = useMemo(
    () => [
      referencePositions.wideOff,
      referencePositions.offStump,
      referencePositions.middleStump,
      referencePositions.legStump,
      referencePositions.wideLeg,
    ],
    [referencePositions]
  );
  const stumpMarkerPositions = useMemo(
    () => [referencePositions.offStump, referencePositions.middleStump, referencePositions.legStump],
    [referencePositions]
  );

  useEffect(() => {
    lastSelectionRef.current = value;
  }, [value]);

  const emitSelection = useCallback(
    (nextSelection: BallLandingSelection) => {
      const previousSelection = lastSelectionRef.current;

      if (
        previousSelection &&
        previousSelection.line === nextSelection.line &&
        previousSelection.length === nextSelection.length &&
        Math.abs(previousSelection.x - nextSelection.x) < 0.001 &&
        Math.abs(previousSelection.y - nextSelection.y) < 0.001
      ) {
        return;
      }

      lastSelectionRef.current = nextSelection;
      onChange(nextSelection);
    },
    [onChange]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1,
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragStartRef.current = getBallCenter(lastSelectionRef.current, layoutRef.current);
        },
        onPanResponderMove: (_event, gestureState) => {
          if (!dragStartRef.current) {
            return;
          }

          emitSelection(
            getSelectionFromPoint(
              dragStartRef.current.x + gestureState.dx,
              dragStartRef.current.y + gestureState.dy,
              layoutRef.current,
              batterHand
            )
          );
        },
        onPanResponderRelease: () => {
          dragStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          dragStartRef.current = null;
        },
      }),
    [batterHand, emitSelection]
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextLayout = {
      width: Math.max(event.nativeEvent.layout.width, 1),
      height: Math.max(event.nativeEvent.layout.height, 1),
    };

    layoutRef.current = nextLayout;

    setLayout((currentLayout) =>
      currentLayout.width === nextLayout.width && currentLayout.height === nextLayout.height
        ? currentLayout
        : nextLayout
    );
  };

  const handlePitchPress = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    emitSelection(
      getSelectionFromPoint(
        event.nativeEvent.locationX,
        event.nativeEvent.locationY,
        layoutRef.current,
        batterHand
      )
    );
  };

  const indicatorStyle =
    value !== null
      ? {
          left: Math.max(BALL_RADIUS, Math.min(value.x * layout.width, layout.width - BALL_RADIUS)),
          top: Math.max(BALL_RADIUS, Math.min(value.y * layout.height, layout.height - BALL_RADIUS)),
        }
      : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.axisRow}>
        {axisLabels.map((label) => (
          <Text key={label} style={styles.axisLabel}>
            {label}
          </Text>
        ))}
      </View>

      <Pressable
        onLayout={handleLayout}
        onPress={handlePitchPress}
        style={styles.pitch}
        testID="ball-landing-pitch">
        <View pointerEvents="none" style={styles.verticalGuideLayer}>
          {verticalGuidePositions.map((position, index) => (
            <View
              key={`${batterHand}-guide-${index}`}
              style={[styles.verticalGuideLine, { left: `${position * 100}%` }]}
            />
          ))}
        </View>
        <View style={styles.horizontalGuideShort} />
        <View style={styles.horizontalGuideGood} />
        <View style={styles.horizontalGuideFull} />

        <View pointerEvents="none" style={styles.creaseLayer}>
          <View style={styles.creaseTop} />
          <View style={styles.creaseBottom} />
        </View>
        <View pointerEvents="none" style={styles.stumpMarkerLayer}>
          {stumpMarkerPositions.map((position, index) => (
            <View
              key={`top-stump-${index}`}
              style={[styles.stumpMarker, styles.stumpMarkerTop, { left: `${position * 100}%` }]}
            />
          ))}
          {stumpMarkerPositions.map((position, index) => (
            <View
              key={`bottom-stump-${index}`}
              style={[styles.stumpMarker, styles.stumpMarkerBottom, { left: `${position * 100}%` }]}
            />
          ))}
        </View>

        <Text style={[styles.zoneText, styles.fullText]}>FULL</Text>
        <Text style={[styles.zoneText, styles.goodText]}>GOOD</Text>
        <Text style={[styles.zoneText, styles.shortText]}>SHORT</Text>
        <Text style={[styles.zoneText, styles.yorkerText]}>YORKER</Text>

        {indicatorStyle ? (
          <View style={[styles.indicatorTouchTarget, indicatorStyle]} {...panResponder.panHandlers}>
            <View style={styles.indicator}>
              <View style={styles.indicatorCore} />
              <View style={styles.indicatorSeam} />
            </View>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Selected Ball</Text>
        <Text style={styles.footerValue}>
          {describeBallLandingSelection(value)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  axisLabel: {
    flex: 1,
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  pitch: {
    height: 236,
    borderRadius: 18,
    backgroundColor: '#D9C49A',
    borderWidth: 1,
    borderColor: '#C1A97C',
    overflow: 'hidden',
    position: 'relative',
  },
  verticalGuideLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  verticalGuideLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.42)',
  },
  horizontalGuideShort: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '68%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  horizontalGuideGood: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '38%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  horizontalGuideFull: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '14%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  creaseLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  creaseTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 26,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(248,250,252,0.9)',
  },
  creaseBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 26,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(248,250,252,0.9)',
  },
  stumpMarkerLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  stumpMarker: {
    position: 'absolute',
    width: 7,
    height: 7,
    marginLeft: -3.5,
    borderRadius: 999,
    backgroundColor: '#7C2D12',
  },
  stumpMarkerTop: {
    top: 15,
  },
  stumpMarkerBottom: {
    bottom: 15,
  },
  zoneText: {
    position: 'absolute',
    right: 10,
    color: 'rgba(15, 23, 42, 0.5)',
    fontSize: 9,
    fontWeight: '800',
  },
  shortText: {
    bottom: 8,
  },
  goodText: {
    top: '44%',
  },
  fullText: {
    top: 8,
  },
  yorkerText: {
    top: 28,
    fontSize: 8,
    color: 'rgba(15, 23, 42, 0.42)',
  },
  indicatorTouchTarget: {
    position: 'absolute',
    marginLeft: -22,
    marginTop: -22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    borderRadius: BALL_RADIUS,
    borderWidth: 1.5,
    borderColor: '#7C2D12',
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  indicatorCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF7ED',
  },
  indicatorSeam: {
    position: 'absolute',
    width: 4,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 45, 18, 0.7)',
  },
  footer: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 2,
  },
  footerLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  footerValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
});
