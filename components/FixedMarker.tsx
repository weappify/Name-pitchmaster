import { Pressable, StyleSheet, Text, View } from 'react-native';

type FixedMarkerProps = {
  circleText: string;
  nameText?: string | null;
  x: number;
  y: number;
  size: number;
  fieldSize: number;
  selected: boolean;
  interactive?: boolean;
  onSelect: () => void;
};

export function FixedMarker({
  circleText,
  nameText,
  x,
  y,
  size,
  fieldSize,
  selected,
  interactive = true,
  onSelect,
}: FixedMarkerProps) {
  const labelOffset = Math.max(2, Math.min(6, size * 0.12));
  const markerContent = (
    <>
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
    </>
  );

  if (!interactive) {
    return (
      <View
        style={[
          styles.container,
          {
            left: x * fieldSize - MARKER_CONTAINER_WIDTH / 2,
            top: y * fieldSize - size / 2,
          },
        ]}>
        {markerContent}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.container,
        {
          left: x * fieldSize - MARKER_CONTAINER_WIDTH / 2,
          top: y * fieldSize - size / 2,
        },
      ]}>
      {markerContent}
    </Pressable>
  );
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
