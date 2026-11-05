import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { AppText as Text } from './AppText';
import { Utensils, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import {
  CalorieTrendPoint,
  calculateCalorieTrendMetrics,
  getBarXCoordinate,
  MIN_LOGGING_COVERAGE_CALORIES,
} from '../utils/trends';
import { formatDisplayDate } from '../utils/dateUtils';
import { formatKcal } from '../utils/formatKcal';

export interface TrendBarChartProps {
  data: CalorieTrendPoint[];
  targetCalories: number;
  isRTL?: boolean;
  selectedRange?: 7 | 30;
  emptyMessage?: string;
}

export const TrendBarChart: React.FC<TrendBarChartProps> = ({
  data,
  targetCalories,
  isRTL = false,
  selectedRange = 7,
  emptyMessage,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (k: string) => translate(language, k);

  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);

  const hasAnyData = data.some((d) => d.calories > 0);

  if (!data || data.length === 0 || !hasAnyData) {
    return (
      <View style={styles.emptyContainer}>
        <Utensils size={28} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>
          {emptyMessage ? t(emptyMessage) : t('No meals logged in this period.')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {t('Log your breakfast, lunch, or dinner to see daily calorie balance.')}
        </Text>
      </View>
    );
  }

  const metrics = calculateCalorieTrendMetrics(data);

  const width = 320;
  const height = 160;
  const paddingX = 20;
  const paddingY = 28;

  const maxCalorie = Math.max(
    targetCalories * 1.15,
    ...data.map((d) => d.calories),
    1000
  );

  const getY = (val: number) => {
    return height - paddingY - (val / maxCalorie) * (height - paddingY * 2);
  };

  const slotWidth = (width - paddingX * 2) / data.length;
  const barWidth = Math.min(22, Math.max(5, slotWidth * 0.65));
  const targetY = getY(targetCalories);

  const bars = data.map((d, idx) => {
    const barX = getBarXCoordinate(idx, data.length, width, paddingX, barWidth, isRTL);
    const barHeight = Math.max(2, (d.calories / maxCalorie) * (height - paddingY * 2));
    const barY = height - paddingY - barHeight;

    const isOnTarget =
      d.calories >= Math.max(MIN_LOGGING_COVERAGE_CALORIES, d.target * 0.85) &&
      d.calories <= d.target * 1.05;
    const isPartial = d.calories > 0 && d.calories < MIN_LOGGING_COVERAGE_CALORIES;
    const isOver = d.calories > d.target * 1.05;

    let fillColor = theme.colors.primary;
    if (d.calories === 0) {
      fillColor = theme.colors.border;
    } else if (isPartial) {
      fillColor = theme.colors.grayMutedBorder;
    } else if (isOnTarget) {
      fillColor = theme.colors.emeraldDark;
    } else if (isOver) {
      fillColor = theme.colors.amber;
    }

    return {
      barX,
      barY,
      barWidth,
      barHeight,
      fillColor,
      data: d,
      index: idx,
    };
  });

  const inspectedBar = inspectedIndex !== null && bars[inspectedIndex] ? bars[inspectedIndex] : null;

  return (
    <View style={styles.card}>
      {/* Metric Header */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View>
          <View style={[styles.inlineRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.mainAvg}>
              {metrics.avgCalories.toLocaleString()}
            </Text>
            <Text style={styles.unitText}>{t('kcal')}</Text>
          </View>
          <Text style={styles.rangeLabel}>
            {`${t('avg kcal / day')} (${metrics.coveredDaysCount} ${
              metrics.coveredDaysCount === 1 ? t('logged day') : t('logged days')
            })`}
          </Text>
        </View>

        {metrics.coveredDaysCount > 0 && (
          <View style={[styles.adherenceBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <CheckCircle2 size={13} color={theme.colors.emeraldDark} />
            <Text style={styles.adherenceText}>
              {`${metrics.adherenceRate}% ${t('on target')}`}
            </Text>
          </View>
        )}
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgWrapper}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Target Reference Line */}
          <Line
            x1={paddingX}
            y1={targetY}
            x2={width - paddingX}
            y2={targetY}
            stroke={theme.colors.amber}
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <SvgText
            x={isRTL ? width - paddingX - 4 : paddingX + 4}
            y={Math.max(12, targetY - 4)}
            fill={theme.colors.amber}
            fontSize={9}
            fontWeight="600"
            textAnchor={isRTL ? 'end' : 'start'}
          >
            {`${t('Target:')} ${targetCalories}`}
          </SvgText>

          {/* Baseline */}
          <Line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke={theme.colors.border}
            strokeWidth={1}
          />

          {/* Bars */}
          {bars.map((bar, idx) => {
            const isSelected = inspectedIndex === idx;
            return (
              <Rect
                key={idx}
                x={bar.barX}
                y={bar.barY}
                width={bar.barWidth}
                height={bar.barHeight}
                rx={Math.min(4, bar.barWidth / 2)}
                fill={isSelected ? theme.colors.accent : bar.fillColor}
                onPress={() => setInspectedIndex(isSelected ? null : idx)}
              />
            );
          })}

          {/* Date / Day Labels on bottom X axis */}
          {bars.map((bar, idx) => {
            // For 30-day view, only label every 5th bar; for 7-day view, label each bar
            const shouldLabel = selectedRange === 7 || idx % 5 === 0 || idx === bars.length - 1;
            if (!shouldLabel) return null;

            const labelText = bar.data.label || bar.data.date.slice(-2);
            return (
              <SvgText
                key={`label-${idx}`}
                x={bar.barX + bar.barWidth / 2}
                y={height - paddingY + 14}
                fill={theme.colors.textMuted}
                fontSize={selectedRange === 7 ? 9 : 8}
                textAnchor="middle"
              >
                {labelText}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Bar Inspector Pill */}
      {inspectedBar ? (
        <View style={[styles.inspectorPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.inspectorDate}>
            {formatDisplayDate(inspectedBar.data.date, language)}
          </Text>
          <Text style={styles.inspectorValue}>
            {formatKcal(inspectedBar.data.calories, t)}
          </Text>
          <Text style={styles.inspectorPct}>
            ({Math.round((inspectedBar.data.calories / targetCalories) * 100)}% {t('of target')})
          </Text>
        </View>
      ) : (
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>{t('Tap any bar to inspect daily intake.')}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inlineRow: {
    alignItems: 'baseline',
    gap: 4,
  },
  mainAvg: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  rangeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  adherenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.emeraldLight,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.emeraldBorder,
  },
  adherenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.emeraldDark,
  },
  svgWrapper: {
    marginVertical: 4,
    alignItems: 'center',
  },
  inspectorPill: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  inspectorDate: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  inspectorValue: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  inspectorPct: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  hintRow: {
    marginTop: 6,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
});
