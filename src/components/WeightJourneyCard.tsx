import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { AppText as Text } from './AppText';
import { Scale, Plus, ArrowRight } from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from './AnimatedPressable';

interface WeightJourneyCardProps {
  currentWeightKg: number;
  targetWeightKg?: number;
  heightCm: number;
  weightHistory?: number[]; // past recent weight samples
  onLogWeight?: () => void;
}

export const WeightJourneyCard: React.FC<WeightJourneyCardProps> = ({
  currentWeightKg,
  targetWeightKg,
  heightCm,
  weightHistory = [],
  onLogWeight,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = useCallback((key: string) => translate(language, key), [language]);

  // BMI Calculation
  const bmi = useMemo(() => {
    if (!heightCm || heightCm <= 0 || !currentWeightKg || currentWeightKg <= 0) return null;
    const heightM = heightCm / 100;
    return parseFloat((currentWeightKg / (heightM * heightM)).toFixed(1));
  }, [currentWeightKg, heightCm]);

  const bmiMeta = useMemo(() => {
    if (!bmi) return null;
    if (bmi < 18.5) return { label: t('Underweight'), color: theme.colors.sky, bg: theme.colors.skyLight };
    if (bmi < 25) return { label: t('Normal weight'), color: theme.colors.emeraldDark, bg: theme.colors.emeraldLight };
    if (bmi < 30) return { label: t('Overweight'), color: theme.colors.amberDark, bg: theme.colors.amberLight };
    return { label: t('Obese'), color: theme.colors.danger, bg: theme.colors.dangerLight };
  }, [bmi, theme, t]);

  // Mini Sparkline Points
  const sparklinePoints = useMemo(() => {
    const history = weightHistory.length >= 2 ? weightHistory : [currentWeightKg, currentWeightKg];
    const min = Math.min(...history) - 0.5;
    const max = Math.max(...history) + 0.5;
    const range = max - min || 1;
    const width = 80;
    const height = 28;

    return history
      .map((val, idx) => {
        const x = (idx / (history.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [weightHistory, currentWeightKg]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconBox}>
            <Scale size={18} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('Weight Journey')}</Text>
            {bmi && bmiMeta && (
              <View style={[styles.bmiPill, { backgroundColor: bmiMeta.bg }]}>
                <Text style={[styles.bmiText, { color: bmiMeta.color }]}>
                  BMI {bmi} · {bmiMeta.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        {onLogWeight && (
          <AnimatedPressable
            style={styles.logWeightBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onLogWeight();
            }}
            minScale={0.94}
            accessibilityRole="button"
            accessibilityLabel={t('Log Weight')}
          >
            <Plus size={13} color={theme.colors.primary} />
            <Text style={styles.logWeightText}>{t('Log')}</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* Weight Progress Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>{t('Current')}</Text>
          <Text style={styles.metricValue}>
            {currentWeightKg} <Text style={styles.metricUnit}>{t('kg')}</Text>
          </Text>
        </View>

        {targetWeightKg ? (
          <>
            <View style={styles.arrowBlock}>
              <ArrowRight size={16} color={theme.colors.textMuted} />
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>{t('Goal')}</Text>
              <Text style={styles.metricValue}>
                {targetWeightKg} <Text style={styles.metricUnit}>{t('kg')}</Text>
              </Text>
            </View>
          </>
        ) : null}

        {/* Mini Sparkline Chart */}
        <View style={styles.sparklineContainer}>
          <Svg width={80} height={28} viewBox="0 0 80 28">
            <Polyline
              points={sparklinePoints}
              fill="none"
              stroke={theme.colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginVertical: theme.spacing.xs,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    titleWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.serif,
    },
    bmiPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: theme.radius.full,
      marginTop: 2,
    },
    bmiText: {
      fontSize: 12,
      fontWeight: '600',
    },
    logWeightBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    logWeightText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    metricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceSubtle,
      borderRadius: theme.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    metricBlock: {
      alignItems: 'flex-start',
    },
    metricLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.serif,
    },
    metricUnit: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textSecondary,
    },
    arrowBlock: {
      paddingHorizontal: 4,
    },
    sparklineContainer: {
      width: 80,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
