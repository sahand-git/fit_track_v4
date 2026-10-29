import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppText as Text } from '../AppText';
import { Plus, Minus, Edit3, Trash2 } from 'lucide-react-native';
import { LoggedDailySupplement } from '../../types';
import { AnimatedCheckbox } from '../AnimatedCheckbox';
import {
  getItemEnterAnimation,
  getItemExitAnimation,
  getListLayoutTransition,
} from '../../utils/reanimatedMotion';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import { categoryLabels } from './supplementTypes';

export { categoryLabels };

export interface SupplementItemRowProps {
  item: LoggedDailySupplement;
  isLast: boolean;
  isFuture: boolean;
  onToggle: (id: string, taken: boolean) => void;
  onAdjustQuantity: (item: LoggedDailySupplement, delta: number) => void;
  onEdit: (item: LoggedDailySupplement) => void;
  onDelete: (item: LoggedDailySupplement) => void;
  t: (key: string) => string;
  isNew?: boolean;
}

const styleCache = new Map<ThemeType, ReturnType<typeof createStyles>>();

function getSupplementRowStyles(theme: ThemeType): ReturnType<typeof createStyles> {
  let cached = styleCache.get(theme);
  if (!cached) {
    cached = createStyles(theme);
    styleCache.set(theme, cached);
  }
  return cached;
}

export const SupplementItemRow: React.FC<SupplementItemRowProps> = ({
  item,
  isLast,
  isFuture,
  onToggle,
  onAdjustQuantity,
  onEdit,
  onDelete,
  t,
  isNew = false,
}) => {
  const { theme } = useTheme();
  const styles = getSupplementRowStyles(theme);
  const hasNumericAmount =
    item.amount !== undefined && item.amount > 0 && Boolean(item.unit);

  return (
    <Animated.View
      entering={isNew ? getItemEnterAnimation() : undefined}
      exiting={getItemExitAnimation()}
      layout={getListLayoutTransition()}
      style={[styles.itemRow, !isLast && styles.itemRowBorder]}
    >
      {/* Checkbox */}
      <TouchableOpacity
        onPress={() => onToggle(item.id, !item.taken)}
        disabled={isFuture}
        style={[styles.checkbox, isFuture && styles.disabled]}
        accessibilityLabel={t(item.taken ? 'Taken' : 'Mark as taken')}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.taken, disabled: isFuture }}
      >
        <AnimatedCheckbox checked={item.taken} size={22} />
      </TouchableOpacity>

      {/* Item Content */}
      <View style={styles.itemContent}>
        <View style={styles.itemTopRow}>
          <Text style={[styles.itemName, item.taken && styles.itemNameTaken]}>
            {item.name}
          </Text>
          {item.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>
                {t(categoryLabels[item.category] || item.category)}
              </Text>
            </View>
          )}
        </View>

        {/* Amount & Unit Controls */}
        <View style={styles.itemBottomRow}>
          {hasNumericAmount ? (
            <View style={styles.stepperWrap}>
              {!isFuture && (
                <TouchableOpacity
                  onPress={() => onAdjustQuantity(item, -1)}
                  style={styles.stepperBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={t('Decrease quantity')}
                  accessibilityRole="button"
                >
                  <Minus size={12} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
              <Text style={styles.stepperValText}>
                {item.amount} {t(item.unit || '')}
              </Text>
              {!isFuture && (
                <TouchableOpacity
                  onPress={() => onAdjustQuantity(item, 1)}
                  style={styles.stepperBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={t('Increase quantity')}
                  accessibilityRole="button"
                >
                  <Plus size={12} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={styles.legacyDoseText}>{item.dose || ''}</Text>
          )}

          {item.note ? <Text style={styles.itemNoteText}>• {item.note}</Text> : null}
        </View>
      </View>

      {/* Row Actions */}
      {!isFuture && (
        <View style={styles.rowActions}>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={styles.actionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={t('Edit')}
            accessibilityRole="button"
          >
            <Edit3 size={15} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item)}
            style={styles.actionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={t('Delete')}
            accessibilityRole="button"
          >
            <Trash2 size={15} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemNameTaken: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  categoryPill: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  categoryPillText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 6,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperValText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  legacyDoseText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  itemNoteText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
});
