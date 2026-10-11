import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Bot, ChevronRight, Globe2, Pill, UserRound } from 'lucide-react-native';
import { AppLanguage } from '../types';
import { AppText as Text } from '../components/AppText';
import { useLanguage } from '../i18n/I18nContext';
import { languageNames, translate } from '../i18n/strings';
import { theme } from '../theme';

interface ToolsScreenProps {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  onOpenVitamins: () => void;
  onOpenCoach: () => void;
  onOpenProfile: () => void;
}

export function ToolsScreen({ language, onLanguageChange, onOpenVitamins, onOpenCoach, onOpenProfile }: ToolsScreenProps) {
  const currentLanguage = useLanguage();
  const t = (value: string) => translate(currentLanguage, value);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More features</Text>
      <TouchableOpacity style={styles.featureCard} onPress={onOpenVitamins} accessibilityRole="button">
        <View style={styles.featureIcon}><Pill size={20} color={theme.colors.primary} /></View>
        <View style={styles.featureCopy}><Text style={styles.featureTitle}>Vitamins & supplements</Text><Text style={styles.featureSub}>Personal routine tracking</Text></View>
        <ChevronRight size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.featureCard} onPress={onOpenCoach} accessibilityRole="button">
        <View style={[styles.featureIcon, styles.coachIcon]}><Bot size={20} color={theme.colors.accent} /></View>
        <View style={styles.featureCopy}><Text style={styles.featureTitle}>AI coach</Text><Text style={styles.featureSub}>Ask about your meals and goals</Text></View>
        <ChevronRight size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.featureCard} onPress={onOpenProfile} accessibilityRole="button">
        <View style={[styles.featureIcon, styles.profileIcon]}><UserRound size={20} color={theme.colors.secondary} /></View>
        <View style={styles.featureCopy}><Text style={styles.featureTitle}>Profile & Goals</Text><Text style={styles.featureSub}>Your personal targets and AI settings</Text></View>
        <ChevronRight size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.languageCard}>
        <View style={styles.languageHeader}><Globe2 size={18} color={theme.colors.secondary} /><Text style={styles.languageTitle}>Language</Text></View>
        <View style={styles.languageOptions}>
          {(['en', 'ar', 'ckb'] as AppLanguage[]).map(option => (
            <TouchableOpacity key={option} onPress={() => onLanguageChange(option)} style={[styles.languageOption, language === option && styles.languageOptionActive]} accessibilityRole="button" accessibilityState={{ selected: language === option }}>
              <Text style={[styles.languageOptionText, language === option && styles.languageOptionTextActive]}>{languageNames[option]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.restartNote}>Language updates immediately. Arabic and Sorani use a right-to-left layout.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 112, gap: 12 },
  title: { fontFamily: theme.fonts.serif, fontSize: 28, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 3 },
  featureCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, ...theme.shadow.subtle },
  featureIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
  coachIcon: { backgroundColor: theme.colors.accentLight },
  profileIcon: { backgroundColor: theme.colors.secondaryLight },
  featureCopy: { flex: 1, gap: 3 },
  featureTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
  featureSub: { color: theme.colors.textMuted, fontSize: 12 },
  languageCard: { padding: 14, marginTop: 4, gap: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  languageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  languageTitle: { color: theme.colors.textPrimary, fontFamily: theme.fonts.serif, fontSize: 17, fontWeight: '700' },
  languageOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  languageOption: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  languageOptionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  languageOptionText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  languageOptionTextActive: { color: theme.colors.primary },
  restartNote: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
});
