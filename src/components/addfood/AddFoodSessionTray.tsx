import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronUp, ChevronDown, Trash2, Check } from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import {
  SessionItem,
  calculateSessionTotals,
  formatSessionSummary,
} from './addFoodSessionCore';
import { MealType } from '../../types';

export interface AddFoodSessionTrayProps {
  items: SessionItem[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onRemoveItem: (id: string) => void;
  onDone: () => void;
  bottomInset?: number;
  isRTL?: boolean;
  t: (key: string) => string;
}

export const AddFoodSessionTray: React.FC<AddFoodSessionTrayProps> = ({
  items,
  isExpanded,
  onToggleExpanded,
  onRemoveItem,
  onDone,
  bottomInset,
  isRTL = false,
  t,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const { count, totalCalories } = calculateSessionTotals(items);
  const summaryText = formatSessionSummary(count, totalCalories, t);

  const getMealLabel = (mealType: MealType): string => {
    switch (mealType) {
      case 'breakfast':
        return t('Breakfast');
      case 'lunch':
        return t('Lunch');
      case 'dinner':
        return t('Dinner');
      case 'snack':
      default:
        return t('Snack');
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(theme.spacing.xs, (bottomInset ?? 0) + 4),
        },
      ]}
    >
      {isExpanded && (
        <View style={styles.expandedDrawer}>
          <View style={[styles.drawerHeader, isRTL && styles.rowRTL]}>
            <Text style={styles.drawerTitle}>{t('Foods added this session')}</Text>
          </View>
          <ScrollView
            style={styles.itemsScroll}
            contentContainerStyle={styles.itemsScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {items.map((item) => (
              <View key={item.id} style={[styles.itemRow, isRTL && styles.rowRTL]}>
                <View style={[styles.itemMeta, isRTL && styles.itemMetaRTL]}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemSubText} numberOfLines={1}>
                    {item.portion} · {getMealLabel(item.mealType)}
                  </Text>
                </View>

                <Text style={[styles.itemCalories, isRTL && styles.itemCaloriesRTL]}>
                  {item.calories} {t('kcal')}
                </Text>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveItem(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Remove from session')} ${item.name}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Bar */}
      <View style={[styles.trayBar, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          style={[styles.summaryButton, isRTL && styles.rowRTL]}
          onPress={onToggleExpanded}
          accessibilityRole="button"
          accessibilityLabel={`${summaryText}. ${isExpanded ? t('Collapse') : t('Expand')}`}
          activeOpacity={0.7}
        >
          <Text style={styles.summaryText}>{summaryText}</Text>
          {isExpanded ? (
            <ChevronDown size={18} color={theme.colors.textPrimary} />
          ) : (
            <ChevronUp size={18} color={theme.colors.textPrimary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.doneButton, isRTL && styles.doneButtonRTL]}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={t('Done')}
          activeOpacity={0.8}
        >
          <Check size={16} color={theme.colors.textInverted} strokeWidth={2.5} />
          <Text style={styles.doneButtonText}>{t('Done')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    wrapper: {
      marginHorizontal: -theme.spacing.md,
      backgroundColor: theme.colors.surfaceElevated || theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      shadowColor: theme.colors.textPrimary,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    expandedDrawer: {
      maxHeight: 220,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    drawerHeader: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    drawerTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    itemsScroll: {
      maxHeight: 180,
    },
    itemsScrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    itemMeta: {
      flex: 1,
      paddingRight: theme.spacing.sm,
    },
    itemMetaRTL: {
      paddingRight: 0,
      paddingLeft: theme.spacing.sm,
      alignItems: 'flex-end',
    },
    itemName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    itemSubText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    itemCalories: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginRight: theme.spacing.sm,
    },
    itemCaloriesRTL: {
      marginRight: 0,
      marginLeft: theme.spacing.sm,
    },
    removeButton: {
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trayBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    summaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceSubtle || theme.colors.surface,
      borderRadius: theme.radius.md,
    },
    summaryText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginRight: theme.spacing.xs,
    },
    doneButton: {
      minHeight: 44,
      minWidth: 84,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.full,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    doneButtonRTL: {
      flexDirection: 'row-reverse',
    },
    doneButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textInverted,
    },
  });
