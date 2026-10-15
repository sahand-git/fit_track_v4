import React, { useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  BackHandler,
} from 'react-native';
import { AppText as Text } from './AppText';
import {
  BookOpen,
  ShieldCheck,
  X,
  Utensils,
  Dumbbell,
  Calculator,
  Footprints,
  Pill,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

interface ScientificReferencesModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenDisclaimer?: () => void;
}

export const ScientificReferencesModal: React.FC<ScientificReferencesModalProps> = ({
  visible,
  onClose,
  onOpenDisclaimer,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);
  const isRTL = language === 'ar' || language === 'ckb';

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalCard, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <BookOpen size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.headerTitleContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{t('Scientific References')}</Text>
                  <View style={styles.evidenceBadge}>
                    <ShieldCheck size={12} color={theme.colors.primary} />
                    <Text style={styles.evidenceBadgeText}>{t('Evidence-Based')}</Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>
                  {t('Formulas, clinical standards, and food databases used in FitTrack')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Body */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Section 1: Food & Nutrition Data */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Utensils size={18} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('1. Food & Nutritional Database Sources')}
                </Text>
              </View>
              <Text style={styles.sectionDescription}>
                {t('Food logs and barcode scans rely on validated public nutritional repositories. Custom entries and AI meal plate scans are practical estimates, not clinical laboratory assays:')}
              </Text>

              <View style={styles.referenceItem}>
                <CheckCircle2 size={16} color={theme.colors.primary} style={styles.checkIcon} />
                <View style={styles.referenceItemContent}>
                  <Text style={styles.referenceItemTitle}>
                    {t('Open Food Facts Global Database')}
                  </Text>
                  <Text style={styles.referenceItemDesc}>
                    {t('Barcode lookups query Open Food Facts API v2. Provides Nutri-Score, NOVA food processing classifications, and manufacturer package nutrition panels.')}
                  </Text>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <CheckCircle2 size={16} color={theme.colors.primary} style={styles.checkIcon} />
                <View style={styles.referenceItemContent}>
                  <Text style={styles.referenceItemTitle}>
                    {t('USDA FoodData Central (Standard Reference Legacy)')}
                  </Text>
                  <Text style={styles.referenceItemDesc}>
                    {t('United States Department of Agriculture. Standardized macro and micronutrient density per 100g for whole foods, meats, grains, fruits, and raw produce.')}
                  </Text>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <CheckCircle2 size={16} color={theme.colors.primary} style={styles.checkIcon} />
                <View style={styles.referenceItemContent}>
                  <Text style={styles.referenceItemTitle}>
                    {t('Food Moisture States (Raw vs. Cooked)')}
                  </Text>
                  <Text style={styles.referenceItemDesc}>
                    {t('Nutrient density changes during cooking due to water evaporation or oil absorption (e.g. 100g raw chicken breast yields ~75g cooked with higher protein density).')}
                  </Text>
                </View>
              </View>

              <View style={styles.referenceItem}>
                <CheckCircle2 size={16} color={theme.colors.primary} style={styles.checkIcon} />
                <View style={styles.referenceItemContent}>
                  <Text style={styles.referenceItemTitle}>
                    {t('Gemini AI Nutrition & Plate Parser')}
                  </Text>
                  <Text style={styles.referenceItemDesc}>
                    {t('Decomposes natural language meal descriptions and photos into ingredient estimates mapped to USDA reference nutrient profiles for logging convenience.')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Section 2: Workout Calorie & MET Calculations */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Dumbbell size={18} color={theme.colors.warning} />
                <Text style={styles.sectionTitle}>
                  {t('2. Workout Energy & MET Calculations')}
                </Text>
              </View>
              <Text style={styles.sectionDescription}>
                {t('Exercise calorie expenditure uses the 2024 Adult Compendium of Physical Activities (Ainsworth BE et al., Medicine & Science in Sports & Exercise):')}
              </Text>
              <View style={styles.formulaBox}>
                <Text style={styles.formulaTitle}>
                  {t('Standard Metabolic Equivalent Equation (MET):')}
                </Text>
                <Text style={styles.formulaCode}>
                  {t('Calories Burned (kcal) = (MET × 3.5 × Weight in kg ÷ 200) × Duration in min')}
                </Text>
                <Text style={styles.formulaExplanation}>
                  {t('1 MET = resting oxygen consumption (3.5 ml O₂ · kg⁻¹ · min⁻¹). Net exercise burn subtracts resting metabolic baseline during the workout.')}
                </Text>
              </View>
            </View>

            {/* Section 3: BMR & TDEE Basal Metabolic Equations */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Calculator size={18} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('3. BMR & TDEE Equations')}
                </Text>
              </View>
              <Text style={styles.sectionDescription}>
                {t('Basal Metabolic Rate is calculated using the Mifflin-St Jeor Equation (1990), validated by the Academy of Nutrition and Dietetics as the most accurate clinical formula:')}
              </Text>
              <View style={styles.formulaBox}>
                <Text style={styles.formulaCode}>
                  {t('Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5')}
                </Text>
                <Text style={styles.formulaCode}>
                  {t('Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161')}
                </Text>
                <Text style={styles.formulaExplanation}>
                  {t('TDEE = BMR × Physical Activity Factor (Sedentary: 1.2, Light: 1.375, Moderate: 1.55, Heavy: 1.725, Athlete: 1.9).')}
                </Text>
              </View>
            </View>

            {/* Section 4: Step-to-Calorie Formula */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Footprints size={18} color={theme.colors.water} />
                <Text style={styles.sectionTitle}>
                  {t('4. Pedometer & Step Caloric Expenditure')}
                </Text>
              </View>
              <Text style={styles.sectionDescription}>
                {t('Step energy consumption is modeled using American College of Sports Medicine (ACSM) and Harvard Health caloric stride standards:')}
              </Text>
              <View style={styles.formulaBox}>
                <Text style={styles.formulaCode}>
                  {t('Step Calories (kcal) = Steps × 0.042 × (User Weight in kg ÷ 70)')}
                </Text>
                <Text style={styles.formulaExplanation}>
                  {t('Deduplication prevents double-counting by subtracting steps taken during logged ambulatory workouts (runs, walks, treadmill).')}
                </Text>
              </View>
            </View>

            {/* Section 5: Macronutrient Distribution Targets */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <ShieldCheck size={18} color={theme.colors.macroProtein} />
                <Text style={styles.sectionTitle}>
                  {t('5. Macronutrient Distribution Targets')}
                </Text>
              </View>
              <Text style={styles.sectionDescription}>
                {t('Daily protein targets (1.6g – 2.2g per kg bodyweight) adhere to the International Society of Sports Nutrition (ISSN) Position Stand (Jäger et al., 2017) to support muscle protein synthesis and lean mass preservation during calorie deficits.')}
              </Text>
            </View>

            {/* Section 6: Micronutrient RDA & Supplement Safety */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Pill size={18} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('6. Micronutrient RDA & Supplement Safety')}
                </Text>
              </View>
              <Text style={styles.sectionDescription}>
                {t('Vitamin and mineral Recommended Dietary Allowances (RDA) and Tolerable Upper Intake Levels (UL) are referenced from the National Institutes of Health (NIH) Office of Dietary Supplements and the Institute of Medicine (IOM) Dietary Reference Intakes.')}
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {onOpenDisclaimer && (
              <TouchableOpacity
                style={styles.disclaimerLinkBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onOpenDisclaimer();
                }}
                activeOpacity={0.8}
              >
                <ShieldAlert size={16} color={theme.colors.danger} />
                <Text style={styles.disclaimerLinkText}>{t('Medical Disclaimer')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeActionBtn}
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('Close Reference Sheet')}
            >
              <Text style={styles.closeActionBtnText}>{t('Close Reference Sheet')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadow.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
  },
  evidenceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },
  checkIcon: {
    marginTop: 2,
  },
  referenceItemContent: {
    flex: 1,
  },
  referenceItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  referenceItemDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  formulaBox: {
    backgroundColor: '#0F172A',
    borderRadius: theme.radius.md,
    padding: 12,
    gap: 6,
  },
  formulaTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  formulaCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#34D399',
    lineHeight: 16,
  },
  formulaExplanation: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  disclaimerLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  disclaimerLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  closeActionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  closeActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
});
