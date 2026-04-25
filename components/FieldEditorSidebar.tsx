import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { MarkerRole } from '@/lib/fieldSetupRules';
import { FieldRolePickerModal, type FieldRoleOption } from './FieldRolePickerModal';

export type SidebarMarkerItem = {
  id: string;
  badgeText: string;
  badgeTone: MarkerRole;
  name: string;
  namePlaceholder: string;
  subtitle: string;
  role: MarkerRole;
  roleLabel: string;
  roleOptions: FieldRoleOption[];
  selected: boolean;
  onPress: () => void;
  onNameChange: (value: string) => void;
  onRoleChange: (role: MarkerRole) => void;
};

type FieldEditorSidebarProps = {
  items: SidebarMarkerItem[];
  inspector: ReactNode;
  title?: string;
  tools?: ReactNode;
};

export function FieldEditorSidebar({
  items,
  inspector,
  title = 'ALL PLAYERS',
  tools,
}: FieldEditorSidebarProps) {
  const [activeRoleItemId, setActiveRoleItemId] = useState<string | null>(null);
  const activeRoleItem = useMemo(
    () => items.find((item) => item.id === activeRoleItemId) ?? null,
    [activeRoleItemId, items]
  );

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Tap to edit</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled">
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            style={[styles.row, item.selected && styles.rowSelected]}>
            <View
              style={[
                styles.badge,
                item.badgeTone === 'bowler' && styles.badgeBowler,
                item.badgeTone === 'keeper' && styles.badgeKeeper,
                item.selected && styles.badgeSelected,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  (item.badgeTone === 'bowler' || item.selected) &&
                    styles.badgeTextInverse,
                ]}>
                {item.badgeText}
              </Text>
            </View>

            <View style={styles.rowBody}>
              <View style={styles.rowHeader}>
                <TextInput
                  value={item.name}
                  onFocus={item.onPress}
                  onChangeText={item.onNameChange}
                  placeholder={item.namePlaceholder}
                  placeholderTextColor="#8C8578"
                  style={styles.nameInput}
                />
                <Pressable
                  onPress={() => {
                    item.onPress();
                    setActiveRoleItemId(item.id);
                  }}
                  style={styles.roleButton}>
                  <Text style={styles.roleButtonText}>{item.roleLabel}</Text>
                  <Text style={styles.roleChevron}>⌄</Text>
                </Pressable>
              </View>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
          </Pressable>
        ))}

        <View style={styles.sectionDivider} />

        <View style={styles.inspectorSection}>
          <Text style={styles.sectionTitle}>Selected Marker</Text>
          {inspector}
        </View>

        <View style={styles.futureSection}>
          <Text style={styles.sectionTitle}>Tools</Text>
          {tools ?? (
            <Text style={styles.futureText}>
              Future presets and tactical helpers will live here.
            </Text>
          )}
        </View>
      </ScrollView>

      <FieldRolePickerModal
        visible={Boolean(activeRoleItem)}
        selectedRole={activeRoleItem?.role ?? null}
        options={activeRoleItem?.roleOptions ?? []}
        onClose={() => setActiveRoleItemId(null)}
        onSelect={(role) => {
          activeRoleItem?.onRoleChange(role);
          setActiveRoleItemId(null);
        }}
      />
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
  header: {
    gap: 4,
    marginBottom: 12,
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
    lineHeight: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  rowSelected: {
    borderColor: '#1E6E31',
    backgroundColor: '#F0FDF4',
    shadowColor: '#1E6E31',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBowler: {
    backgroundColor: '#B42318',
    borderColor: '#B42318',
  },
  badgeKeeper: {
    backgroundColor: '#FACC15',
    borderColor: '#FACC15',
  },
  badgeSelected: {
    backgroundColor: '#1E6E31',
    borderColor: '#1E6E31',
  },
  badgeText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  badgeTextInverse: {
    color: '#FFFFFF',
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  roleButton: {
    minHeight: 40,
    minWidth: 98,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6D3D1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  roleButtonText: {
    color: '#1F1D19',
    fontSize: 12,
    fontWeight: '700',
  },
  roleChevron: {
    color: '#6F6B62',
    fontSize: 14,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  inspectorSection: {
    gap: 10,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  futureSection: {
    gap: 6,
    paddingTop: 8,
    paddingBottom: 4,
  },
  futureText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
});
