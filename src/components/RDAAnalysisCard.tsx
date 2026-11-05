import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AppText as Text } from './AppText';
import {
  calculateMicronutrientIntake,
  ORDERED_MICRONUTRIENT_KEYS,
} from '../utils/micronutrients';
import { formatDataCompleteness } from '../utils/nutrientTotals';
import { MicronutrientKey } from '../data/supplementCatalog';
import { LoggedMeal, LoggedDailySupplement, UserProfile } from '../types';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Info,
  AlertTriangle,
} from 'lucide-react-native';

interface RDAAnalysisCardProps {
  meals?: LoggedMeal[];
  supplements?: LoggedDailySupplement[];
  profile?: UserProfile;
  onSelectNutrient?: (key: MicronutrientKey) => void;
}

export const RDAAnalysisCard: React.FC<RDAAnalysisCardProps> = ({
  meals = [],
  supplements = [],
  profile,
  onSelectNutrient,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isRtl = useIsRTL();
  const [expanded, setExpanded] = useState(false);

  const analysis = calculateMicronutrientIntake(meals, supplements, profile);
  const { nutrients, targetsMetCount, isMinor } = analysis;

  const nutrientsWithDataCount = useMemo(() => {
    return ORDERED_MICRONUTRIENT_KEYS.filter((k) => nutrients[k]?.hasData).length;
  }, [nutrients]);

  const sortedKeys = useMemo(() => {
    return [...ORDERED_MICRONUTRIENT_KEYS].sort((a, b) => {
      const aHas = nutrients[a]?.hasData ? 1 : 0;
      const bHas = nutrients[b]?.hasData ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return ORDERED_MICRONUTRIENT_KEYS.indexOf(a) - ORDERED_MICRONUTRIENT_KEYS.indexOf(b);
    });
  }, [nutrients]);

  const displayedKeys = expanded ? sortedKeys : sortedKeys.slice(0, 3);
  const hasAnyIncomplete = displayedKeys.some((k) => !nutrients[k]?.hasData || nutrients[k]?.isIncomplete);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={[styles.headerRow, isRtl && styles.rowRtl]}>
        <View style={[styles.titleGroup, isRtl && styles.titleGroupRtl]}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={16} color={theme.colors.primary} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.cardTitle}>
              {translate(language, 'Micronutrients & Daily Allowance (RDA)')}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isMinor
                ? translate(language, 'Adolescent (<19): Adult DRIs not shown. Tracking raw intake.')
                : translate(language, 'Estimated intake from meals & taken supplements')}
            </Text>
          </View>
        </View>

        {/* Met score pill */}
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>
            {isMinor
              ? translate(language, 'Minor (<19)')
              : `${targetsMetCount}/${nutrientsWithDataCount} ${translate(language, 'targets met')}`}
          </Text>
        </View>
      </View>

      {/* Primary Highlights (Top 3 or when expanded) */}
      <View style={styles.grid}>
        {displayedKeys.map((key) => {
          const item = nutrients[key];
          const hasData = item?.hasData;
          const hasTarget = typeof item.target === 'number' && item.target > 0;
          const pctWidth = hasData && hasTarget ? Math.min(100, item.percent) : 0;
          const barColor = !hasData || !hasTarget
            ? theme.colors.border
            : item.percent >= 80
            ? theme.colors.emerald
            : item.percent >= 50
            ? theme.colors.amber
            : theme.colors.crimson;

          return (
            <TouchableOpacity
              key={key}
              style={styles.nutrientCard}
              onPress={() => onSelectNutrient?.(key)}
              disabled={!onSelectNutrient}
              activeOpacity={0.75}
              accessibilityRole={onSelectNutrient ? 'button' : 'none'}
              accessibilityLabel={`${translate(language, item.label)}: ${
                hasData
                  ? hasTarget
                    ? `${item.current} / ${item.target} ${item.unit}`
                    : `${item.current} ${item.unit}`
                  : translate(language, 'Not enough data')
              }`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.nutrientTopRow, isRtl && styles.rowRtl]}>
                <View style={[styles.nameGroup, isRtl && styles.rowRtl]}>
                  <Text style={styles.nutrientName}>
                    {translate(language, item.label)}
                  </Text>
                  {(!hasData || item.isIncomplete) && (
                    <Text style={styles.incompleteAsterisk} accessibilityLabel={translate(language, 'Incomplete data')}>
                      *
                    </Text>
                  )}
                </View>
                <Text style={styles.nutrientValues}>
                  {hasData
                    ? hasTarget
                      ? `${item.current} / ${item.target} ${item.unit}`
                      : `${item.current} ${item.unit}`
                    : hasTarget
                    ? `— / ${item.target} ${item.unit}`
                    : `— ${item.unit}`}
                </Text>
              </View>

              {/* Progress track (omitted or flat if no target) */}
              {hasTarget && (
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pctWidth}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Nutrient details sub-row */}
              <View style={[styles.nutrientBottomRow, isRtl && styles.rowRtl]}>
                <Text style={styles.breakdownText}>
                  {hasData
                    ? `${translate(language, 'Food')}: ${item.foodAmount} • ${translate(language, 'Supp')}: ${item.supplementAmount}`
                    : translate(language, 'No data in logged foods')}
                </Text>
                <Text
                  style={[
                    styles.pctBadgeText,
                    {
                      color: !hasData || !hasTarget
                        ? theme.colors.textMuted
                        : item.percent >= 80
                        ? theme.colors.emeraldDark
                        : item.percent >= 50
                        ? theme.colors.amberText
                        : theme.colors.crimsonDark,
                    },
                  ]}
                >
                  {hasData
                    ? hasTarget
                      ? item.remaining > 0
                        ? `${item.percent}% (${item.remaining} ${item.unit} ${translate(language, 'remaining')})`
                        : `${item.percent}% (${translate(language, 'Target reached')})`
                      : `${item.current} ${item.unit}`
                    : `${translate(language, 'Not enough data')} *`}
                </Text>
              </View>

              {/* Data Completeness */}
              {meals.length > 0 && (
                <View style={[styles.completenessRow, isRtl && styles.rowRtl]}>
                  <Text style={styles.completenessText}>
                    {formatDataCompleteness(item.foodsWithDataCount, meals.length, (k) => translate(language, k))}
                  </Text>
                </View>
              )}

              {/* Soft neutral note when below 50% with >= 70% coverage */}
              {hasData && hasTarget && item.percent < 50 && item.coverage >= 0.7 && (
                <View style={[styles.estimatedLowRow, isRtl && styles.rowRtl]}>
                  <Text style={styles.estimatedLowText}>
                    {translate(language, 'estimated low from logged foods')}
                  </Text>
                </View>
              )}

              {/* Upper Limit Warning */}
              {item.upperLimitWarning && (
                <View style={[styles.ulWarningRow, isRtl && styles.rowRtl]}>
                  <AlertTriangle size={12} color={theme.colors.amberText} />
                  <Text style={styles.ulWarningText}>
                    {translate(language, item.upperLimitWarning)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Expand / Collapse Button */}
      <TouchableOpacity
        style={[styles.toggleBtn, isRtl && styles.rowRtl]}
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={
          expanded
            ? translate(language, 'Hide micronutrient breakdown')
            : translate(language, 'Show all 9 micronutrients')
        }
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.toggleBtnText}>
          {expanded
            ? translate(language, 'Hide micronutrient breakdown')
            : translate(language, 'Show all 9 micronutrients')}
        </Text>
        {expanded ? (
          <ChevronUp size={16} color={theme.colors.primary} />
        ) : (
          <ChevronDown size={16} color={theme.colors.primary} />
        )}
      </TouchableOpacity>

      {/* Incomplete Data Footnote if applicable */}
      {hasAnyIncomplete && (
        <View style={[styles.incompleteRow, isRtl && styles.rowRtl]}>
          <Text style={styles.incompleteNoticeText}>
            * {translate(language, 'Incomplete data')}: {translate(language, 'Some logged foods do not have data for this nutrient.')}
          </Text>
        </View>
      )}

      {/* Footnote */}
      <View style={[styles.footnoteRow, isRtl && styles.rowRtl]}>
        <Info size={12} color={theme.colors.textMuted} style={{ marginTop: 1 }} />
        <Text style={styles.footnoteText}>
          {translate(
            language,
            'National Academies DRIs for healthy adults 19+. Pregnancy, lactation, and medical conditions not handled. Upper limits are safety ceilings, not goals.'
          )}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  titleGroupRtl: {
    flexDirection: 'row-reverse',
  },
  titleContainer: {
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  scoreBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexShrink: 0,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  grid: {
    gap: 8,
  },
  nutrientCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nutrientTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  nameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  incompleteAsterisk: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.amberText,
  },
  nutrientName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  nutrientValues: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: theme.colors.textSecondary,
    flexShrink: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  nutrientBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  breakdownText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 1,
  },
  completenessRow: {
    marginTop: 4,
    paddingTop: 3,
  },
  completenessText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  estimatedLowRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  estimatedLowText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  ulWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  ulWarningText: {
    fontSize: 12,
    color: theme.colors.amberText,
    flex: 1,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  incompleteRow: {
    marginTop: 6,
    paddingTop: 6,
  },
  incompleteNoticeText: {
    fontSize: 12,
    color: theme.colors.amberDark,
    fontStyle: 'italic',
  },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footnoteText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
});
