import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useAppDialog } from './dialogs/AppDialogProvider';
import { AppText as Text } from './AppText';
import {
  X,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Pill,
} from 'lucide-react-native';
import { LoggedMeal, LoggedDailySupplement, UserProfile } from '../types';
import {
  SupportedNutrientKey,
  ORDERED_NUTRIENT_KEYS,
  calculateNutrientDayProgress,
  formatIntakeBreakdown,
} from '../utils/nutrientTotals';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface NutrientDetailModalProps {
  visible: boolean;
  initialNutrientKey?: SupportedNutrientKey | string;
  meals: LoggedMeal[];
  supplements?: LoggedDailySupplement[];
  waterGlasses?: number;
  profile?: UserProfile;
  onClose: () => void;
  onSaveGoal?: (nutrientKey: SupportedNutrientKey, newTarget: number) => Promise<void> | void;
  onResetGoal?: (nutrientKey: SupportedNutrientKey) => Promise<void> | void;
}

export const NutrientDetailModal: React.FC<NutrientDetailModalProps> = ({
  visible,
  initialNutrientKey = 'calories',
  meals = [],
  supplements = [],
  waterGlasses,
  profile,
  onClose,
  onSaveGoal,
  onResetGoal,
}) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isRtl = useIsRTL();
  const t = useCallback((key: string) => translate(language, key), [language]);

  const [activeKey, setActiveKey] = useState<SupportedNutrientKey>(() => {
    return (ORDERED_NUTRIENT_KEYS.includes(initialNutrientKey as SupportedNutrientKey)
      ? initialNutrientKey
      : 'calories') as SupportedNutrientKey;
  });

  // Keep activeKey synced when modal opens with a new initialNutrientKey
  const currentInitialKey = initialNutrientKey ?? 'calories';
  const currentVisible = Boolean(visible);
  const [prevInitialKey, setPrevInitialKey] = useState(currentInitialKey);
  const [prevVisible, setPrevVisible] = useState(currentVisible);
  if (currentInitialKey !== prevInitialKey || (currentVisible && !prevVisible)) {
    setPrevInitialKey(currentInitialKey);
    setPrevVisible(currentVisible);
    const targetKey = (ORDERED_NUTRIENT_KEYS.includes(currentInitialKey as SupportedNutrientKey)
      ? currentInitialKey
      : 'calories') as SupportedNutrientKey;
    setActiveKey(targetKey);
  } else if (currentVisible !== prevVisible) {
    setPrevVisible(currentVisible);
  }

  // Goal editing state
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const progress = useMemo(() => {
    return calculateNutrientDayProgress(activeKey, meals, supplements, profile, waterGlasses);
  }, [activeKey, meals, supplements, profile, waterGlasses]);

  const intakeBreakdown = useMemo(() => {
    return formatIntakeBreakdown(progress, t);
  }, [progress, t]);

  const progressColor = theme.colors[progress.colorToken] || theme.colors.primary;
  const isNumericPercent = progress.hasTarget && !progress.isLimitNutrient && progress.hasData;

  const handleStartEdit = () => {
    setGoalInput(progress.target > 0 ? String(progress.target) : '');
    setIsEditingGoal(true);
  };

  const handleCancelEdit = () => {
    setIsEditingGoal(false);
    setGoalInput('');
  };

  const handleCommitGoal = async () => {
    const parsed = parseFloat(goalInput.trim());
    if (isNaN(parsed) || parsed <= 0) {
      dialog.notify({
        title: t('Invalid Goal'),
        message: t('Please enter a valid positive number for your goal.'),
      });
      return;
    }

    try {
      setIsSavingGoal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (onSaveGoal) {
        await onSaveGoal(activeKey, Math.round(parsed * 10) / 10);
      }
      setIsEditingGoal(false);
    } catch (err) {
      console.error('Failed to save nutrient goal:', err);
      dialog.notify({
        title: t('Save Error'),
        message: t('Could not save your new goal. Please try again.'),
      });
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleResetGoal = async () => {
    try {
      setIsSavingGoal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (onResetGoal) {
        await onResetGoal(activeKey);
      }
      setIsEditingGoal(false);
    } catch (err) {
      console.error('Failed to reset nutrient goal:', err);
    } finally {
      setIsSavingGoal(false);
    }
  };

  const pctFill = Math.min(100, progress.percent);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.backdrop, { direction: isRtl ? 'rtl' : 'ltr' }]}>
        <KeyboardAvoidingView
          behavior="padding"
          style={{ width: '100%', justifyContent: 'flex-end' }}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom > 0 ? insets.bottom : 0 }]}>
          {/* Header */}
          <View style={[styles.header]}>
            <View style={{ flex: 1 }}>
              <View style={[styles.titleRow]}>
                <Text style={styles.sheetTitle}>{t(progress.label)}</Text>
                <View style={[styles.unitPill, { backgroundColor: `${progressColor}20` }]}>
                  <Text style={[styles.unitText, { color: progressColor }]}>{progress.unit}</Text>
                </View>
              </View>
              <Text style={styles.sheetSub}>
                {translate(language, 'Daily breakdown and contribution ranking')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('Close')}
              accessibilityRole="button"
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Nutrient Tab Bar */}
          <View style={styles.tabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.tabsScroll, isRtl && styles.tabsScrollRtl]}
            >
              {ORDERED_NUTRIENT_KEYS.map((key) => {
                const isActive = key === activeKey;
                const tabMeta = calculateNutrientDayProgress(key, meals, supplements, profile, waterGlasses);
                const tabColor = theme.colors[tabMeta.colorToken] || theme.colors.primary;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.tabPill,
                      isActive && styles.tabPillActive,
                      isActive && { borderColor: tabColor },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveKey(key);
                      setIsEditingGoal(false);
                    }}
                    accessibilityRole="tab"
                    accessibilityLabel={tabMeta.label}
                    accessibilityState={{ selected: isActive }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isActive && styles.tabTextActive,
                        isActive && { color: tabColor },
                      ]}
                    >
                      {t(tabMeta.label)}
                    </Text>
                    {tabMeta.isIncomplete && (
                      <Text style={styles.tabIncompleteStar} accessibilityLabel={t('Incomplete data')}>
                        *
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(40, insets.bottom + 28) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Primary Progress Card */}
            <View style={styles.progressCard}>
              <View style={[styles.progressTopRow]}>
                <View style={styles.progressLeftCol}>
                  <View style={[styles.amountRow]}>
                    <Text style={styles.currentAmount}>
                      {progress.hasData ? progress.current : '—'}
                    </Text>
                    {progress.hasTarget && (
                      <Text style={styles.targetAmount}>
                        / {progress.target} {progress.unit}
                      </Text>
                    )}
                    {progress.isIncomplete && (
                      <Text style={styles.asteriskIndicator} accessibilityLabel={t('Incomplete data')}>
                        *
                      </Text>
                    )}
                  </View>
                  <Text style={styles.currentLabel}>{t('Today’s Intake')}</Text>
                  {intakeBreakdown ? (
                    <Text style={styles.breakdownSubText}>{intakeBreakdown}</Text>
                  ) : null}
                </View>

                {/* Percentage & Status Pill */}
                <View
                  style={[
                    styles.statusBadge,
                    isRtl && styles.statusBadgeRtl,
                    { backgroundColor: `${progressColor}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isNumericPercent ? styles.statusBadgeTextNumeric : styles.statusBadgeTextLong,
                      { color: progressColor },
                      isRtl && styles.statusBadgeTextRtl,
                    ]}
                  >
                    {!progress.hasTarget
                      ? t('No Target')
                      : progress.isLimitNutrient
                      ? progress.current <= progress.target
                        ? t('Within reference limit')
                        : t('Above reference limit')
                      : progress.hasData
                      ? `${progress.percent}%`
                      : t('Not enough data')}
                  </Text>
                  <Text style={[styles.statusSubText, isRtl && styles.statusSubTextRtl]}>
                    {!progress.hasTarget
                      ? t(progress.noTargetReason || 'No daily target for under 19')
                      : progress.isLimitNutrient
                      ? progress.current <= progress.target
                        ? `${Math.round((progress.target - progress.current) * 10) / 10} ${progress.unit} ${t('below limit')}`
                        : `${Math.round((progress.current - progress.target) * 10) / 10} ${progress.unit} ${t('above limit')}`
                      : progress.hasData
                      ? progress.remaining > 0
                        ? `${progress.remaining} ${progress.unit} ${t('remaining')}`
                        : progress.percent > 100
                        ? t('Above target')
                        : t('Target reached')
                      : t('Incomplete data')}
                  </Text>
                </View>
              </View>

              {/* Progress Bar Track (Omitted if no target) */}
              {progress.hasTarget && (
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pctFill}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Goal Progress Ring & Stats */}
            </View>

            {/* Reference Upper Intake Limit (Item 6 requirement: neutral reference, not medical advice) */}
            {progress.upperLimit !== undefined && (
              <View style={styles.upperLimitCard}>
                <View style={[styles.upperLimitHeader]}>
                  <Info size={15} color={theme.colors.textSecondary} />
                  <Text style={styles.upperLimitTitle}>
                    {t('Reference Upper Limit')}: {progress.upperLimit} {progress.unit}
                    {progress.upperLimitScope === 'supplements_only' ? ` (${t('Supplements only')})` : ''}
                  </Text>
                </View>
                <Text style={styles.upperLimitText}>
                  {progress.upperLimitDescription
                    ? t(progress.upperLimitDescription)
                    : t('Dietary reference guidance for general informational reference, not medical advice.')}
                </Text>
                {progress.upperLimitWarning && (
                  <Text style={styles.upperLimitWarningText}>
                    {t(progress.upperLimitWarning)}
                  </Text>
                )}
              </View>
            )}

            {/* Goal Management Card (Item 2 requirement: edit the goal stored safely) */}
            <View style={styles.goalCard}>
              <View style={[styles.goalHeaderRow]}>
                <View style={{ flex: 1, minWidth: 140 }}>
                  <Text style={[styles.goalSectionTitle, isRtl && styles.textRtl]}>{t('Daily Goal')}</Text>
                  <Text style={[styles.goalSubtitle, isRtl && styles.textRtl]}>
                    {progress.isCustomTarget
                      ? t('Custom goal set by you')
                      : progress.isMinor
                      ? t('Adolescent (<19): Adult DRIs not shown.')
                      : progress.isGeneralAdultTarget
                      ? `${progress.targetType || 'DRI'} · ${t('General adult reference target')}`
                      : progress.targetType
                      ? `${progress.targetType} (${t('National Academies DRI')})`
                      : t('Standard recommended allowance')}
                  </Text>
                </View>

                {!isEditingGoal && (
                  <TouchableOpacity
                    style={[styles.editGoalBtn]}
                    onPress={handleStartEdit}
                    accessibilityRole="button"
                    accessibilityLabel={t('Edit Goal')}
                  >
                    <Edit2 size={14} color={theme.colors.primary} />
                    <Text style={styles.editGoalBtnText}>{t('Edit Goal')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {progress.isGeneralAdultTarget && !progress.isCustomTarget && progress.hasTarget && (
                <View style={[styles.generalAdultNotice]}>
                  <Info size={14} color={theme.colors.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                  <Text style={[styles.generalAdultNoticeText, isRtl && styles.textRtl]}>
                    {t(
                      'General adult reference values are applied when gender is not specified or is other. These values may differ from sex-specific recommendations.'
                    )}
                  </Text>
                </View>
              )}

              {isEditingGoal ? (
                <View style={styles.goalEditForm}>
                  <View style={[styles.inputRow]}>
                    <TextInput
                      style={[styles.goalInput, isRtl && styles.textRtl]}
                      keyboardType="numeric"
                      value={goalInput}
                      onChangeText={setGoalInput}
                      placeholder={String(progress.target)}
                      placeholderTextColor={theme.colors.textMuted}
                      autoFocus
                    />
                    <Text style={styles.inputUnit}>{progress.unit}</Text>
                  </View>

                  <View style={[styles.editActionsRow]}>
                    {progress.isCustomTarget && (
                      <TouchableOpacity
                        style={styles.resetBtn}
                        onPress={handleResetGoal}
                        disabled={isSavingGoal}
                        accessibilityRole="button"
                        accessibilityLabel={t('Reset to default')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <RotateCcw size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.resetBtnText}>{t('Reset to default')}</Text>
                      </TouchableOpacity>
                    )}

                    <View style={[styles.commitActionsGroup]}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={handleCancelEdit}
                        disabled={isSavingGoal}
                        accessibilityRole="button"
                        accessibilityLabel={t('Cancel')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.saveGoalBtn}
                        onPress={handleCommitGoal}
                        disabled={isSavingGoal}
                        accessibilityRole="button"
                        accessibilityLabel={isSavingGoal ? t('Saving...') : t('Save')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Check size={14} color={theme.colors.textInverted} />
                        <Text style={styles.saveGoalBtnText}>
                          {isSavingGoal ? t('Saving...') : t('Save')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[styles.goalStaticRow]}>
                  <Text style={styles.goalStaticValue}>
                    {progress.hasTarget
                      ? `${progress.target} ${progress.unit} ${t('per day')}`
                      : t(progress.noTargetReason || 'No daily target for under 19')}
                  </Text>
                  {progress.isCustomTarget && (
                    <TouchableOpacity
                      onPress={handleResetGoal}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={t('Reset')}
                    >
                      <Text style={styles.resetLinkText}>{t('Reset')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Top Contributors Ranked List (Item 2 requirement: sorted by contribution) */}
            <View style={styles.contributorsSection}>
              <View style={[styles.sectionTitleRow]}>
                <Text style={styles.sectionTitle}>{t('Top Contributors Today')}</Text>
                <Text style={styles.contributorCount}>
                  {progress.contributors.length}{' '}
                  {progress.contributors.length === 1 ? t('source') : t('sources')}
                </Text>
              </View>

              {progress.contributors.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Info size={18} color={theme.colors.textMuted} />
                  <Text style={styles.emptyText}>
                    {t('No intake logged yet today. Log a meal or supplement to track.')}
                  </Text>
                </View>
              ) : (
                <View style={styles.contributorList}>
                  {progress.contributors.map((c, index) => {
                    const isSupp = c.isSupplement;
                    return (
                      <View key={`${c.id}_${index}`} style={styles.contributorRow}>
                        <View style={[styles.contributorInfo]}>
                          <View
                            style={[
                              styles.contributorRank,
                              index === 0 && styles.rankFirst,
                            ]}
                          >
                            <Text
                              style={[
                                styles.rankText,
                                index === 0 && styles.rankFirstText,
                              ]}
                            >
                              {index + 1}
                            </Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={[styles.contributorNameRow]}>
                              <Text style={styles.contributorName} numberOfLines={1}>
                                {c.name}
                              </Text>
                              {isSupp && (
                                <View style={styles.suppTag}>
                                  <Pill size={11} color={theme.colors.primary} />
                                  <Text style={styles.suppTagText}>{t('Supplement')}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.contributorSub}>
                              {isSupp ? t('Taken today') : t(c.mealType || 'Meal')}
                            </Text>
                          </View>

                          <View style={[styles.contributorValueCol, isRtl && { alignItems: 'flex-start' }]}>
                            <Text style={styles.contributorAmount}>
                              {c.amount} {c.unit}
                            </Text>
                            <Text style={styles.contributorPct}>{c.percentage}%</Text>
                          </View>
                        </View>

                        {/* Relative Contribution Bar */}
                        <View style={styles.contribTrack}>
                          <View
                            style={[
                              styles.contribFill,
                              {
                                width: `${Math.min(100, c.percentage)}%`,
                                backgroundColor: progressColor,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Dietary Sources & Science Info */}
            {(progress.description || progress.foodSources) && (
              <View style={styles.sourcesCard}>
                {progress.description && (
                  <View style={progress.foodSources ? styles.descriptionContainer : undefined}>
                    <Text style={[styles.descriptionText, isRtl && styles.textRtl]}>
                      {translate(language, progress.description)}
                    </Text>
                  </View>
                )}
                {progress.foodSources && (
                  <>
                    <View style={[styles.sourcesHeader]}>
                      <Sparkles size={15} color={theme.colors.primary} />
                      <Text style={[styles.sourcesTitle, isRtl && styles.textRtl]}>{t('Natural Dietary Sources')}</Text>
                    </View>
                    <Text style={[styles.sourcesContent, isRtl && styles.textRtl]}>{translate(language, progress.foodSources)}</Text>
                  </>
                )}
              </View>
            )}

            {/* National Academies DRI & Medical Disclaimer */}
            <View style={styles.disclaimerCard}>
              <View style={[styles.disclaimerHeader]}>
                <Info size={14} color={theme.colors.textMuted} />
                <Text style={[styles.disclaimerTitle, isRtl && styles.textRtl]}>
                  {t('Dietary Reference Intakes (DRIs)')}
                </Text>
              </View>
              <Text style={[styles.disclaimerText, isRtl && styles.textRtl]}>
                {progress.citation ? `${progress.citation}. ` : ''}
                {t(progress.disclaimer || 'Formulated for healthy adults 19+. Pregnancy, lactation, and medical conditions are not handled. Upper limits are safety ceilings, not goals.')}
              </Text>
              {progress.isGeneralAdultTarget && !progress.isCustomTarget && (
                <Text style={[styles.disclaimerText, isRtl && styles.textRtl, { marginTop: 6 }]}>
                  {t(
                    'Note: General adult reference values are applied for unspecified or non-binary gender, which may use the higher recommended intake among adult sex categories.'
                  )}
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '88%',
    paddingTop: theme.spacing.md,
    ...theme.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  textRtl: {
    textAlign: 'right',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sheetSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
  },
  tabsScrollRtl: {
    flexDirection: 'row-reverse',
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  tabPillActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadow.subtle,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    fontWeight: '700',
  },
  tabIncompleteStar: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.amberText,
    marginLeft: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    gap: 16,
  },
  progressCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  progressLeftCol: {
    flex: 1,
    minWidth: 120,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexWrap: 'wrap',
  },
  currentAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
  asteriskIndicator: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.amberText,
    marginLeft: 2,
  },
  currentLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  breakdownSubText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  statusBadge: {
    flexShrink: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.md,
    alignItems: 'flex-end',
    maxWidth: '100%',
  },
  statusBadgeRtl: {
    alignItems: 'flex-start',
  },
  statusBadgeText: {
    // Dynamic color applied inline
  },
  statusBadgeTextNumeric: {
    fontSize: 20,
    fontWeight: '800',
  },
  statusBadgeTextLong: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  statusBadgeTextRtl: {
    textAlign: 'left',
  },
  statusSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
    textAlign: 'right',
  },
  statusSubTextRtl: {
    textAlign: 'left',
  },
  progressTrack: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
  completenessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  completenessBannerText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
  },
  incompleteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.amberLight,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.amberBorder,
  },
  incompleteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.amberDark,
  },
  incompleteText: {
    fontSize: 12,
    color: theme.colors.amberText,
    marginTop: 2,
  },
  upperLimitCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  upperLimitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  upperLimitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  upperLimitText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  upperLimitWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.amberText,
    marginTop: 2,
  },
  disclaimerCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  disclaimerText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  goalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  generalAdultNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
  },
  generalAdultNoticeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    flex: 1,
  },
  goalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  goalSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  editGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  editGoalBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  goalStaticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  goalStaticValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  resetLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textDecorationLine: 'underline',
  },
  goalEditForm: {
    gap: 12,
    paddingTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  goalInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    paddingVertical: 6,
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commitActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  cancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  saveGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
  },
  saveGoalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetBtnText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  contributorsSection: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  contributorCount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.md,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  contributorList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  contributorRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  contributorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contributorRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankFirst: {
    backgroundColor: theme.colors.amberLight,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  rankFirstText: {
    color: theme.colors.amberText,
  },
  contributorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contributorName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  suppTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: `${theme.colors.primary}15`,
  },
  suppTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  contributorSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  contributorValueCol: {
    minWidth: 70,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  contributorAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  contributorPct: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  contribTrack: {
    height: 4,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  contribFill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
  missingSection: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: 12,
    gap: 8,
  },
  missingSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  missingList: {
    gap: 6,
  },
  missingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missingFoodName: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  notAvailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notAvailText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  sourcesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  descriptionContainer: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourcesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  sourcesContent: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
