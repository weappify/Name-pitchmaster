import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getFieldRestrictionMessage,
  getFieldRestrictionStatus,
} from '../../lib/fieldSetupRules';
import { FieldCanvas } from '../../components/FieldCanvas';
import { PreciseInfieldCanvas } from '../../components/PreciseInfieldCanvas';
import { useFieldMarkers } from '../../context/FieldMarkersContext';

type FieldScreenMode = 'field' | 'precise';

export default function FieldScreen() {
  const { createField } = useLocalSearchParams<{ createField?: string }>();
  const { activeFieldConfig, activeSetupName, markers } = useFieldMarkers();
  const [openCreateFieldOnMount, setOpenCreateFieldOnMount] = useState(false);
  const [screenMode, setScreenMode] = useState<FieldScreenMode>('field');
  const displayFieldName = activeSetupName.trim() || 'Untitled Field';
  const restrictionStatus = getFieldRestrictionStatus(markers, activeFieldConfig);
  const restrictionMessage = getFieldRestrictionMessage(restrictionStatus);

  useEffect(() => {
    if (createField !== '1') {
      return;
    }

    setOpenCreateFieldOnMount(true);
    router.replace('/field');
  }, [createField]);

  if (screenMode === 'precise') {
    return (
      <View style={styles.screen}>
        <View style={styles.headerBlock}>
          <Text style={styles.fieldName}>{displayFieldName}</Text>
          {restrictionStatus.isExceeded && restrictionMessage ? (
            <Text style={styles.warningText}>{restrictionMessage}</Text>
          ) : null}
        </View>

        <View style={styles.preciseHeader}>
          <Pressable onPress={() => setScreenMode('field')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </View>

        <View style={styles.preciseCanvasContainer}>
          <PreciseInfieldCanvas />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBlock}>
        <Text style={styles.fieldName}>{displayFieldName}</Text>
        {restrictionStatus.isExceeded && restrictionMessage ? (
          <Text style={styles.warningText}>{restrictionMessage}</Text>
        ) : null}
      </View>

      <View style={styles.fieldCanvasContainer}>
        <FieldCanvas
          mode="full"
          openCreateFieldOnMount={openCreateFieldOnMount}
          onCreateFieldModalHandled={() => setOpenCreateFieldOnMount(false)}
          onOpenPreciseInfield={() => setScreenMode('precise')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F1EB',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  preciseHeader: {
    alignItems: 'flex-start',
  },
  headerBlock: {
    gap: 6,
  },
  fieldName: {
    color: '#1F1D19',
    fontSize: 30,
    fontWeight: '800',
  },
  warningText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    maxWidth: 720,
  },
  fieldCanvasContainer: {
    flex: 1,
    minHeight: 0,
  },
  backButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#1E6E31',
    fontSize: 14,
    fontWeight: '700',
  },
  preciseCanvasContainer: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0B6623',
  },
});