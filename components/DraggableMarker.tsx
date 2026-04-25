import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

type DraggableMarkerProps = {
  circleText: string;
  nameText?: string | null;
  x: number;
  y: number;
  size: number;
  selected: boolean;
  fieldSize: number;
  currentScale: number;
  canvasSize: number;
  canvasCenter: number;
  boundaryRadius: number;
  markerRadius: number;
  interactive?: boolean;
  onSelect: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onPositionChange: (x: number, y: number) => void;
};

export function DraggableMarker({
  circleText,
  nameText,
  x,
  y,
  size,
  selected,
  fieldSize,
  currentScale,
  canvasSize,
  canvasCenter,
  boundaryRadius,
  markerRadius,
  interactive = true,
  onSelect,
  onDragStateChange,
  onPositionChange,
}: DraggableMarkerProps) {
  const labelOffset = Math.max(2, Math.min(6, size * 0.12));
  const markerX = useSharedValue(x);
  const markerY = useSharedValue(y);
  const startX = useSharedValue(x);
  const startY = useSharedValue(y);

  useEffect(() => {
    markerX.value = x;
    markerY.value = y;
  }, [markerX, markerY, x, y]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(onDragStateChange ?? (() => undefined))(true);
      startX.value = markerX.value;
      startY.value = markerY.value;
    })
    .onUpdate((event) => {
      const safeScale = currentScale > 0 && Number.isFinite(currentScale) ? currentScale : 1;
      const safeFieldSize = fieldSize > 0 && Number.isFinite(fieldSize) ? fieldSize : 1;
      const nextX = startX.value + event.translationX / (safeFieldSize * safeScale);
      const nextY = startY.value + event.translationY / (safeFieldSize * safeScale);

      const min = markerRadius / canvasSize;
      const max = 1 - min;
      const safeX = Math.min(Math.max(nextX, min), max);
      const safeY = Math.min(Math.max(nextY, min), max);

      const canvasX = safeX * canvasSize;
      const canvasY = safeY * canvasSize;
      const dx = canvasX - canvasCenter;
      const dy = canvasY - canvasCenter;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = boundaryRadius - markerRadius;

      if (distance <= maxDistance || distance === 0) {
        markerX.value = safeX;
        markerY.value = safeY;
        return;
      }

      const ratio = maxDistance / distance;

      markerX.value = (canvasCenter + dx * ratio) / canvasSize;
      markerY.value = (canvasCenter + dy * ratio) / canvasSize;
    })
    .onEnd(() => {
      runOnJS(onDragStateChange ?? (() => undefined))(false);
      runOnJS(onPositionChange)(markerX.value, markerY.value);
    })
    .onFinalize(() => {
      runOnJS(onDragStateChange ?? (() => undefined))(false);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)();
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: markerX.value * fieldSize - MARKER_CONTAINER_WIDTH / 2 },
      { translateY: markerY.value * fieldSize - size / 2 },
    ],
  }));

  const markerContent = (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
      ]}>
      <View
        style={[
          styles.marker,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: selected ? '#FACC15' : '#9CA3AF',
            borderWidth: selected ? 3 : 2,
          },
        ]}>
        <Text numberOfLines={1} style={styles.circleText}>
          {circleText}
        </Text>
      </View>
      {nameText ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.nameText, { marginTop: labelOffset }]}>
          {nameText}
        </Text>
      ) : null}
    </Animated.View>
  );

  if (!interactive) {
    return markerContent;
  }

  return <GestureDetector gesture={Gesture.Race(panGesture, tapGesture)}>{markerContent}</GestureDetector>;
}

const MARKER_CONTAINER_WIDTH = 84;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: MARKER_CONTAINER_WIDTH,
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  nameText: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
});
