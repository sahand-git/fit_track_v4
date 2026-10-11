import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Bot, Send, Sparkles } from 'lucide-react-native';
import { DailyLog, UserProfile } from '../types';
import { AppText as Text } from '../components/AppText';
import { translate } from '../i18n/strings';
import { useLanguage } from '../i18n/I18nContext';
import { askNutritionCoach } from '../services/plateAnalysisService';
import { getStoredGeminiApiKey } from '../services/plateAnalysisService';
import { formatDisplayDate } from '../utils/dateUtils';
import { theme } from '../theme';

interface CoachScreenProps { profile: UserProfile; log: DailyLog }
interface Message { role: 'user' | 'coach'; text: string }

export function CoachScreen({ profile, log }: CoachScreenProps) {
  const language = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const totals = useMemo(() => log.meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [log.meals]);
  const t = (value: string) => translate(language, value);
  React.useEffect(() => { getStoredGeminiApiKey().then(key => setHasKey(Boolean(key))); }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput('');
    setError('');
    setMessages(current => [...current, { role: 'user', text: trimmed }]);
    setBusy(true);
    try {
      const languageName = language === 'ar' ? 'Arabic' : language === 'ckb' ? 'Sorani Kurdish' : 'English';
      const transcript = [...messages, { role: 'user' as const, text: trimmed }].slice(-8).map(item => `${item.role === 'user' ? 'User' : 'Coach'}: ${item.text}`).join('\n');
      const reply = await askNutritionCoach(transcript, {
        name: profile.name,
        goal: profile.goal,
        targetCalories: profile.targetCalories,
        ...totals,
        waterGlasses: log.waterGlasses,
      }, languageName);
      setMessages(current => [...current, { role: 'coach', text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the AI coach. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.icon}><Bot size={20} color={theme.colors.primary} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.subtitle}>{formatDisplayDate(log.date, language)} · {totals.calories} kcal</Text>
        </View>
      </View>

      <View style={styles.disclaimer}><Text style={styles.disclaimerText}>AI guidance is educational, not medical advice.</Text></View>
      {hasKey === false && <View style={styles.keyNotice}><Text style={styles.keyNoticeText}>Connect a Gemini API key in Profile to use AI features.</Text></View>}

      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.length === 0 ? (
          <View style={styles.welcomeCard}>
            <Sparkles size={22} color={theme.colors.secondary} />
            <Text style={styles.welcomeTitle}>A clearer view of your day</Text>
            <Text style={styles.welcomeCopy}>Ask about your meals, daily targets, or practical ways to build a balanced routine.</Text>
            <TouchableOpacity style={styles.reviewButton} onPress={() => send('Give me a brief review of my nutrition log today, with one practical suggestion.')} disabled={busy}>
              <Sparkles size={15} color={theme.colors.primary} /><Text style={styles.reviewText}>Get a daily review</Text>
            </TouchableOpacity>
          </View>
        ) : messages.map((message, index) => (
          <View key={`${message.role}_${index}`} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.coachBubble]}>
            <Text style={message.role === 'user' ? styles.userText : styles.coachText}>{message.text}</Text>
          </View>
        ))}
        {busy && <View style={[styles.bubble, styles.coachBubble, styles.loadingBubble]}><ActivityIndicator size="small" color={theme.colors.primary} /><Text style={styles.coachText}>Thinking…</Text></View>}
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
        <TouchableOpacity style={[styles.sendButton, (!input.trim() || busy) && styles.sendDisabled]} onPress={() => send(input)} disabled={!input.trim() || busy} accessibilityLabel={t('Send')}>
          {busy ? <ActivityIndicator size="small" color={theme.colors.textInverted} /> : <Send size={17} color={theme.colors.textInverted} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.md, paddingBottom: 108 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon: { width: 42, height: 42, borderRadius: 15, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontFamily: theme.fonts.serif, fontSize: 24, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
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
  input: { flex: 1, maxHeight: 100, paddingHorizontal: 9, paddingVertical: 8, fontSize: 14, color: theme.colors.textPrimary },
  sendButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  sendDisabled: { opacity: 0.5 },
});
