import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../AppText';
import { Sunrise, Sun, Sunset, Moon, Plus } from 'lucide-react-native';
import { LoggedDailySupplement, SupplementTime } from '../../types';
import { SupplementItemRow } from './SupplementItemRow';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import { timeLabels, getSlotStats } from './supplementTypes';

export { timeLabels, getSlotStats };

export const getTimeIcon = (slot: SupplementTime, theme: ThemeType) => {
  switch (slot) {
    case 'morning':
      return <Sunrise size={18} color={theme.colors.accent} />;
    case 'afternoon':
      return <Sun size={18} color={theme.colors.amber} />;
    case 'evening':
      return <Sunset size={18} color={theme.colors.orangeDeep} />;
    case 'bedtime':
      return <Moon size={18} color={theme.colors.indigoDark} />;
  }
};

export interface SupplementTimeSectionProps {
  slot: SupplementTime;
  slotItems: LoggedDailySupplement[];
  isFuture: boolean;
  onOpenAddModal: (slot: SupplementTime) => void;
  onToggleItem: (id: string, taken: boolean) => void;
  onAdjustQuantity: (item: LoggedDailySupplement, delta: number) => void;
  onOpenEditModal: (item: LoggedDailySupplement) => void;
  onDeleteItem: (item: LoggedDailySupplement) => void;
  t: (key: string) => string;
}

export const SupplementTimeSection: React.FC<SupplementTimeSectionProps> = ({
  slot,
  slotItems,
  isFuture,
  onOpenAddModal,
  onToggleItem,
  onAdjustQuantity,
  onOpenEditModal,
  onDeleteItem,
  t,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const slotTakenCount = slotItems.filter((i) => i.taken).length;

  return (
    <View style={styles.slotCard}>
      {/* Slot Header */}
      <View style={styles.slotHeader}>
        <View style={styles.slotHeaderLeft}>
          {getTimeIcon(slot, theme)}
          <Text style={styles.slotTitle}>{t(timeLabels[slot])}</Text>
          {slotItems.length > 0 && (
            <Text style={styles.slotCountBadge}>
              {slotTakenCount}/{slotItems.length}
            </Text>
          )}
        </View>

        {!isFuture && (
          <TouchableOpacity
            onPress={() => onOpenAddModal(slot)}
            style={styles.slotQuickAdd}
            hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
            accessibilityLabel={`${t('Add supplement')} · ${t(timeLabels[slot])}`}
            accessibilityRole="button"
          >
            <Plus size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Slot Items */}
      {slotItems.length === 0 ? (
        <View style={styles.slotEmptyRow}>
          <Text style={styles.slotEmptyText}>
            {t('No supplements scheduled for this time.')}
          </Text>
        </View>
      ) : (
        slotItems.map((item, idx) => (
          <SupplementItemRow
            key={item.id}
            item={item}
            isLast={idx === slotItems.length - 1}
            isFuture={isFuture}
            onToggle={onToggleItem}
            onAdjustQuantity={onAdjustQuantity}
            onEdit={onOpenEditModal}
            onDelete={onDeleteItem}
            t={t}
          />
        ))
      )}
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  slotCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.subtle,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  slotCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.secondary,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  slotQuickAdd: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotEmptyRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  slotEmptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});
