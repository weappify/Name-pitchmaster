import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FIELD_TEMPLATES } from '@/constants/fieldTemplates';
import {
  createInitialMarkers,
  type PlayerMarker,
  useFieldMarkers,
} from '@/context/FieldMarkersContext';
import {
  DEFAULT_FIELD_CONFIG,
  applyDefaultSpecialMarkerPositions,
  getFieldSideLabels,
  getAssignedPlayerIds,
  getDuplicateAssignedPlayerIds,
  getFieldNameWithBowlingType,
  getMarkerCircleText,
  getMarkerRole,
  getMarkerRoleLabel,
  normalizeFieldConfig,
} from '@/lib/fieldSetupRules';
import type { GhostFielder } from '@/lib/ai/types';
import { useTeams } from '@/context/TeamsContext';
import {
  deleteFieldSetup,
  duplicateFieldSetup,
  getAllFieldSetups,
  saveFieldSetup,
  updateFieldSetup,
} from '@/storage/fieldStorage';
import { getLinkedNoteForFieldSetup, saveNote } from '@/storage/noteStorage';
import type { FieldConfig, FieldSetup } from '@/types/fieldSetup';
import type { NoteItem } from '@/types/noteItem';
import type { Player } from '@/types/player';
import type { FieldTemplate } from '@/types/fieldTemplate';
import type { Team } from '@/types/team';
import { FieldAiBar } from './ai/FieldAiBar';
import { computeDisplaySizesForMarkers } from './markerDisplaySizing';
import { FieldTemplatesModal } from './FieldTemplatesModal';
import { FieldSetupsModal } from './FieldSetupsModal';
import { DraggableMarker } from './DraggableMarker';
import { FixedMarker } from './FixedMarker';
import { GhostFielderMarker } from './GhostFielderMarker';
import { LinkedNoteCard } from './LinkedNoteCard';
import { MarkerInspectorPanel } from './MarkerInspectorPanel';
import { QuickAddNoteModal } from './QuickAddNoteModal';
import { SaveSetupModal } from './SaveSetupModal';

type FieldCanvasProps = {
  mode?: 'full' | 'infield';
  interactionMode?: 'editor' | 'preview';
  markersOverride?: PlayerMarker[];
  teamIdOverride?: string | null;
  fieldConfigOverride?: FieldConfig;
  teamsOverride?: Team[];
  playersOverride?: Player[];
  fieldSizeOverride?: number;
  openCreateFieldOnMount?: boolean;
  onCreateFieldModalHandled?: () => void;
  onOpenPreciseInfield?: () => void;
};

const FULL_MIN_SCALE = 1;
const FULL_MAX_SCALE = 8;
const INFIELD_MIN_SCALE = 2.2;
const INFIELD_MAX_SCALE = 12;
const CANVAS_SIZE = 500;
const CENTER = CANVAS_SIZE / 2;
const BOUNDARY_RADIUS = 220;
const SIDEBAR_WIDTH = 332;

type DisplayMarker = ReturnType<typeof useFieldMarkers>['markers'][number] & {
  displaySize: number;
  circleText: string;
  nameText: string | null;
};

