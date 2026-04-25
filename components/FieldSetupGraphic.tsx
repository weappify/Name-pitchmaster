import { StyleSheet, View } from 'react-native';

import { FieldCanvas } from '@/components/FieldCanvas';
import type { FieldSetup } from '@/types/fieldSetup';
import type { Player } from '@/types/player';
import type { Team } from '@/types/team';

type FieldSetupGraphicProps = {
  setup: FieldSetup;
  size?: number;
  scale?: number;
  teamsOverride?: Team[];
  playersOverride?: Player[];
};

export function FieldSetupGraphic({
  setup,
  size = 240,
  scale = 0.58,
  teamsOverride,
  playersOverride,
}: FieldSetupGraphicProps) {
  const safeScale = scale > 0 ? scale : 1;
  const baseSize = size / safeScale;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View
        style={[
          styles.scaledCanvas,
          {
            width: baseSize,
            height: baseSize,
            transform: [{ scale: safeScale }],
          },
        ]}>
        <FieldCanvas
          mode="full"
          interactionMode="preview"
          markersOverride={setup.markers}
          teamIdOverride={setup.teamId ?? null}
          fieldConfigOverride={setup.fieldConfig}
          teamsOverride={teamsOverride}
          playersOverride={playersOverride}
          fieldSizeOverride={baseSize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaledCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
