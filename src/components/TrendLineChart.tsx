import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { AppText as Text } from './AppText';
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import {
  WeightTrendPoint,
  calculateWeightTrendMetrics,
  getChartXCoordinate,
  buildSmoothSvgPath,
} from '../utils/trends';
import { formatDisplayDate } from '../utils/dateUtils';

export interface TrendLineChartProps {
  data: WeightTrendPoint[];
  targetValue?: number;
  unit?: string;
  isRTL?: boolean;
  selectedRange?: 7 | 30;
  emptyMessage?: string;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  targetValue,
  unit = 'kg',
  isRTL = false,
  selectedRange = 7,
  emptyMessage,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (k: string) => translate(language, k);

  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);

  if (!data || data.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Scale size={28} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>
          {emptyMessage ? t(emptyMessage) : t('Need at least 2 entries for trend chart')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {t('Log your weight across multiple days to view your true trajectory curve.')}
        </Text>
      </View>
    );
  }

  const metrics = calculateWeightTrendMetrics(data);
  const values = data.map((d) => d.value);
  if (targetValue !== undefined) values.push(targetValue);

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const buffer = Math.max(0.5, (rawMax - rawMin) * 0.15);
  const minY = Math.floor(rawMin - buffer);
  const maxY = Math.ceil(rawMax + buffer);
  const rangeY = Math.max(1, maxY - minY);

  const width = 320;
  const height = 150;
  const paddingX = 24;
  const paddingY = 22;

  const getY = (val: number) => {
    return height - paddingY - ((val - minY) / rangeY) * (height - paddingY * 2);
  };

  const points = data.map((d, idx) => ({
    x: getChartXCoordinate(idx, data.length, width, paddingX, isRTL),
    y: getY(d.value),
    data: d,
    index: idx,
  }));

  const linePathD = buildSmoothSvgPath(points);

  // Area under line
  const startX = points[0].x;
  const endX = points[points.length - 1].x;
  const baselineY = height - paddingY;
  const areaPathD = `${linePathD} L ${endX} ${baselineY} L ${startX} ${baselineY} Z`;

  const targetY = targetValue !== undefined ? getY(targetValue) : null;
  const inspectedPoint = inspectedIndex !== null && points[inspectedIndex] ? points[inspectedIndex] : null;

  const delta = metrics ? metrics.delta : 0;
  const isLoss = delta < 0;
  const isGain = delta > 0;

  return (
    <View style={styles.card}>
      {/* Metrics Row */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View>
          <View style={[styles.inlineRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.mainWeight}>
              {metrics ? metrics.lastVal.toFixed(1) : '--'}
            </Text>
            <Text style={styles.unitText}>{unit}</Text>
          </View>
          <Text style={styles.rangeLabel}>
            {`${selectedRange} ${t('days')} ${t('trend')}`}
          </Text>
        </View>

        {metrics && (
          <View
            style={[
              styles.deltaBadge,
              isLoss ? styles.deltaLoss : isGain ? styles.deltaGain : styles.deltaNeutral,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {isLoss ? (
              <TrendingDown size={14} color={theme.colors.emeraldDark} />
            ) : isGain ? (
              <TrendingUp size={14} color={theme.colors.amber} />
            ) : (
              <Minus size={14} color={theme.colors.textMuted} />
            )}
            <Text
              style={[
                styles.deltaText,
                isLoss ? styles.deltaLossText : isGain ? styles.deltaGainText : styles.deltaNeutralText,
              ]}
            >
              {delta > 0 ? `+${delta}` : `${delta}`} {unit}
            </Text>
          </View>
        )}
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgWrapper}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Reference grid line */}
          <Line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke={theme.colors.border}
            strokeDasharray="3 3"
            strokeWidth={1}
          />

          {/* Target Reference Line */}
          {targetY !== null && (
            <>
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
                {`${t('Target:')} ${targetValue} ${unit}`}
              </SvgText>
            </>
          )}

          {/* Gradient area */}
          <Path d={areaPathD} fill="url(#lineGrad)" />

          {/* Main Trend Line */}
          <Path
            d={linePathD}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isSelected = inspectedIndex === idx;
            return (
              <Circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 6 : 3.5}
                fill={isSelected ? theme.colors.surface : theme.colors.primary}
                stroke={theme.colors.primary}
                strokeWidth={isSelected ? 2.5 : 1}
                onPress={() => setInspectedIndex(isSelected ? null : idx)}
              />
            );
          })}
        </Svg>
      </View>

      {/* Point Inspector Pill */}
      {inspectedPoint ? (
        <View style={[styles.inspectorPill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.inspectorDate}>
            {formatDisplayDate(inspectedPoint.data.date, language)}
          </Text>
          <Text style={styles.inspectorValue}>
            {inspectedPoint.data.value} {unit}
          </Text>
          {inspectedPoint.data.note ? (
            <Text style={styles.inspectorNote} numberOfLines={1}>
              • {inspectedPoint.data.note}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>{t('Tap any point to inspect date and details.')}</Text>
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
    marginBottom: 8,
  },
  inlineRow: {
    alignItems: 'baseline',
    gap: 4,
  },
  mainWeight: {
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
  deltaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  deltaLoss: {
    backgroundColor: theme.colors.emeraldLight,
  },
  deltaGain: {
    backgroundColor: theme.colors.amberLight,
  },
  deltaNeutral: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deltaLossText: {
    color: theme.colors.emeraldDark,
  },
  deltaGainText: {
    color: theme.colors.amberText,
  },
  deltaNeutralText: {
    color: theme.colors.textMuted,
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
  inspectorNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flexShrink: 1,
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
