import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { AppText as Text } from './AppText';
import {
  X,
  Edit2,
  Check,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Info,
  Pill,
} from 'lucide-react-native';
import { LoggedMeal, LoggedDailySupplement, UserProfile } from '../types';
import {
  SupportedNutrientKey,
  ORDERED_NUTRIENT_KEYS,
  calculateNutrientDayProgress,
  formattedNutrientValue,
} from '../utils/nutrientTotals';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface NutrientDetailModalProps {
  visible: boolean;
  initialNutrientKey?: SupportedNutrientKey | string;
  meals: LoggedMeal[];
  supplements?: LoggedDailySupplement[];
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
  profile,
  onClose,
  onSaveGoal,
  onResetGoal,
}) => {
  const language = useLanguage();
  const isRtl = language === 'ar' || language === 'ckb';
  const t = (key: string) => translate(language, key);

  const [activeKey, setActiveKey] = useState<SupportedNutrientKey>(() => {
    return (ORDERED_NUTRIENT_KEYS.includes(initialNutrientKey as SupportedNutrientKey)
      ? initialNutrientKey
      : 'calories') as SupportedNutrientKey;
  });

  // Keep activeKey synced when modal opens with a new initialNutrientKey
  const [prevInitialKey, setPrevInitialKey] = useState(initialNutrientKey);
  if (initialNutrientKey !== prevInitialKey) {
    setPrevInitialKey(initialNutrientKey);
    if (ORDERED_NUTRIENT_KEYS.includes(initialNutrientKey as SupportedNutrientKey)) {
      setActiveKey(initialNutrientKey as SupportedNutrientKey);
    }
  }

  // Goal editing state
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const progress = useMemo(() => {
    return calculateNutrientDayProgress(activeKey, meals, supplements, profile);
  }, [activeKey, meals, supplements, profile]);

  const handleStartEdit = () => {
    setGoalInput(String(progress.target));
    setIsEditingGoal(true);
  };

  const handleCancelEdit = () => {
    setIsEditingGoal(false);
    setGoalInput('');
  };

  const handleCommitGoal = async () => {
    const parsed = parseFloat(goalInput.trim());
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert(t('Invalid Goal'), t('Please enter a valid positive number for your goal.'));
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
      Alert.alert(t('Save Error'), t('Could not save your new goal. Please try again.'));
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { direction: isRtl ? 'rtl' : 'ltr' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', justifyContent: 'flex-end' }}
        >
          <View style={styles.sheet}>
          {/* Header */}
          <View style={[styles.header, isRtl && styles.rowRtl]}>
            <View style={{ flex: 1 }}>
              <View style={[styles.titleRow, isRtl && styles.rowRtl]}>
                <Text style={styles.sheetTitle}>{t(progress.label)}</Text>
                <View style={[styles.unitPill, { backgroundColor: `${progress.color}20` }]}>
                  <Text style={[styles.unitText, { color: progress.color }]}>{progress.unit}</Text>
                </View>
              </View>
              <Text style={styles.sheetSub}>
                {translate(language, 'Daily breakdown and contribution ranking')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
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
                const tabMeta = calculateNutrientDayProgress(key, meals, supplements, profile);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.tabPill,
                      isActive && styles.tabPillActive,
                      isActive && { borderColor: tabMeta.color },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveKey(key);
                      setIsEditingGoal(false);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isActive && styles.tabTextActive,
                        isActive && { color: tabMeta.color },
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

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Primary Progress Card */}
            <View style={styles.progressCard}>
              <View style={[styles.progressTopRow, isRtl && styles.rowRtl]}>
                <View>
                  <View style={[styles.amountRow, isRtl && styles.rowRtl]}>
                    <Text style={styles.currentAmount}>{progress.current}</Text>
                    <Text style={styles.targetAmount}>
                      / {progress.target} {progress.unit}
                    </Text>
                    {progress.isIncomplete && (
                      <Text style={styles.asteriskIndicator} accessibilityLabel={t('Incomplete data')}>
                        *
                      </Text>
                    )}
                  </View>
                  <Text style={styles.currentLabel}>
                    {t('Today’s Intake')}
                    {progress.supplementAmount > 0
                      ? ` (${progress.foodAmount} ${t('food')} + ${progress.supplementAmount} ${t('supplements')})`
                      : ''}
                  </Text>
                </View>

                {/* Percentage & Status Pill */}
                <View style={[styles.statusBadge, { backgroundColor: `${progress.color}15` }]}>
                  <Text style={[styles.statusBadgeText, { color: progress.color }]}>
                    {progress.percent}%
                  </Text>
                  <Text style={styles.statusSubText}>
                    {progress.percent >= 100 ? t('Target reached') : t('of daily goal')}
                  </Text>
                </View>
              </View>

              {/* Progress Bar Track */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pctFill}%`,
                      backgroundColor: progress.color,
                    },
                  ]}
                />
              </View>

              {/* Incomplete Data Marker Warning (Item 3 requirement) */}
              {progress.isIncomplete && (
                <View style={[styles.incompleteBanner, isRtl && styles.rowRtl]}>
                  <AlertCircle size={15} color="#D97706" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.incompleteTitle}>
                      * {t('Incomplete data')} ({progress.missingCount}{' '}
                      {progress.missingCount > 1 ? t('foods') : t('food')})
                    </Text>
                    <Text style={styles.incompleteText}>
                      {t('Some logged foods do not have data for this nutrient.')}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Goal Management Card (Item 2 requirement: edit the goal stored safely) */}
            <View style={styles.goalCard}>
              <View style={[styles.goalHeaderRow, isRtl && styles.rowRtl]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalSectionTitle}>{t('Daily Goal')}</Text>
                  <Text style={styles.goalSubtitle}>
                    {progress.isCustomTarget
                      ? t('Custom goal set by you')
                      : t('Standard recommended allowance')}
                  </Text>
                </View>

                {!isEditingGoal && (
                  <TouchableOpacity
                    style={[styles.editGoalBtn, isRtl && styles.rowRtl]}
                    onPress={handleStartEdit}
                    accessibilityRole="button"
                    accessibilityLabel={t('Edit Goal')}
                  >
                    <Edit2 size={14} color={theme.colors.primary} />
                    <Text style={styles.editGoalBtnText}>{t('Edit Goal')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isEditingGoal ? (
                <View style={styles.goalEditForm}>
                  <View style={[styles.inputRow, isRtl && styles.rowRtl]}>
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

                  <View style={[styles.editActionsRow, isRtl && styles.rowRtl]}>
                    {progress.isCustomTarget && (
                      <TouchableOpacity
                        style={styles.resetBtn}
                        onPress={handleResetGoal}
                        disabled={isSavingGoal}
                        accessibilityRole="button"
                      >
                        <RotateCcw size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.resetBtnText}>{t('Reset to default')}</Text>
                      </TouchableOpacity>
                    )}

                    <View style={[styles.commitActionsGroup, isRtl && styles.rowRtl]}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={handleCancelEdit}
                        disabled={isSavingGoal}
                      >
                        <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.saveGoalBtn}
                        onPress={handleCommitGoal}
                        disabled={isSavingGoal}
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
                <View style={[styles.goalStaticRow, isRtl && styles.rowRtl]}>
                  <Text style={styles.goalStaticValue}>
                    {progress.target} {progress.unit} {t('per day')}
                  </Text>
                  {progress.isCustomTarget && (
                    <TouchableOpacity
                      onPress={handleResetGoal}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.resetLinkText}>{t('Reset')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Top Contributors Ranked List (Item 2 requirement: sorted by contribution) */}
            <View style={styles.contributorsSection}>
              <View style={[styles.sectionTitleRow, isRtl && styles.rowRtl]}>
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
                        <View style={[styles.contributorInfo, isRtl && styles.rowRtl]}>
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
                            <View style={[styles.contributorNameRow, isRtl && styles.rowRtl]}>
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

                          <View style={styles.contributorValueCol}>
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
                                backgroundColor: progress.color,
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

            {/* Foods Without Data (Item 3 requirement: show "not available", never zero) */}
            {progress.missingItems.length > 0 && (
              <View style={styles.missingSection}>
                <Text style={styles.missingSectionTitle}>
                  {t('Foods lacking this nutrient data')} ({progress.missingItems.length})
                </Text>
                <View style={styles.missingList}>
                  {progress.missingItems.map((m, idx) => (
                    <View key={`${m.id}_miss_${idx}`} style={[styles.missingRow, isRtl && styles.rowRtl]}>
                      <Text style={styles.missingFoodName} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <View style={styles.notAvailBadge}>
                        <Text style={styles.notAvailText}>
                          {formattedNutrientValue(undefined, progress.unit, t)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Dietary Sources & Science Info */}
            {progress.foodSources && (
              <View style={styles.sourcesCard}>
                <View style={[styles.sourcesHeader, isRtl && styles.rowRtl]}>
                  <Sparkles size={15} color={theme.colors.primary} />
                  <Text style={styles.sourcesTitle}>{t('Natural Dietary Sources')}</Text>
                </View>
                <Text style={styles.sourcesContent}>{translate(language, progress.foodSources)}</Text>
              </View>
            )}
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    color: '#D97706',
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
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  targetAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  asteriskIndicator: {
    fontSize: 22,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 2,
  },
  currentLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    alignItems: 'flex-end',
  },
  statusBadgeText: {
    fontSize: 18,
    fontWeight: '800',
  },
  statusSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 1,
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
  incompleteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  incompleteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  incompleteText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
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
    alignItems: 'center',
  },
  goalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  goalSubtitle: {
    fontSize: 11,
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
    backgroundColor: '#FEF3C7',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  rankFirstText: {
    color: '#B45309',
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
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  contributorSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  contributorValueCol: {
    alignItems: 'flex-end',
  },
  contributorAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  contributorPct: {
    fontSize: 11,
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
    fontSize: 11,
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
