import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedStorageKey, saveDailyAIReport } from '../storage/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Award,
  Utensils,
  MessageSquareText,
  Lightbulb,
} from 'lucide-react-native';
import { AICoachReport, DailyLog, UserProfile } from '../types';
import { AppText as Text } from '../components/AppText';
import { translate } from '../i18n/strings';
import { useLanguage } from '../i18n/I18nContext';
import { askNutritionCoach, getStoredGeminiApiKey } from '../services/plateAnalysisService';
import { generateDailyAIReport } from '../services/aiReportService';
import { GeminiError, getDefaultMessageForKind } from '../utils/geminiModels';
import { formatDisplayDate } from '../utils/dateUtils';
import { formatKcal } from '../utils/formatKcal';
import { SkeletonCoachBubble } from '../components/SkeletonLoader';
import { theme } from '../theme';
import { isReducedMotion } from '../utils/motion';
import { AnimatedPressable } from '../components/AnimatedPressable';

interface CoachScreenProps {
  profile: UserProfile;
  log: DailyLog;
  onSaveReport?: (report: AICoachReport, date: string) => Promise<void>;
}

interface Message {
  role: 'user' | 'coach';
  text: string;
}

const COACH_HISTORY_KEY = '@fittrack_coach_history';

export function CoachScreen({ profile, log, onSaveReport }: CoachScreenProps) {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const [currentSubView, setCurrentSubView] = useState<'audit' | 'chat'>('audit');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: !isReducedMotion() });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomPadding = isKeyboardVisible
    ? theme.spacing.sm
    : Math.max(100, insets.bottom + 76);

  const totals = useMemo(
    () =>
      log.meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.calories,
          protein: Math.round((acc.protein + meal.protein) * 10) / 10,
          carbs: Math.round((acc.carbs + meal.carbs) * 10) / 10,
          fat: Math.round((acc.fat + meal.fat) * 10) / 10,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [log.meals]
  );

  const burnedCalories = useMemo(
    () => (log.workouts || []).reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
    [log.workouts]
  );

  const t = (value: string) => translate(language, value);

  // Restore persisted chat history on mount
  useEffect(() => {
    getStoredGeminiApiKey()
      .then((key) => setHasKey(Boolean(key)))
      .catch(() => setHasKey(false));

    AsyncStorage.getItem(getScopedStorageKey(COACH_HISTORY_KEY))
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages((current) => (current.length > 0 ? [...parsed, ...current] : parsed));
            }
          } catch {
            // Graceful fallback
          }
        }
      })
      .catch((err) => {
        console.warn('Error reading coach history:', err);
      });
  }, []);

  const confirmClearConversation = () => {
    Alert.alert(
      t('Clear conversation'),
      t('Are you sure you want to clear your chat history?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Clear'),
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            setError('');
            try {
              await AsyncStorage.removeItem(getScopedStorageKey(COACH_HISTORY_KEY));
            } catch (err) {
              console.warn('Failed to clear coach history:', err);
            }
          },
        },
      ]
    );
  };

  // Persist messages whenever chat changes
  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(
        getScopedStorageKey(COACH_HISTORY_KEY),
        JSON.stringify(messages.slice(-20))
      ).catch(() => {});
    }
  }, [messages]);

  // Run AI daily audit
  const handleRunAudit = async () => {
    setIsLoadingAudit(true);
    setAuditError(null);
    try {
      const generated = await generateDailyAIReport(
        profile,
        log,
        language,
        undefined,
        undefined,
        getStoredGeminiApiKey
      );
      if (onSaveReport) {
        await onSaveReport(generated, log.date);
      } else {
        await saveDailyAIReport(log.date, generated);
      }
    } catch (err: any) {
      setAuditError(
        err instanceof Error ? err.message : t('Could not generate report. Please try again.')
      );
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput('');
    setError('');
    setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    setBusy(true);
    try {
      const languageName =
        language === 'ar' ? 'Arabic' : language === 'ckb' ? 'Sorani Kurdish' : 'English';
      const transcript = [...messages, { role: 'user' as const, text: trimmed }]
        .slice(-8)
        .map((item) => `${item.role === 'user' ? 'User' : 'Coach'}: ${item.text}`)
        .join('\n');
      const workoutSummary = (log.workouts || [])
        .map((w) => `${w.name} (${w.durationMinutes}min, ${w.caloriesBurned}kcal)`)
        .join(', ');
      const reply = await askNutritionCoach(
        transcript,
        {
          name: profile.name,
          goal: profile.goal,
          targetCalories: profile.targetCalories,
          ...totals,
          waterGlasses: log.waterGlasses,
          burnedCalories,
          ...(workoutSummary ? { workouts: workoutSummary } : {}),
        } as any,
        languageName
      );
      setMessages((current) => [...current, { role: 'coach', text: reply }]);
    } catch (err: any) {
      if (err instanceof GeminiError) {
        setError(t(getDefaultMessageForKind(err.kind)));
      } else {
        setError(err instanceof Error ? err.message : t('Could not reach the AI coach. Try again.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const report = log.aiReport;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      style={{ flex: 1 }}
    >
      <View
        style={[
          styles.container,
          { paddingBottom: bottomPadding, direction: language === 'en' ? 'ltr' : 'rtl' },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.icon}>
            <Bot size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('AI Coach')}</Text>
            <Text style={styles.subtitle}>
              {formatDisplayDate(log.date, language)} · {formatKcal(totals.calories, t)}
            </Text>
          </View>
          {currentSubView === 'chat' && messages.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={confirmClearConversation}
              accessibilityLabel={t('Clear conversation')}
              accessibilityRole="button"
            >
              <Trash2 size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sub-view Segmented Switcher */}
        <View style={styles.switcherContainer}>
          <TouchableOpacity
            style={[styles.switcherBtn, currentSubView === 'audit' && styles.switcherBtnActive]}
            onPress={() => setCurrentSubView('audit')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('Daily Review')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Award
              size={15}
              color={currentSubView === 'audit' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.switcherText,
                currentSubView === 'audit' && styles.switcherTextActive,
              ]}
            >
              {t('Daily Review')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switcherBtn, currentSubView === 'chat' && styles.switcherBtnActive]}
            onPress={() => setCurrentSubView('chat')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('Ask Nutritionist')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MessageSquareText
              size={15}
              color={currentSubView === 'chat' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.switcherText,
                currentSubView === 'chat' && styles.switcherTextActive,
              ]}
            >
              {t('Ask Nutritionist')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            {t('AI guidance is educational, not medical advice.')}
          </Text>
        </View>

        {hasKey === false && (
          <View style={styles.keyNotice}>
            <Text style={styles.keyNoticeText}>
              {t('Connect a Gemini API key in Profile to use AI features.')}
            </Text>
          </View>
        )}

        {/* 1. Daily Audit / Report Mode */}
        {currentSubView === 'audit' && (
          <ScrollView
            style={styles.auditScrollView}
            contentContainerStyle={styles.auditContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Intake Overview Card */}
            <View style={styles.intakeCard}>
              <View style={styles.intakeHeader}>
                <Sparkles size={16} color={theme.colors.warning} />
                <Text style={styles.intakeTitle}>
                  {t('Intake overview for selected day')}
                </Text>
              </View>
              <Text style={styles.intakeMetrics}>
                {totals.calories} / {formatKcal(profile.targetCalories, t)} · {totals.protein}g {t('protein')} · {totals.carbs}g {t('carbs')} · {totals.fat}g {t('fat')} · {log.steps} {t('steps')}
              </Text>

              <TouchableOpacity
                style={styles.runAuditBtn}
                onPress={handleRunAudit}
                disabled={isLoadingAudit}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={report ? t('Update review for selected day') : t('Get Daily Review')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isLoadingAudit ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.textInverted} />
                    <Text style={styles.runAuditBtnText}>{t('Analyzing Nutrition...')}</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} color={theme.colors.textInverted} />
                    <Text style={styles.runAuditBtnText}>
                      {report ? t('Update review for selected day') : t('Get Daily Review')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {auditError && (
              <View style={styles.errorCard}>
                <AlertTriangle size={16} color={theme.colors.danger} />
                <Text style={styles.errorText}>{auditError}</Text>
              </View>
            )}

            {/* Report Content */}
            {report ? (
              <View style={styles.reportContainer}>
                {/* Status & Grade Banner */}
                <View style={styles.gradeBanner}>
                  <View style={styles.gradeBox}>
                    <Text style={styles.gradeLabel}>{t('Status')}</Text>
                    <Text style={styles.gradeValue}>{report.overallGrade}</Text>
                  </View>
                  <View style={styles.gradeDetails}>
                    <Text style={styles.gradeHeadline}>{report.headline}</Text>
                    <Text style={styles.gradeCaloric}>{report.caloricBalance}</Text>
                    <Text style={styles.gradeTimestamp}>
                      {t('Generated at ')}
                      {report.generatedAt}
                    </Text>
                  </View>
                </View>

                {/* Observations & Blind Spots */}
                {report.mistakesAndBlindSpots && report.mistakesAndBlindSpots.length > 0 && (
                  <View style={styles.reportCard}>
                    <View style={styles.cardHeaderRow}>
                      <Lightbulb size={18} color={theme.colors.primary} />
                      <Text style={styles.cardSectionTitle}>
                        {t('Nutrition Observations & Opportunities')}
                      </Text>
                    </View>
                    <View style={styles.listContainer}>
                      {report.mistakesAndBlindSpots.map((item, idx) => (
                        <View key={idx} style={styles.listItemRow}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.listItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Macro Execution */}
                {report.macroBreakdown && (
                  <View style={styles.reportCard}>
                    <View style={styles.cardHeaderRow}>
                      <TrendingUp size={18} color={theme.colors.primary} />
                      <Text style={styles.cardSectionTitle}>{t('Macro Execution')}</Text>
                    </View>
                    <Text style={styles.cardBodyText}>{report.macroBreakdown}</Text>
                  </View>
                )}

                {/* Tomorrow Action Plan */}
                {report.actionableTomorrowFixes && report.actionableTomorrowFixes.length > 0 && (
                  <View style={[styles.reportCard, { backgroundColor: theme.colors.greenLight }]}>
                    <View style={styles.cardHeaderRow}>
                      <CheckCircle2 size={18} color={theme.colors.green} />
                      <Text style={[styles.cardSectionTitle, { color: theme.colors.greenDark }]}>
                        {t('Action Plan for Tomorrow')}
                      </Text>
                    </View>
                    <View style={styles.listContainer}>
                      {report.actionableTomorrowFixes.map((fix, idx) => (
                        <View key={idx} style={styles.numberedItemRow}>
                          <Text style={styles.itemNumber}>#{idx + 1}</Text>
                          <Text style={[styles.listItemText, { color: theme.colors.greenDeep }]}>{fix}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Custom Meal Idea */}
                {report.customMealSuggestion && (
                  <View style={[styles.reportCard, { backgroundColor: theme.colors.creamMuted }]}>
                    <View style={styles.cardHeaderRow}>
                      <Utensils size={18} color={theme.colors.amber} />
                      <Text style={[styles.cardSectionTitle, { color: theme.colors.amberText }]}>
                        {t('Meal idea for selected day')}
                      </Text>
                    </View>
                    <Text style={[styles.cardBodyText, { color: theme.colors.amberDeep }]}>
                      {report.customMealSuggestion}
                    </Text>
                  </View>
                )}

                {/* Coach Note */}
                {report.coachNote && (
                  <View style={styles.reportCard}>
                    <View style={styles.cardHeaderRow}>
                      <Award size={18} color={theme.colors.primary} />
                      <Text style={styles.cardSectionTitle}>{t('Coach Note')}</Text>
                    </View>
                    <Text style={styles.cardBodyText}>{report.coachNote}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyReportCard}>
                <Sparkles size={32} color={theme.colors.secondary} />
                <Text style={styles.emptyReportTitle}>
                  {t('No report generated for this day yet.')}
                </Text>
                <Text style={styles.emptyReportCopy}>
                  {t(
                    'Tap "Get Daily Review" to synthesize an AI-powered nutrition and activity audit for today.'
                  )}
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* 2. Interactive Chat Mode */}
        {currentSubView === 'chat' && (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: !isReducedMotion() })
              }
            >
              {messages.length === 0 ? (
                <View style={styles.welcomeCard}>
                  <Sparkles size={22} color={theme.colors.secondary} />
                  <Text style={styles.welcomeTitle}>{t('A clearer view of your day')}</Text>
                  <Text style={styles.welcomeCopy}>
                    {t(
                      'Ask about your meals, daily targets, or practical ways to build a balanced routine.'
                    )}
                  </Text>
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() =>
                      send(
                        t(
                          'Give me a brief review of my nutrition log today, with one practical suggestion.'
                        )
                      )
                    }
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t('Get a daily review')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Sparkles size={15} color={theme.colors.primary} />
                    <Text style={styles.reviewText}>{t('Get a daily review')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                messages.map((message, index) => (
                  <View
                    key={`${message.role}_${index}`}
                    style={[
                      styles.bubble,
                      message.role === 'user' ? styles.userBubble : styles.coachBubble,
                    ]}
                  >
                    <Text
                      style={
                        message.role === 'user' ? styles.userText : styles.coachText
                      }
                    >
                      {message.text}
                    </Text>
                  </View>
                ))
              )}
              {busy && <SkeletonCoachBubble />}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.composer}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={t('Ask a nutrition question')}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => send(input)}
              />
              <AnimatedPressable
                style={[
                  styles.sendButton,
                  (!input.trim() || busy) && styles.sendDisabled,
                ]}
                onPress={() => send(input)}
                disabled={!input.trim() || busy}
                accessibilityLabel={t('Send')}
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator size="small" color={theme.colors.textInverted} />
                ) : (
                  <Send size={17} color={theme.colors.textInverted} />
                )}
              </AnimatedPressable>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  clearButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    gap: 4,
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
  },
  switcherBtnActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadow.subtle,
  },
  switcherText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  switcherTextActive: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  disclaimer: {
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    padding: 8,
    marginBottom: 8,
  },
  disclaimerText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  keyNotice: {
    borderColor: theme.colors.warning,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: 8,
    marginBottom: 8,
  },
  keyNoticeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },

  // Daily Audit Styles
  auditScrollView: {
    flex: 1,
  },
  auditContent: {
    gap: 12,
    paddingBottom: 24,
  },
  intakeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 8,
    ...theme.shadow.subtle,
  },
  intakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intakeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  intakeMetrics: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  runAuditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
    ...theme.shadow.subtle,
  },
  runAuditBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textInverted,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.redLight,
    borderWidth: 1,
    borderColor: theme.colors.redBorder,
    borderRadius: theme.radius.md,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: '500',
  },
  reportContainer: {
    gap: 12,
  },
  gradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: 16,
    ...theme.shadow.floating,
  },
  gradeBox: {
    width: 62,
    height: 62,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  gradeValue: {
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.white,
    marginTop: -2,
  },
  gradeDetails: {
    flex: 1,
    gap: 2,
  },
  gradeHeadline: {
    fontFamily: theme.fonts.serif,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
    lineHeight: 19,
  },
  gradeCaloric: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  gradeTimestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  reportCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
    ...theme.shadow.subtle,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textPrimary,
  },
  cardBodyText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  listContainer: {
    gap: 8,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: theme.radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  numberedItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: theme.radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.15)',
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.green,
    minWidth: 20,
  },
  listItemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textPrimary,
  },
  emptyReportCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  emptyReportTitle: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyReportCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Interactive Chat Styles
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 10,
    gap: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  welcomeCard: {
    alignSelf: 'center',
    width: '100%',
    marginVertical: 22,
    alignItems: 'center',
    padding: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
  },
  welcomeTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  welcomeCopy: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  reviewButton: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  reviewText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userText: {
    color: theme.colors.textInverted,
    fontSize: 14,
    lineHeight: 20,
  },
  coachText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 12,
    paddingHorizontal: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderColor: theme.colors.border,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 7,
    marginTop: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    paddingHorizontal: 9,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
