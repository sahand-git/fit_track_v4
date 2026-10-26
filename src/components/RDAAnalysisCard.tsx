import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AppText as Text } from './AppText';
import {
  calculateMicronutrientIntake,
  ORDERED_MICRONUTRIENT_KEYS,
} from '../utils/micronutrients';
import { MicronutrientKey } from '../data/supplementCatalog';
import { LoggedMeal, LoggedDailySupplement } from '../types';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  Info,
} from 'lucide-react-native';

interface RDAAnalysisCardProps {
  meals?: LoggedMeal[];
  supplements?: LoggedDailySupplement[];
  onSelectNutrient?: (key: MicronutrientKey) => void;
}

export const RDAAnalysisCard: React.FC<RDAAnalysisCardProps> = ({
  meals = [],
  supplements = [],
  onSelectNutrient,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isRtl = useIsRTL();
  const [expanded, setExpanded] = useState(false);

  const analysis = calculateMicronutrientIntake(meals, supplements);
  const { nutrients, deficiencies, targetsMetCount } = analysis;

  const hasLogged = meals.length > 0 || supplements.length > 0;
  // If user has logged meals/supplements, hide any nutrient that has no data instead of showing zeros
  const availableKeys = React.useMemo(() => {
    if (!hasLogged) return ORDERED_MICRONUTRIENT_KEYS;
    const withData = ORDERED_MICRONUTRIENT_KEYS.filter((k) => nutrients[k]?.hasData);
    return withData.length > 0 ? withData : ORDERED_MICRONUTRIENT_KEYS;
  }, [hasLogged, nutrients]);

  const activeDeficiencies = React.useMemo(() => {
    return deficiencies.filter((d) => (!hasLogged ? true : d.hasData));
  }, [hasLogged, deficiencies]);

  const displayedKeys = expanded ? availableKeys : availableKeys.slice(0, 3);
  const hasAnyIncomplete = displayedKeys.some((k) => nutrients[k]?.isIncomplete);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={[styles.headerRow, isRtl && styles.rowRtl]}>
        <View style={[styles.titleGroup, isRtl && styles.titleGroupRtl]}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={16} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.cardTitle}>
              {translate(language, 'Micronutrients & Daily Allowance (RDA)')}
            </Text>
            <Text style={styles.cardSubtitle}>
              {translate(language, 'Estimated intake from meals & taken supplements')}
            </Text>
          </View>
        </View>

        {/* Met score pill */}
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>
            {targetsMetCount}/9 {translate(language, 'targets met')}
          </Text>
        </View>
      </View>

      {/* Deficiency Alerts Banner (if any) */}
      {activeDeficiencies.length > 0 && (
        <View style={styles.alertBanner}>
          <View style={[styles.alertHeader, isRtl && styles.rowRtl]}>
            <AlertTriangle size={15} color={theme.colors.amber} style={{ marginTop: 1 }} />
            <Text style={styles.alertTitle}>
              {translate(language, 'Deficiency risks detected (<50% RDA):')}
            </Text>
          </View>
          <View style={styles.deficiencyList}>
            {activeDeficiencies.slice(0, 4).map((d) => (
              <View key={d.key} style={[styles.deficiencyItem, isRtl && styles.rowRtl]}>
                <Text style={styles.deficiencyNutrient}>
                  • {translate(language, d.label)} ({d.percent}%):
                </Text>
                <Text style={styles.deficiencySources}>
                  {' '}{translate(language, d.foodSources)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Primary Highlights (Top 3 or when expanded) */}
      <View style={styles.grid}>
        {displayedKeys.map((key) => {
          const item = nutrients[key];
          const pctWidth = Math.min(100, item.percent);
          const barColor =
            item.percent >= 80
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
              accessibilityLabel={`${translate(language, item.label)}: ${item.current} / ${item.target} ${item.unit}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.nutrientTopRow, isRtl && styles.rowRtl]}>
                <View style={[styles.nameGroup, isRtl && styles.rowRtl]}>
                  <Text style={styles.nutrientName}>
                    {translate(language, item.label)}
                  </Text>
                  {item.isIncomplete && (
                    <Text style={styles.incompleteAsterisk} accessibilityLabel={translate(language, 'Incomplete data')}>
                      *
                    </Text>
                  )}
                </View>
                <Text style={styles.nutrientValues}>
                  {item.current} / {item.target} {item.unit}
                </Text>
              </View>

              {/* Progress track */}
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

              {/* Nutrient details sub-row */}
              <View style={[styles.nutrientBottomRow, isRtl && styles.rowRtl]}>
                <Text style={styles.breakdownText}>
                  {translate(language, 'Food')}: {item.foodAmount} • {translate(language, 'Supp')}: {item.supplementAmount}
                </Text>
                <Text
                  style={[
                    styles.pctBadgeText,
                    {
                      color:
                        item.percent >= 80
                          ? theme.colors.emeraldDark
                          : item.percent >= 50
                          ? theme.colors.amber
                          : theme.colors.crimsonDark,
                    },
                  ]}
                >
                  {item.percent}% {translate(language, 'RDA')}
                </Text>
              </View>
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
            'NIH/IOM adult Recommended Dietary Allowances. For wellness tracking only.'
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
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  alertBanner: {
    backgroundColor: theme.colors.creamMuted,
    borderColor: theme.colors.amberBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.amberDark,
  },
  deficiencyList: {
    gap: 4,
  },
  deficiencyItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  deficiencyNutrient: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.amberText,
  },
  deficiencySources: {
    fontSize: 12,
    color: theme.colors.amberDeep,
    flex: 1,
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
  },
  nameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  incompleteAsterisk: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.amber,
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
  },
  breakdownText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
