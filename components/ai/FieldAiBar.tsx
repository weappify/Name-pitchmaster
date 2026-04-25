import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PlayerMarker } from '@/context/FieldMarkersContext';
import {
  INTENT_OPTIONS,
  type BallLandingSelection,
  type GhostFielder,
  type TacticalAdviceResponse,
  type TacticalIntent,
} from '@/lib/ai/types';
import { describeBallLandingSelection } from '@/lib/ai/ballLandingMapper';
import { requestTacticalAdvice } from '@/lib/ai/requestTacticalAdvice';
import { getMarkerRole } from '@/lib/fieldSetupRules';
import type { BatterHand, FieldConfig } from '@/types/fieldSetup';
import { BallLandingAdvisor } from './BallLandingAdvisor';

type FieldAiBarProps = {
  markers: PlayerMarker[];
  fieldConfig?: FieldConfig;
  onGhostFieldersChange?: (ghostFielders: GhostFielder[]) => void;
};

const CANVAS_SIZE = 500;
const INNER_RING_RADIUS = (30 / 70) * 220;

function isOutsideInnerRing(marker: Pick<PlayerMarker, 'id' | 'x' | 'y'>) {
  if (marker.id === 'b' || marker.id === 'wk') {
    return false;
  }

  const dx = marker.x * CANVAS_SIZE - CANVAS_SIZE / 2;
  const dy = marker.y * CANVAS_SIZE - CANVAS_SIZE / 2;

  return Math.sqrt(dx * dx + dy * dy) > INNER_RING_RADIUS;
}

function getCurrentFieldSnapshot(markers: PlayerMarker[], batterHand: BatterHand) {
  const outsideCount = markers.filter(isOutsideInnerRing).length;
  const leftScreenCount = markers.filter(
    (marker) => marker.id !== 'b' && marker.id !== 'wk' && marker.x < 0.5
  ).length;
  const rightScreenCount = markers.filter(
    (marker) => marker.id !== 'b' && marker.id !== 'wk' && marker.x >= 0.5
  ).length;
  const offSideCount = batterHand === 'left' ? rightScreenCount : leftScreenCount;
  const legSideCount = batterHand === 'left' ? leftScreenCount : rightScreenCount;
  const closeCatchers = markers.filter(
    (marker) =>
      marker.id !== 'b' &&
      marker.id !== 'wk' &&
      !isOutsideInnerRing(marker) &&
      marker.y >= 0.43 &&
      marker.y <= 0.62 &&
      Math.abs(marker.x - 0.5) < 0.16
  ).length;

  return {
    outsideCount,
    closeCatchers,
    offSideCount,
    legSideCount,
    summary: `${outsideCount} fielders are outside the ring, with ${offSideCount} set on the off side and ${legSideCount} on the leg side. There are ${closeCatchers} close support options in the central lane.`,
  };
}

