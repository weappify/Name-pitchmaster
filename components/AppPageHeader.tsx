import { Pressable, StyleSheet, Text, View } from 'react-native';

type AppPageHeaderProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function AppPageHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: AppPageHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  titleBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: '#1F1D19',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6F6B62',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 420,
  },
  actionButton: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#1E6E31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
