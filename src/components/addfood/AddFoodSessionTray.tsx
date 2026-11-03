import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react-native';
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
  t: (key: string) => string;
}

export const AddFoodSessionTray: React.FC<AddFoodSessionTrayProps> = ({
  items,
  isExpanded,
  onToggleExpanded,
  onRemoveItem,
  onDone,
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
    return (
      <View style={styles.emptyContainer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={t('Done')}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>{t('Done')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {isExpanded && (
        <View style={styles.expandedDrawer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>{t('Foods added this session')}</Text>
          </View>
          <ScrollView
            style={styles.itemsScroll}
            contentContainerStyle={styles.itemsScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemSubText} numberOfLines={1}>
                    {item.portion} · {getMealLabel(item.mealType)}
                  </Text>
                </View>

                <Text style={styles.itemCalories}>
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
      <View style={styles.trayBar}>
        <TouchableOpacity
          style={styles.summaryButton}
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
          style={styles.doneButton}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={t('Done')}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>{t('Done')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    emptyContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      alignItems: 'flex-end',
    },
    wrapper: {
      backgroundColor: theme.colors.surfaceElevated || theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      shadowColor: theme.colors.textPrimary,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textInverted,
    },
  });
