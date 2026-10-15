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
import { getScopedStorageKey } from '../storage/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bot, Send, Sparkles, Trash2 } from 'lucide-react-native';
import { DailyLog, UserProfile } from '../types';
import { AppText as Text } from '../components/AppText';
import { translate } from '../i18n/strings';
import { useLanguage } from '../i18n/I18nContext';
import { askNutritionCoach, getStoredGeminiApiKey } from '../services/plateAnalysisService';
import { GeminiError, getDefaultMessageForKind } from '../utils/geminiModels';
import { formatDisplayDate } from '../utils/dateUtils';
import { SkeletonCoachBubble } from '../components/SkeletonLoader';
import { theme } from '../theme';
import { isReducedMotion } from '../utils/motion';
import { AnimatedPressable } from '../components/AnimatedPressable';

interface CoachScreenProps {
  profile: UserProfile;
  log: DailyLog;
}

interface Message {
  role: 'user' | 'coach';
  text: string;
}

const COACH_HISTORY_KEY = '@fittrack_coach_history';

export function CoachScreen({ profile, log }: CoachScreenProps) {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
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

  const totals = useMemo(() => log.meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [log.meals]);

  const burnedCalories = useMemo(
    () => (log.workouts || []).reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
    [log.workouts]
  );

  const t = (value: string) => translate(language, value);

  // Restore persisted chat history on mount safely without overwriting concurrent user messages
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
              // Prepend loaded history before any user message sent while loading was in-flight
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
      AsyncStorage.setItem(getScopedStorageKey(COACH_HISTORY_KEY), JSON.stringify(messages.slice(-20))).catch(() => {});
    }
  }, [messages]);

  // Auto-scroll to bottom on new messages or loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: !isReducedMotion() });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, busy]);

  // When the keyboard reduces the available height, keep the newest message and
  // the reply composer in view instead of leaving the conversation at its old offset.
  useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: !isReducedMotion() });
      }, 120);
    });
    return () => {
      subscription.remove();
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput('');
    setError('');
    setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    setBusy(true);
    try {
      const languageName = language === 'ar' ? 'Arabic' : language === 'ckb' ? 'Sorani Kurdish' : 'English';
      const transcript = [...messages, { role: 'user' as const, text: trimmed }].slice(-8).map(item => `${item.role === 'user' ? 'User' : 'Coach'}: ${item.text}`).join('\n');
      const workoutSummary = (log.workouts || []).map((w) => `${w.name} (${w.durationMinutes}min, ${w.caloriesBurned}kcal)`).join(', ');
      const reply = await askNutritionCoach(transcript, {
        name: profile.name,
        goal: profile.goal,
        targetCalories: profile.targetCalories,
        ...totals,
        waterGlasses: log.waterGlasses,
        burnedCalories,
        ...(workoutSummary ? { workouts: workoutSummary } : {}),
      } as any, languageName);
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { paddingBottom: bottomPadding, direction: language === 'en' ? 'ltr' : 'rtl' }]}>
      <View style={styles.header}>
        <View style={styles.icon}><Bot size={20} color={theme.colors.primary} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('AI Coach')}</Text>
          <Text style={styles.subtitle}>{formatDisplayDate(log.date, language)} · {totals.calories} kcal</Text>
        </View>
        {messages.length > 0 && (
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

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{t('AI guidance is educational, not medical advice.')}</Text>
      </View>

      {hasKey === false && (
        <View style={styles.keyNotice}>
          <Text style={styles.keyNoticeText}>{t('Connect a Gemini API key in Profile to use AI features.')}</Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: !isReducedMotion() })}
      >
        {messages.length === 0 ? (
          <View style={styles.welcomeCard}>
            <Sparkles size={22} color={theme.colors.secondary} />
            <Text style={styles.welcomeTitle}>{t('A clearer view of your day')}</Text>
            <Text style={styles.welcomeCopy}>
              {t('Ask about your meals, daily targets, or practical ways to build a balanced routine.')}
            </Text>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => send(t('Give me a brief review of my nutrition log today, with one practical suggestion.'))}
              disabled={busy}
              accessibilityRole="button"
            >
              <Sparkles size={15} color={theme.colors.primary} />
              <Text style={styles.reviewText}>{t('Get a daily review')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          messages.map((message, index) => (
            <View key={`${message.role}_${index}`} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.coachBubble]}>
              <Text style={message.role === 'user' ? styles.userText : styles.coachText}>{message.text}</Text>
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
          style={[styles.sendButton, (!input.trim() || busy) && styles.sendDisabled]}
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
    </View>
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontFamily: theme.fonts.serif, fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
  clearButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  disclaimer: { borderWidth: 1, borderColor: theme.colors.primaryBorder, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.md, padding: 10, marginBottom: 8 },
  disclaimerText: { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' },
  keyNotice: { borderColor: theme.colors.warning, borderWidth: 1, borderRadius: theme.radius.md, padding: 10, marginBottom: 8 },
  keyNoticeText: { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center' },
  messages: { flex: 1 },
  messagesContent: { paddingVertical: 10, gap: 10, flexGrow: 1, justifyContent: 'flex-end' },
  welcomeCard: { alignSelf: 'center', width: '100%', marginVertical: 22, alignItems: 'center', padding: 22, gap: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface },
  welcomeTitle: { color: theme.colors.textPrimary, fontFamily: theme.fonts.serif, fontSize: 21, fontWeight: '700', textAlign: 'center' },
  welcomeCopy: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  reviewButton: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: theme.radius.full, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 15, paddingVertical: 10 },
  reviewText: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  bubble: { maxWidth: '88%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  coachBubble: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  userText: { color: theme.colors.textInverted, fontSize: 14, lineHeight: 20 },
  coachText: { color: theme.colors.textPrimary, fontSize: 14, lineHeight: 20 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  error: { color: theme.colors.danger, fontSize: 12, paddingHorizontal: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderColor: theme.colors.border, borderWidth: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 7, marginTop: 8 },
  input: { flex: 1, maxHeight: 100, minHeight: 40, paddingHorizontal: 9, paddingVertical: 8, fontSize: 14, color: theme.colors.textPrimary, textAlignVertical: 'top' },
  sendButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  sendDisabled: { opacity: 0.5 },
});
