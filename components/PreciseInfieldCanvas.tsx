import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import { useFieldMarkers } from '@/context/FieldMarkersContext';
import { useTeams } from '@/context/TeamsContext';
import {
  getAssignedPlayerIds,
  getMarkerCircleText,
  getMarkerRole,
  getMarkerRoleLabel,
} from '@/lib/fieldSetupRules';
import type { GhostFielder } from '@/lib/ai/types';
import { FieldAiBar } from './ai/FieldAiBar';
import { computeDisplaySizesForMarkers } from './markerDisplaySizing';
import { DraggableMarker } from './DraggableMarker';
import { FixedMarker } from './FixedMarker';
import { GhostFielderMarker } from './GhostFielderMarker';
import { MarkerInspectorPanel } from './MarkerInspectorPanel';

const CANVAS_SIZE = 500;
const CENTER = CANVAS_SIZE / 2;
const FULL_FIELD_BOUNDARY_RADIUS = 220;
const FULL_INNER_RING_RADIUS = (30 / 70) * FULL_FIELD_BOUNDARY_RADIUS;
const INFIELD_BOUNDARY_RADIUS = 220;
const INFIELD_SCALE_FACTOR = INFIELD_BOUNDARY_RADIUS / FULL_INNER_RING_RADIUS;
const SIDEBAR_WIDTH = 332;

const pitchWidth = 20 * INFIELD_SCALE_FACTOR;
const pitchHeight = 52 * INFIELD_SCALE_FACTOR;
const pitchX = CENTER - pitchWidth / 2;
const pitchY = CENTER - pitchHeight / 2;
const topCreaseY = pitchY + 10 * INFIELD_SCALE_FACTOR;
const bottomCreaseY = pitchY + pitchHeight - 10 * INFIELD_SCALE_FACTOR;

function isInsideInnerRing(x: number, y: number) {
  const dx = x * CANVAS_SIZE - CENTER;
  const dy = y * CANVAS_SIZE - CENTER;

  return Math.sqrt(dx * dx + dy * dy) <= FULL_INNER_RING_RADIUS;
}

function mapFullToInfield(x: number, y: number) {
  const fullX = x * CANVAS_SIZE;
  const fullY = y * CANVAS_SIZE;

  return {
    x: (CENTER + (fullX - CENTER) * INFIELD_SCALE_FACTOR) / CANVAS_SIZE,
    y: (CENTER + (fullY - CENTER) * INFIELD_SCALE_FACTOR) / CANVAS_SIZE,
  };
}

function mapInfieldToFull(x: number, y: number) {
  const infieldX = x * CANVAS_SIZE;
  const infieldY = y * CANVAS_SIZE;
  const reverseScale = FULL_INNER_RING_RADIUS / INFIELD_BOUNDARY_RADIUS;

  return {
    x: (CENTER + (infieldX - CENTER) * reverseScale) / CANVAS_SIZE,
    y: (CENTER + (infieldY - CENTER) * reverseScale) / CANVAS_SIZE,
  };
}

