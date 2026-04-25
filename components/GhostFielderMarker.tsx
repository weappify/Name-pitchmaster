import { StyleSheet, Text, View } from 'react-native';

import type { GhostFielder } from '@/lib/ai/types';

type GhostFielderMarkerProps = {
  ghost: GhostFielder;
  fieldSize: number;
  size?: number;
};

const CONTAINER_WIDTH = 88;

export function GhostFielderMarker({
  ghost,
  fieldSize,
  size = 24,
}: GhostFielderMarkerProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left: ghost.x * fieldSize - CONTAINER_WIDTH / 2,
          top: ghost.y * fieldSize - size / 2,
        },
      ]}>
      <View
        style={[
          styles.marker,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}>
        <Text numberOfLines={1} style={styles.circleText}>
          {ghost.label.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <Text numberOfLines={1} style={styles.labelText}>
        {ghost.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: CONTAINER_WIDTH,
    alignItems: 'center',
    opacity: 0.5,
  },
  marker: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#0F172A',
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    color: '#334155',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  labelText: {
    marginTop: 3,
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
});