export function FieldAiBar({ markers, fieldConfig, onGhostFieldersChange }: FieldAiBarProps) {
  const [intent, setIntent] = useState<TacticalIntent>('balanced');
  const [selection, setSelection] = useState<BallLandingSelection | null>(null);
  const [advice, setAdvice] = useState<TacticalAdviceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const batterHand = fieldConfig?.batterHand ?? 'right';
  const currentFieldSnapshot = useMemo(
    () => getCurrentFieldSnapshot(markers, batterHand),
    [batterHand, markers]
  );
  const currentFielders = useMemo(
    () =>
      markers.map((marker) => ({
        id: marker.id,
        label: marker.label,
        role: getMarkerRole(marker.id),
        x: marker.x,
        y: marker.y,
        name: marker.name,
      })),
    [markers]
  );
  const errorTitle =
    errorMessage && errorMessage.toLowerCase().includes('not deployed')
      ? 'AI service not deployed'
      : 'AI unavailable';

  useEffect(() => {
    onGhostFieldersChange?.(advice?.ghostFielders ?? []);
  }, [advice?.ghostFielders, onGhostFieldersChange]);

  useEffect(() => {
    setAdvice(null);
    setErrorMessage(null);
    onGhostFieldersChange?.([]);
  }, [
    batterHand,
    fieldConfig?.bowlingType,
    fieldConfig?.format,
    fieldConfig?.overPhase,
    intent,
    onGhostFieldersChange,
    selection?.length,
    selection?.line,
    selection?.x,
    selection?.y,
  ]);

  const handleAnalyse = async () => {
    if (!selection) {
      console.log('[AI] analyse button pressed without a ball selection');
      setErrorMessage('Choose a delivery spot to analyse before requesting tactical advice.');
      return;
    }

    if (isLoading) {
      console.log('[AI] duplicate analyse request ignored while loading');
      return;
    }

    const payload = {
      batterHand,
      bowlingType: fieldConfig?.bowlingType,
      intent,
      line: selection.line,
      length: selection.length,
      selectedBall: {
        x: selection.x,
        y: selection.y,
      },
      currentFieldSummary: currentFieldSnapshot.summary,
      currentFielders,
      format: fieldConfig?.format,
      phase: fieldConfig?.overPhase,
    };

    console.log('[AI] analyse button pressed', {
      batterHand,
      intent,
      line: selection.line,
      length: selection.length,
      x: selection.x,
      y: selection.y,
    });
    console.log('[AI] tactical payload built', {
      ...payload,
      currentFielders: payload.currentFielders.map((fielder) => ({
        id: fielder.id,
        role: fielder.role,
        x: fielder.x,
        y: fielder.y,
      })),
    });

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextAdvice = await requestTacticalAdvice(payload);

      console.log('[AI] tactical advice received', {
        title: nextAdvice.title,
        source: nextAdvice.source ?? 'edge',
        suggestedFielders: nextAdvice.suggestedFielders.length,
        variants: nextAdvice.variants.length,
      });
      setAdvice(nextAdvice);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Couldn’t get AI advice right now. Please try again.';
      console.log('[AI] tactical advice request failed', message);
      setAdvice(null);
      setErrorMessage(message || 'Couldn’t get AI advice right now. Please try again.');
      onGhostFieldersChange?.([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.sidebar}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>BALL LANDING ADVISOR</Text>
          <Text style={styles.subtitle}>
            Place the ball on the mini pitch, then analyse the tactical field for that delivery plan.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intent</Text>
          <View style={styles.intentRow}>
            {INTENT_OPTIONS.map((option) => {
              const selected = option.value === intent;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setIntent(option.value);
                  }}
                  style={[styles.intentChip, selected && styles.intentChipSelected]}>
                  <Text style={[styles.intentChipText, selected && styles.intentChipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <BallLandingAdvisor
            batterHand={batterHand}
            value={selection}
            onChange={setSelection}
          />
          <View style={styles.selectionCard}>
            <Text style={styles.snapshotLabel}>Delivery Spot</Text>
            <Text style={styles.selectionValue}>{describeBallLandingSelection(selection)}</Text>
            <Text style={styles.selectionMeta}>
              {selection
                ? `x ${selection.x.toFixed(2)} · y ${selection.y.toFixed(2)}`
                : 'Tap anywhere on the pitch or drag the ball marker.'}
            </Text>
          </View>
          <Pressable
            disabled={!selection || isLoading}
            onPress={handleAnalyse}
            style={[
              styles.primaryButton,
              (!selection || isLoading) && styles.primaryButtonDisabled,
            ]}>
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Generating tactical suggestions...' : 'Analyse & Get Suggestions'}
            </Text>
          </Pressable>
          <Pressable
            disabled={!selection && !advice && !errorMessage}
            onPress={() => {
              setSelection(null);
              setAdvice(null);
              setErrorMessage(null);
              onGhostFieldersChange?.([]);
            }}
            style={[
              styles.clearButton,
              !selection && !advice && !errorMessage && styles.clearButtonDisabled,
            ]}>
            <Text style={styles.clearButtonText}>Clear Analysis</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Coach</Text>

          <View style={styles.fieldSnapshotCard}>
            <Text style={styles.snapshotLabel}>Current Field Snapshot</Text>
            <Text style={styles.snapshotText}>{currentFieldSnapshot.summary}</Text>
          </View>

          {!selection ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Choose a delivery spot to analyse.</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>{errorTitle}</Text>
              <Text style={styles.errorText}>The tactical suggestion request did not complete.</Text>
              <Text style={styles.errorDetail}>{errorMessage}</Text>
            </View>
          ) : null}

          {advice ? (
            <>
              <Text style={styles.coachSummary}>{advice.summary}</Text>

              <View style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationTitle}>{advice.title}</Text>
                  {advice.source === 'fallback' ? (
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>Fallback</Text>
                    </View>
                  ) : null}
                </View>

                {advice.suggestedFielders.map((fielder) => (
                  <View key={`${fielder.role}-${fielder.area}`} style={styles.fielderRow}>
                    <Text style={styles.fielderRole}>{fielder.role}</Text>
                    <Text style={styles.fielderArea}>{fielder.area}</Text>
                    <Text style={styles.fielderReason}>{fielder.reason}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.notesCard}>
                <Text style={styles.notesTitle}>Reasoning</Text>
                <Text style={styles.noteText}>{advice.tacticalReasoning}</Text>
              </View>

              {advice.riskAreas.length > 0 ? (
                <View style={styles.subtleCard}>
                  <Text style={styles.subtleTitle}>Risk Areas</Text>
                  {advice.riskAreas.map((risk) => (
                    <Text key={risk} style={styles.subtleText}>
                      • {risk}
                    </Text>
                  ))}
                </View>
              ) : null}

              {advice.variants.length > 0 ? (
                <View style={styles.subtleCard}>
                  <Text style={styles.subtleTitle}>Variants</Text>
                  {advice.variants.map((variant) => (
                    <View key={variant.name} style={styles.variantRow}>
                      <Text style={styles.variantName}>{variant.name}</Text>
                      <Text style={styles.subtleText}>{variant.summary}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 332,
    maxWidth: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 6,
  },
  header: {
    gap: 4,
  },
  title: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#1E6E31',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  intentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intentChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  intentChipSelected: {
    borderColor: '#1E6E31',
    backgroundColor: '#EEF6F0',
  },
  intentChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  intentChipTextSelected: {
    color: '#1E6E31',
  },
  clearButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  clearButtonDisabled: {
    opacity: 0.45,
  },
  clearButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  selectionCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
  },
  selectionValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  selectionMeta: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#1E6E31',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  coachSummary: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
  },
  fieldSnapshotCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 4,
  },
  snapshotLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  snapshotText: {
    color: '#0F172A',
    fontSize: 12,
    lineHeight: 18,
  },
  recommendationCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  recommendationTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  sourceBadge: {
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  fielderRow: {
    gap: 2,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  fielderRole: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  fielderArea: {
    color: '#1E6E31',
    fontSize: 12,
    fontWeight: '700',
  },
  fielderReason: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  notesCard: {
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 12,
    gap: 6,
  },
  notesTitle: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  noteText: {
    color: '#166534',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  emptyCardText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  errorCard: {
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    gap: 4,
  },
  errorTitle: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  errorText: {
    color: '#7F1D1D',
    fontSize: 13,
    fontWeight: '700',
  },
  errorDetail: {
    color: '#991B1B',
    fontSize: 12,
    lineHeight: 18,
  },
  subtleCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  subtleTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subtleText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  variantRow: {
    gap: 3,
  },
  variantName: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
});