export function PreciseInfieldCanvas() {
  const { width, height } = useWindowDimensions();
  const {
    activeFieldConfig,
    activeTeamId,
    markers,
    updateMarkerDetails,
    updateMarkerPosition,
    swapMarkerRole,
    syncSizeToAllMarkers,
  } = useFieldMarkers();
  const { getPlayerName, getPlayerNumber, getPlayersForTeam, getTeamName } = useTeams();
  const canvasSize = Math.max(260, Math.min(width - SIDEBAR_WIDTH - 36, height - 24, 950));
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [isMarkerDragging, setIsMarkerDragging] = useState(false);
  const [ghostFielders, setGhostFielders] = useState<GhostFielder[]>([]);

  const visibleMarkers = useMemo(
    () => {
      const nextVisibleMarkers = markers
      .filter((marker) => isInsideInnerRing(marker.x, marker.y))
      .map((marker) => ({
        ...marker,
        circleText: getMarkerCircleText(marker, getPlayerNumber(activeTeamId, marker.playerId)),
        nameText:
          marker.name?.trim() ||
          (marker.playerId ? getPlayerName(marker.playerId) ?? null : null),
        mappedPosition: mapFullToInfield(marker.x, marker.y),
      }));

      const displaySizes = computeDisplaySizesForMarkers(
        nextVisibleMarkers.map((marker) => ({
          size: marker.size,
          x: marker.mappedPosition.x,
          y: marker.mappedPosition.y,
        })),
        CANVAS_SIZE,
        'precise'
      );

      return nextVisibleMarkers.map((marker, index) => ({
        ...marker,
        displaySize: displaySizes[index],
      }));
    },
    [activeTeamId, getPlayerName, getPlayerNumber, markers]
  );

  const selectedMarker = markers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const assignedPlayerIds = getAssignedPlayerIds(markers, selectedMarkerId);
  const selectedVisibleMarker = visibleMarkers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const selectedRole = selectedMarker ? getMarkerRole(selectedMarker.id) : null;
  const selectedRoleLabel = selectedMarker ? getMarkerRoleLabel(selectedMarker.id) : null;
  const currentTeamName = getTeamName(activeTeamId);
  const availableTeamPlayers = getPlayersForTeam(activeTeamId).map((player, index) => ({
    ...player,
    number: index + 1,
    disabled: assignedPlayerIds.has(player.id),
  }));
  const advancedInspector = selectedMarker && !isMarkerDragging && selectedRole && selectedRoleLabel ? (
    <View pointerEvents="box-none" style={styles.advancedInspectorContainer}>
      <MarkerInspectorPanel
        displayNumber={selectedVisibleMarker?.circleText ?? selectedMarker.label}
        name={selectedMarker.name ?? ''}
        size={selectedMarker.size}
        role={selectedRole}
        roleLabel={selectedRoleLabel}
        roleOptions={[
          { value: 'fielder' as const, label: 'Fielder', disabled: selectedRole !== 'fielder' },
          { value: 'bowler' as const, label: 'Bowler' },
          { value: 'keeper' as const, label: 'Keeper' },
        ]}
        teamName={currentTeamName}
        assignedPlayerId={selectedMarker.playerId}
        assignedPlayerName={getPlayerName(selectedMarker.playerId) ?? null}
        assignedPlayerNumber={getPlayerNumber(activeTeamId, selectedMarker.playerId)}
        availablePlayers={availableTeamPlayers}
        onClose={() => setSelectedMarkerId(null)}
        onNameChange={(name) => updateMarkerDetails(selectedMarker.id, { name })}
        onRoleChange={(nextRole) => {
          if (nextRole === 'fielder' || nextRole === selectedRole) {
            return;
          }

          swapMarkerRole(selectedMarker.id, nextRole);
          setSelectedMarkerId(nextRole === 'bowler' ? 'b' : 'wk');
        }}
        onSizeChange={(size) => updateMarkerDetails(selectedMarker.id, { size })}
        onSyncSize={() => syncSizeToAllMarkers(selectedMarker.size)}
        onAssignPlayer={(playerId) => {
          if (playerId && assignedPlayerIds.has(playerId)) {
            return;
          }

          updateMarkerDetails(selectedMarker.id, { playerId: playerId ?? undefined });
        }}
      />
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.editorShell}>
        <View style={[styles.canvasContainer, { width: canvasSize, height: canvasSize }]}>
          {advancedInspector}
          <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={INFIELD_BOUNDARY_RADIUS}
              fill="#2E8F46"
              stroke="#17381E"
              strokeWidth="4"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={INFIELD_BOUNDARY_RADIUS}
              fill="none"
              stroke="#F7FBF4"
              strokeWidth="2.5"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={INFIELD_BOUNDARY_RADIUS - 10}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="12"
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={INFIELD_BOUNDARY_RADIUS}
              fill="none"
              stroke="rgba(248,252,246,0.95)"
              strokeWidth="2.4"
              strokeDasharray="2 10"
              strokeLinecap="round"
            />

            <Rect
              x={pitchX}
              y={pitchY}
              width={pitchWidth}
              height={pitchHeight}
              rx="4"
              fill="#D0AE76"
              stroke="#F6E8CB"
              strokeWidth="2.5"
            />
            <Rect
              x={pitchX + 3}
              y={pitchY + 10 * INFIELD_SCALE_FACTOR}
              width={pitchWidth - 6}
              height={pitchHeight - 20 * INFIELD_SCALE_FACTOR}
              rx="3"
              fill="rgba(196,157,99,0.58)"
            />

            <G stroke="#FFFFFF" strokeWidth="2.4">
              <Line
                x1={pitchX - 10 * INFIELD_SCALE_FACTOR}
                y1={topCreaseY}
                x2={pitchX + pitchWidth + 10 * INFIELD_SCALE_FACTOR}
                y2={topCreaseY}
              />
              <Line
                x1={pitchX - 10 * INFIELD_SCALE_FACTOR}
                y1={bottomCreaseY}
                x2={pitchX + pitchWidth + 10 * INFIELD_SCALE_FACTOR}
                y2={bottomCreaseY}
              />
            </G>

            <G stroke="#5A311A" strokeWidth="2.4" strokeLinecap="round">
              <Line
                x1={CENTER - 5 * INFIELD_SCALE_FACTOR}
                y1={topCreaseY - 6 * INFIELD_SCALE_FACTOR}
                x2={CENTER - 5 * INFIELD_SCALE_FACTOR}
                y2={topCreaseY}
              />
              <Line
                x1={CENTER}
                y1={topCreaseY - 6 * INFIELD_SCALE_FACTOR}
                x2={CENTER}
                y2={topCreaseY}
              />
              <Line
                x1={CENTER + 5 * INFIELD_SCALE_FACTOR}
                y1={topCreaseY - 6 * INFIELD_SCALE_FACTOR}
                x2={CENTER + 5 * INFIELD_SCALE_FACTOR}
                y2={topCreaseY}
              />

              <Line
                x1={CENTER - 5 * INFIELD_SCALE_FACTOR}
                y1={bottomCreaseY}
                x2={CENTER - 5 * INFIELD_SCALE_FACTOR}
                y2={bottomCreaseY + 6 * INFIELD_SCALE_FACTOR}
              />
              <Line
                x1={CENTER}
                y1={bottomCreaseY}
                x2={CENTER}
                y2={bottomCreaseY + 6 * INFIELD_SCALE_FACTOR}
              />
              <Line
                x1={CENTER + 5 * INFIELD_SCALE_FACTOR}
                y1={bottomCreaseY}
                x2={CENTER + 5 * INFIELD_SCALE_FACTOR}
                y2={bottomCreaseY + 6 * INFIELD_SCALE_FACTOR}
              />
            </G>
          </Svg>

          <View pointerEvents="box-none" style={styles.markersLayer}>
            {ghostFielders
              .filter((ghost) => isInsideInnerRing(ghost.x, ghost.y))
              .map((ghost) => {
                const mappedPosition = mapFullToInfield(ghost.x, ghost.y);

                return (
                  <GhostFielderMarker
                    key={ghost.id}
                    ghost={{ ...ghost, x: mappedPosition.x, y: mappedPosition.y }}
                    fieldSize={canvasSize}
                    size={20}
                  />
                );
              })}

            {visibleMarkers.map((marker) =>
              marker.draggable ? (
                <DraggableMarker
                  key={marker.id}
                  circleText={marker.circleText}
                  nameText={marker.nameText}
                  x={marker.mappedPosition.x}
                  y={marker.mappedPosition.y}
                  size={marker.displaySize}
                  selected={marker.id === selectedMarkerId}
                  fieldSize={canvasSize}
                  currentScale={1}
                  canvasSize={CANVAS_SIZE}
                  canvasCenter={CENTER}
                  boundaryRadius={INFIELD_BOUNDARY_RADIUS}
                  markerRadius={marker.displaySize / 2}
                  onSelect={() => setSelectedMarkerId(marker.id)}
                  onDragStateChange={setIsMarkerDragging}
                  onPositionChange={(x, y) => {
                    const mappedBack = mapInfieldToFull(x, y);
                    updateMarkerPosition(marker.id, mappedBack.x, mappedBack.y);
                  }}
                />
              ) : (
                <FixedMarker
                  key={marker.id}
                  circleText={marker.circleText}
                  nameText={marker.nameText}
                  x={marker.mappedPosition.x}
                  y={marker.mappedPosition.y}
                  size={marker.displaySize}
                  fieldSize={canvasSize}
                  selected={marker.id === selectedMarkerId}
                  onSelect={() => setSelectedMarkerId(marker.id)}
                />
              )
            )}
          </View>

        </View>

        <FieldAiBar
          markers={markers}
          fieldConfig={activeFieldConfig}
          onGhostFieldersChange={setGhostFielders}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EB',
    padding: 12,
  },
  editorShell: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasContainer: {
    position: 'relative',
  },
  markersLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  advancedInspectorContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
});