export function FieldCanvas({
  mode = 'full',
  interactionMode = 'editor',
  markersOverride,
  teamIdOverride,
  fieldConfigOverride,
  teamsOverride = [],
  playersOverride = [],
  fieldSizeOverride,
  openCreateFieldOnMount = false,
  onCreateFieldModalHandled,
  onOpenPreciseInfield,
}: FieldCanvasProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    markers,
    activeSetupId,
    activeSetupName,
    activeTeamId,
    activeFieldConfig,
    loadFieldSetup,
    replaceMarkers,
    setActiveSetupMeta,
    setActiveTeamId,
    updateMarkerDetails,
    updateMarkerPosition,
    swapMarkerRole,
    syncSizeToAllMarkers,
  } = useFieldMarkers();
  const {
    getPlayerName: getPlayerNameFromContext,
    getPlayerNumber: getPlayerNumberFromContext,
    getPlayersForTeam: getPlayersForTeamFromContext,
    getTeamName: getTeamNameFromContext,
    players: contextPlayers,
    teams: contextTeams,
  } = useTeams();
  const isPreview = interactionMode === 'preview';
  const sourceMarkers = markersOverride ?? markers;
  const resolvedTeamId = teamIdOverride ?? activeTeamId;
  const resolvedFieldConfig = normalizeFieldConfig(fieldConfigOverride ?? activeFieldConfig);
  const resolvedTeams = useMemo(
    () => (teamsOverride.length > 0 ? teamsOverride : contextTeams ?? []),
    [contextTeams, teamsOverride]
  );
  const resolvedPlayers = useMemo(
    () => (playersOverride.length > 0 ? playersOverride : contextPlayers ?? []),
    [contextPlayers, playersOverride]
  );
  const fieldSize =
    fieldSizeOverride ??
    Math.max(
      260,
      Math.min(
        width - (isPreview ? 32 : mode === 'full' ? SIDEBAR_WIDTH + 48 : SIDEBAR_WIDTH + 36),
        height - 32,
        mode === 'infield' ? 1100 : 900
      )
    );
  const defaultScale = mode === 'infield' ? 2.4 : 1;
  const minScale = mode === 'infield' ? INFIELD_MIN_SCALE : FULL_MIN_SCALE;
  const maxScale = mode === 'infield' ? INFIELD_MAX_SCALE : FULL_MAX_SCALE;
  const sideLabels = useMemo(
    () => getFieldSideLabels(resolvedFieldConfig.batterHand),
    [resolvedFieldConfig.batterHand]
  );

  const getTeamName = useCallback(
    (teamId: string | null | undefined) => {
      if (teamsOverride.length === 0) {
        return getTeamNameFromContext(teamId);
      }

      if (!teamId) {
        return null;
      }

      return resolvedTeams.find((team) => team.id === teamId)?.name ?? null;
    },
    [getTeamNameFromContext, resolvedTeams, teamsOverride.length]
  );

  const getPlayersForTeam = useCallback(
    (teamId: string | null | undefined) => {
      if (teamsOverride.length === 0 || playersOverride.length === 0) {
        return getPlayersForTeamFromContext(teamId);
      }

      if (!teamId) {
        return [] as Player[];
      }

      const team = resolvedTeams.find((item) => item.id === teamId);

      if (!team) {
        return [] as Player[];
      }

      return team.playerIds
        .map((playerId) => resolvedPlayers.find((player) => player.id === playerId))
        .filter((player): player is Player => Boolean(player));
    },
    [
      getPlayersForTeamFromContext,
      playersOverride.length,
      resolvedPlayers,
      resolvedTeams,
      teamsOverride.length,
    ]
  );

  const getPlayerName = useCallback(
    (playerId: string | null | undefined) => {
      if (playersOverride.length === 0) {
        return getPlayerNameFromContext(playerId);
      }

      if (!playerId) {
        return null;
      }

      return resolvedPlayers.find((player) => player.id === playerId)?.name ?? null;
    },
    [getPlayerNameFromContext, playersOverride.length, resolvedPlayers]
  );

  const getPlayerNumber = useCallback(
    (teamId: string | null | undefined, playerId: string | null | undefined) => {
      if (teamsOverride.length === 0 || playersOverride.length === 0) {
        return getPlayerNumberFromContext(teamId, playerId);
      }

      if (!teamId || !playerId) {
        return null;
      }

      const team = resolvedTeams.find((item) => item.id === teamId);

      if (!team) {
        return null;
      }

      const playerIndex = team.playerIds.findIndex((id) => id === playerId);
      return playerIndex >= 0 ? playerIndex + 1 : null;
    },
    [getPlayerNumberFromContext, playersOverride.length, resolvedTeams, teamsOverride.length]
  );

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [currentScale, setCurrentScale] = useState(defaultScale);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isCreateFieldModalVisible, setIsCreateFieldModalVisible] = useState(false);
  const [isSavedSetupsVisible, setIsSavedSetupsVisible] = useState(false);
  const [isTemplatesVisible, setIsTemplatesVisible] = useState(false);
  const [isCustomFieldModalVisible, setIsCustomFieldModalVisible] = useState(false);
  const [isQuickNoteVisible, setIsQuickNoteVisible] = useState(false);
  const [isMarkerDragging, setIsMarkerDragging] = useState(false);
  const [ghostFielders, setGhostFielders] = useState<GhostFielder[]>([]);
  const [savedSetups, setSavedSetups] = useState<FieldSetup[]>([]);
  const [linkedNote, setLinkedNote] = useState<NoteItem | null>(null);

  const scale = useSharedValue(defaultScale);
  const startScale = useSharedValue(defaultScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startTranslateX = useSharedValue(0);
  const startTranslateY = useSharedValue(0);

  const innerRingRadius = (30 / 70) * BOUNDARY_RADIUS;
  const innerRingMarks = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const angle = (index / 48) * Math.PI * 2;
        const angleOffset = 0.04;
        const x1 = CENTER + innerRingRadius * Math.cos(angle - angleOffset);
        const y1 = CENTER + innerRingRadius * Math.sin(angle - angleOffset);
        const x2 = CENTER + innerRingRadius * Math.cos(angle + angleOffset);
        const y2 = CENTER + innerRingRadius * Math.sin(angle + angleOffset);

        return <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} />;
      }),
    [innerRingRadius]
  );

  const pitchWidth = 20;
  const pitchHeight = 52;
  const pitchX = CENTER - pitchWidth / 2;
  const pitchY = CENTER - pitchHeight / 2;
  const topCreaseY = pitchY + 10;
  const bottomCreaseY = pitchY + pitchHeight - 10;

  const selectedMarker = isPreview
    ? null
    : sourceMarkers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const assignedPlayerIds = useMemo(
    () => getAssignedPlayerIds(sourceMarkers, selectedMarkerId),
    [selectedMarkerId, sourceMarkers]
  );

  const getMarkerDisplayName = useCallback(
    (marker: PlayerMarker) => {
      const manualName = marker.name?.trim();

      if (manualName) {
        return manualName;
      }

      return marker.playerId ? getPlayerName(marker.playerId) ?? null : null;
    },
    [getPlayerName]
  );

  const displayMarkers = useMemo<DisplayMarker[]>(() => {
    if (mode !== 'full') {
      return sourceMarkers.map((marker) => ({
        ...marker,
        displaySize: marker.size,
        circleText: getMarkerCircleText(
          marker,
          getPlayerNumber(resolvedTeamId, marker.playerId)
        ),
        nameText: getMarkerDisplayName(marker),
      }));
    }

    const displaySizes = computeDisplaySizesForMarkers(
      sourceMarkers,
      CANVAS_SIZE,
      mode === 'infield' ? 'precise' : 'normal'
    );

    return sourceMarkers.map((marker, index) => ({
      ...marker,
      displaySize: displaySizes[index],
      circleText: getMarkerCircleText(marker, getPlayerNumber(resolvedTeamId, marker.playerId)),
      nameText: getMarkerDisplayName(marker),
    }));
  }, [getMarkerDisplayName, getPlayerNumber, mode, resolvedTeamId, sourceMarkers]);

  const getRoleOptions = useCallback((markerId: string) => {
    const currentRole = getMarkerRole(markerId);

    return [
      { value: 'fielder' as const, label: 'Fielder', disabled: currentRole !== 'fielder' },
      { value: 'bowler' as const, label: 'Bowler' },
      { value: 'keeper' as const, label: 'Keeper' },
    ];
  }, []);

  const refreshSavedSetups = async () => {
    const setups = await getAllFieldSetups();
    setSavedSetups(setups);
  };

  const openSavedSetups = async () => {
    await refreshSavedSetups();
    setIsSavedSetupsVisible(true);
  };

  const validateCurrentFieldState = useCallback((markersToValidate: PlayerMarker[]) => {
      if (getDuplicateAssignedPlayerIds(markersToValidate).length > 0) {
        throw new Error('Each team player can only be assigned to one marker at a time.');
      }
    }, []);

  const handleSaveSetup = async (
    name: string,
    teamId: string | null,
    fieldConfig?: FieldConfig
  ) => {
    const trimmedName = name.trim();
    const nextFieldConfig = normalizeFieldConfig(fieldConfig ?? activeFieldConfig);

    if (!trimmedName) {
      return;
    }

    console.log('[Field Save] activeSetupId:', activeSetupId);
    console.log('[Field Save] payload:', {
      name: trimmedName,
      markers,
      teamId: teamId ?? null,
      fieldConfig: nextFieldConfig,
    });

    validateCurrentFieldState(markers);

    const savedSetup = activeSetupId
      ? await updateFieldSetup(activeSetupId, trimmedName, markers, teamId, nextFieldConfig)
      : await saveFieldSetup(trimmedName, markers, teamId, nextFieldConfig);

    setActiveSetupMeta(savedSetup.id, savedSetup.name, savedSetup.fieldConfig);
    setActiveTeamId(savedSetup.teamId ?? null);
    setIsSaveModalVisible(false);

    if (isSavedSetupsVisible) {
      await refreshSavedSetups();
    }
  };

  const handleLoadSetup = async (setup: FieldSetup) => {
    console.log('[Field Load] loaded record id:', setup?.id);
    console.log('[Field Load] loaded data keys:', Object.keys(setup ?? {}));
    console.log('[Field Load] marker count:', setup?.markers?.length ?? 0);
    loadFieldSetup(setup);
    setSelectedMarkerId(null);
    setIsSavedSetupsVisible(false);
  };

  const handleDeleteSetup = async (id: string) => {
    await deleteFieldSetup(id);

    if (activeSetupId === id) {
      setActiveSetupMeta(null, '');
      setActiveTeamId(null);
    }

    await refreshSavedSetups();
  };

  const handleDuplicateSetup = async (id: string) => {
    await duplicateFieldSetup(id);
    await refreshSavedSetups();
  };

  const handleLoadTemplate = (template: FieldTemplate) => {
    replaceMarkers(template.markers);
    setActiveSetupMeta(null, '', DEFAULT_FIELD_CONFIG);
    setActiveTeamId(null);
    setSelectedMarkerId(null);
    setIsTemplatesVisible(false);
  };

  const handleCustomField = () => {
    setIsTemplatesVisible(false);
    setIsCustomFieldModalVisible(true);
  };

  const handleCreateCustomField = async (
    name: string,
    teamId: string | null,
    fieldConfig?: FieldConfig
  ) => {
    const trimmedName = name.trim();
    const nextFieldConfig = normalizeFieldConfig(fieldConfig ?? activeFieldConfig);

    if (!trimmedName) {
      return;
    }

    console.log('[Field Save] activeSetupId:', activeSetupId);
    console.log('[Field Save] payload:', {
      name: trimmedName,
      markers,
      teamId: teamId ?? null,
      fieldConfig: nextFieldConfig,
    });

    validateCurrentFieldState(markers);

    const savedSetup = await saveFieldSetup(trimmedName, markers, teamId, nextFieldConfig);

    setActiveSetupMeta(savedSetup.id, savedSetup.name, savedSetup.fieldConfig);
    setActiveTeamId(savedSetup.teamId ?? null);
    setSelectedMarkerId(null);
    setIsCustomFieldModalVisible(false);

    if (isSavedSetupsVisible) {
      await refreshSavedSetups();
    }
  };

  const handleCreateNewField = async (
    name: string,
    teamId: string | null,
    fieldConfig?: FieldConfig
  ) => {
    const trimmedName = name.trim();
    const nextFieldConfig = normalizeFieldConfig(fieldConfig);

    if (!trimmedName) {
      return;
    }

    const nextFieldName = getFieldNameWithBowlingType(trimmedName, nextFieldConfig.bowlingType);
    const defaultMarkers = applyDefaultSpecialMarkerPositions(
      createInitialMarkers(),
      nextFieldConfig
    );
    validateCurrentFieldState(defaultMarkers);
    const savedSetup = await saveFieldSetup(
      nextFieldName,
      defaultMarkers,
      teamId,
      nextFieldConfig
    );

    replaceMarkers(defaultMarkers);
    setActiveSetupMeta(savedSetup.id, savedSetup.name, savedSetup.fieldConfig);
    setActiveTeamId(savedSetup.teamId ?? null);
    setSelectedMarkerId(null);
    setIsCreateFieldModalVisible(false);
  };

  const handleQuickAddNote = async (title: string, content: string) => {
    if (!activeSetupId) {
      return;
    }

    const nextNote = await saveNote(title, content, activeSetupId, activeTeamId);
    setLinkedNote(nextNote);
    setIsQuickNoteVisible(false);
  };

  const refreshLinkedNote = useCallback(async () => {
    if (isPreview || mode !== 'full' || !activeSetupId) {
      setLinkedNote(null);
      return;
    }

    const nextLinkedNote = await getLinkedNoteForFieldSetup(activeSetupId);
    setLinkedNote(nextLinkedNote);
  }, [activeSetupId, isPreview, mode]);

  useFocusEffect(
    useCallback(() => {
      void refreshLinkedNote();
    }, [refreshLinkedNote])
  );

  useEffect(() => {
    void refreshLinkedNote();
  }, [refreshLinkedNote]);

  useEffect(() => {
    if (!openCreateFieldOnMount || isPreview) {
      return;
    }

    setIsCreateFieldModalVisible(true);
    onCreateFieldModalHandled?.();
  }, [isPreview, onCreateFieldModalHandled, openCreateFieldOnMount]);

  const currentTeamName = getTeamName(resolvedTeamId);
  const availableTeamPlayers = getPlayersForTeam(resolvedTeamId).map((player, index) => ({
    ...player,
    number: index + 1,
    disabled: assignedPlayerIds.has(player.id),
  }));
  const selectedDisplayMarker = displayMarkers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const selectedRole = selectedMarker ? getMarkerRole(selectedMarker.id) : null;
  const selectedRoleLabel = selectedMarker ? getMarkerRoleLabel(selectedMarker.id) : null;
  const selectedRoleOptions = selectedMarker ? getRoleOptions(selectedMarker.id) : [];

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.min(
        Math.max(startScale.value * event.scale, minScale),
        maxScale
      );
      const maxOffset = ((fieldSize * nextScale) - fieldSize) / 2;

      scale.value = nextScale;
      translateX.value = Math.min(Math.max(translateX.value, -maxOffset), maxOffset);
      translateY.value = Math.min(Math.max(translateY.value, -maxOffset), maxOffset);
    })
    .onEnd(() => {
      if (scale.value <= minScale + 0.01) {
        scale.value = withTiming(minScale);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        runOnJS(setCurrentScale)(minScale);
        return;
      }

      runOnJS(setCurrentScale)(scale.value);
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= minScale) {
        translateX.value = 0;
        translateY.value = 0;
        return;
      }

      const maxOffset = ((fieldSize * scale.value) - fieldSize) / 2;

      translateX.value = Math.min(
        Math.max(startTranslateX.value + event.translationX, -maxOffset),
        maxOffset
      );
      translateY.value = Math.min(
        Math.max(startTranslateY.value + event.translationY, -maxOffset),
        maxOffset
      );
    });

  const animatedFieldStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const fieldSurface = (
    <View style={styles.fieldSurface}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={BOUNDARY_RADIUS}
            fill="none"
            stroke="#17381E"
            strokeWidth="6"
          />
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={BOUNDARY_RADIUS}
            fill="#2E8F46"
            stroke="#F7FBF4"
            strokeWidth="3.5"
          />
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={BOUNDARY_RADIUS - 12}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="14"
          />

          <G stroke="rgba(248,252,246,0.95)" strokeWidth="2.4" strokeLinecap="round">
            {innerRingMarks}
          </G>

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
            y={pitchY + 10}
            width={pitchWidth - 6}
            height={pitchHeight - 20}
            rx="3"
            fill="rgba(196,157,99,0.58)"
          />

          <G stroke="#FFFFFF" strokeWidth="2.4">
            <Line
              x1={pitchX - 10}
              y1={topCreaseY}
              x2={pitchX + pitchWidth + 10}
              y2={topCreaseY}
            />
            <Line
              x1={pitchX - 10}
              y1={bottomCreaseY}
              x2={pitchX + pitchWidth + 10}
              y2={bottomCreaseY}
            />
          </G>

          <G stroke="#5A311A" strokeWidth="2.4" strokeLinecap="round">
            <Line x1={CENTER - 5} y1={topCreaseY - 6} x2={CENTER - 5} y2={topCreaseY} />
            <Line x1={CENTER} y1={topCreaseY - 6} x2={CENTER} y2={topCreaseY} />
            <Line x1={CENTER + 5} y1={topCreaseY - 6} x2={CENTER + 5} y2={topCreaseY} />

            <Line x1={CENTER - 5} y1={bottomCreaseY} x2={CENTER - 5} y2={bottomCreaseY + 6} />
            <Line x1={CENTER} y1={bottomCreaseY} x2={CENTER} y2={bottomCreaseY + 6} />
            <Line x1={CENTER + 5} y1={bottomCreaseY} x2={CENTER + 5} y2={bottomCreaseY + 6} />
          </G>
        </Svg>
      </View>

      <View pointerEvents="none" style={styles.sideLabelsLayer}>
        <Text style={[styles.sideLabel, styles.leftSideLabel]}>{sideLabels.left}</Text>
        <Text style={[styles.sideLabel, styles.rightSideLabel]}>{sideLabels.right}</Text>
      </View>

      <View pointerEvents={isPreview ? 'none' : 'box-none'} style={styles.markersLayer}>
        {ghostFielders.map((ghost) => (
          <GhostFielderMarker key={ghost.id} ghost={ghost} fieldSize={fieldSize} />
        ))}

        {displayMarkers.map((marker) =>
          marker.draggable ? (
            <DraggableMarker
              key={marker.id}
              circleText={marker.circleText}
              nameText={marker.nameText}
              x={marker.x}
              y={marker.y}
              size={marker.displaySize}
              selected={!isPreview && marker.id === selectedMarkerId}
              fieldSize={fieldSize}
              currentScale={currentScale}
              canvasSize={CANVAS_SIZE}
              canvasCenter={CENTER}
              boundaryRadius={BOUNDARY_RADIUS}
              markerRadius={marker.displaySize / 2}
              interactive={!isPreview}
              onSelect={() => setSelectedMarkerId(marker.id)}
              onDragStateChange={setIsMarkerDragging}
              onPositionChange={(x, y) => updateMarkerPosition(marker.id, x, y)}
            />
          ) : (
            <FixedMarker
              key={marker.id}
              circleText={marker.circleText}
              nameText={marker.nameText}
              x={marker.x}
              y={marker.y}
              size={marker.displaySize}
              fieldSize={fieldSize}
              selected={!isPreview && marker.id === selectedMarkerId}
              interactive={!isPreview}
              onSelect={() => setSelectedMarkerId(marker.id)}
            />
          )
        )}
      </View>

    </View>
  );

  const canvasNode = (
    <Animated.View
      style={[
        styles.canvasContainer,
        { width: fieldSize, height: fieldSize },
        !isPreview ? animatedFieldStyle : null,
      ]}>
      {isPreview ? fieldSurface : <GestureDetector gesture={panGesture}>{fieldSurface}</GestureDetector>}
    </Animated.View>
  );

  if (isPreview) {
    return (
      <View style={[styles.previewContainer, { width: fieldSize, height: fieldSize }]}>
        {canvasNode}
      </View>
    );
  }

  const advancedInspector = selectedMarker && !isMarkerDragging && selectedRole && selectedRoleLabel ? (
    <View pointerEvents="box-none" style={styles.advancedInspectorContainer}>
      <MarkerInspectorPanel
        displayNumber={selectedDisplayMarker?.circleText ?? selectedMarker.label}
        name={selectedMarker.name ?? ''}
        size={selectedMarker.size}
        role={selectedRole}
        roleLabel={selectedRoleLabel}
        roleOptions={selectedRoleOptions}
        teamName={currentTeamName}
        assignedPlayerId={selectedMarker.playerId}
        assignedPlayerName={getPlayerName(selectedMarker.playerId) ?? null}
        assignedPlayerNumber={getPlayerNumber(resolvedTeamId, selectedMarker.playerId)}
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
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.viewport}>
        <View style={styles.editorShell}>
          <View style={styles.canvasColumn}>
            <GestureDetector gesture={pinchGesture}>{canvasNode}</GestureDetector>

            {advancedInspector}

            {mode === 'full' && linkedNote ? (
              <View
                style={[
                  styles.notePanelContainer,
                  {
                    top: Math.max(insets.top, 12) + 60,
                    right: 16,
                  },
                ]}>
                <LinkedNoteCard note={linkedNote} onNoteUpdated={setLinkedNote} />
                <Pressable
                  disabled={!activeSetupId}
                  onPress={() => setIsQuickNoteVisible(true)}
                  style={[
                    styles.addNoteButton,
                    !activeSetupId && styles.addNoteButtonDisabled,
                  ]}>
                  <Text style={styles.addNoteButtonText}>Add Note</Text>
                </Pressable>
              </View>
            ) : mode === 'full' ? (
              <View
                style={[
                  styles.notePanelContainer,
                  {
                    top: Math.max(insets.top, 12) + 60,
                    right: 16,
                  },
                ]}>
                <Pressable
                  disabled={!activeSetupId}
                  onPress={() => setIsQuickNoteVisible(true)}
                  style={[
                    styles.addNoteButton,
                    !activeSetupId && styles.addNoteButtonDisabled,
                  ]}>
                  <Text style={styles.addNoteButtonText}>
                    {activeSetupId ? 'Add Note' : 'Save Setup To Add Note'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {mode === 'full' ? (
              <>
                <Pressable
                  onPress={() => setIsCreateFieldModalVisible(true)}
                  style={[
                    styles.createFieldButton,
                    {
                      top: Math.max(insets.top, 12) + 12,
                      right: 16,
                    },
                  ]}>
                  <Text style={styles.createFieldButtonText}>Create New Field</Text>
                </Pressable>

                <View
                  style={[
                    styles.bottomButtonGroup,
                    {
                      left: 16,
                      bottom: Math.max(insets.bottom, 12) + 16,
                    },
                  ]}>
                  <Pressable
                    onPress={() => setIsSaveModalVisible(true)}
                    style={styles.secondaryActionButton}>
                    <Text style={styles.secondaryActionButtonText}>Save Setup</Text>
                  </Pressable>

                  <Pressable onPress={openSavedSetups} style={styles.secondaryActionButton}>
                    <Text style={styles.secondaryActionButtonText}>Saved Setups</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setIsTemplatesVisible(true)}
                    style={styles.secondaryActionButton}>
                    <Text style={styles.secondaryActionButtonText}>Templates</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={onOpenPreciseInfield}
                  style={[
                    styles.preciseButton,
                    {
                      right: 16,
                      bottom: Math.max(insets.bottom, 12) + 16,
                    },
                  ]}>
                  <Text style={styles.preciseButtonText}>Precise Infield Edit</Text>
                </Pressable>
              </>
            ) : null}
          </View>

          <FieldAiBar
            markers={sourceMarkers}
            fieldConfig={resolvedFieldConfig}
            onGhostFieldersChange={setGhostFielders}
          />
        </View>

        {mode === 'full' ? (
          <>
            <SaveSetupModal
              visible={isSaveModalVisible}
              initialName={activeSetupName}
              initialTeamId={activeTeamId}
              teams={resolvedTeams}
              isUpdating={Boolean(activeSetupId)}
              onClose={() => setIsSaveModalVisible(false)}
              onSave={handleSaveSetup}
            />

            <SaveSetupModal
              visible={isCreateFieldModalVisible}
              initialName=""
              initialTeamId={null}
              initialFieldConfig={DEFAULT_FIELD_CONFIG}
              teams={resolvedTeams}
              enableFieldConfig
              isUpdating={false}
              title="Create New Field"
              submitLabel="Create"
              placeholder="Field setup name"
              onClose={() => setIsCreateFieldModalVisible(false)}
              onSave={handleCreateNewField}
            />

            <FieldSetupsModal
              visible={isSavedSetupsVisible}
              setups={savedSetups}
              onClose={() => setIsSavedSetupsVisible(false)}
              onLoad={handleLoadSetup}
              onDelete={handleDeleteSetup}
              onDuplicate={handleDuplicateSetup}
            />

            <FieldTemplatesModal
              visible={isTemplatesVisible}
              templates={FIELD_TEMPLATES}
              onClose={() => setIsTemplatesVisible(false)}
              onCustomField={handleCustomField}
              onLoad={handleLoadTemplate}
            />

            <SaveSetupModal
              visible={isCustomFieldModalVisible}
              initialName=""
              initialTeamId={activeTeamId}
              teams={resolvedTeams}
              isUpdating={false}
              title="Custom Field"
              submitLabel="Create"
              placeholder="Custom field name"
              onClose={() => setIsCustomFieldModalVisible(false)}
              onSave={handleCreateCustomField}
            />

            <QuickAddNoteModal
              visible={isQuickNoteVisible}
              onClose={() => setIsQuickNoteVisible(false)}
              onSave={handleQuickAddNote}
            />
          </>
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EB',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  editorShell: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'stretch',
  },
  canvasColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasContainer: {
    position: 'relative',
  },
  fieldSurface: {
    flex: 1,
  },
  sideLabelsLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  sideLabel: {
    position: 'absolute',
    top: '35%',
    width: '30%',
    color: 'rgba(15, 23, 42, 0.12)',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2.2,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,255,255,0.16)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  leftSideLabel: {
    left: '10%',
    transform: [{ rotate: '-18deg' }],
  },
  rightSideLabel: {
    right: '10%',
    transform: [{ rotate: '18deg' }],
  },
  markersLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  notePanelContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
    gap: 10,
  },
  addNoteButton: {
    backgroundColor: '#1E6E31',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addNoteButtonDisabled: {
    opacity: 0.55,
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  createFieldButton: {
    position: 'absolute',
    backgroundColor: '#1E6E31',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  createFieldButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bottomButtonGroup: {
    position: 'absolute',
    gap: 10,
  },
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  secondaryActionButtonText: {
    color: '#1E6E31',
    fontSize: 14,
    fontWeight: '800',
  },
  preciseButton: {
    position: 'absolute',
    backgroundColor: '#1E6E31',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  preciseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
