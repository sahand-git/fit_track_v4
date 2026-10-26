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
  ShieldAlert,
  HeartPulse,
  Stethoscope,
  AlertTriangle,
  Calculator,
  BookOpen,
  Check,
  X,
} from 'lucide-react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import { useIsRTL } from '../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';

interface MedicalDisclaimerModalProps {
  visible: boolean;
  onAccept: () => void;
  onClose?: () => void;
  isFirstRun?: boolean;
  onOpenReferences?: () => void;
}

export const MedicalDisclaimerModal: React.FC<MedicalDisclaimerModalProps> = ({
  visible,
  onAccept,
  onClose,
  isFirstRun = false,
  onOpenReferences,
}) => {
  const language = useLanguage();
  const t = (str: string) => translate(language, str);
  const isRTL = useIsRTL();

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;
    const onBackPress = () => {
      if (!isFirstRun && onClose) {
        onClose();
        return true;
      }
      // On first run, user must accept or exit app
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, isFirstRun, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!isFirstRun && onClose) onClose();
      }}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            if (!isFirstRun && onClose) onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
        />
        <View style={[styles.modalCard, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <ShieldAlert size={22} color={theme.colors.danger} />
              </View>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.title}>{t('Medical & Health Disclaimer')}</Text>
                <Text style={styles.subtitle}>
                  {t('Important wellness guidance & emergency safety protocols')}
                </Text>
              </View>
            </View>
            {!isFirstRun && onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Notice Callout */}
            <View style={styles.warningCallout}>
              <AlertTriangle size={18} color={theme.colors.danger} style={styles.warningIcon} />
              <Text style={styles.warningCalloutText}>
                {t('FitTrack is designed strictly for educational and wellness tracking purposes. It does not provide medical diagnosis, treatment, or therapy.')}
              </Text>
            </View>

            {/* Section 1: Not Medical Advice */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Stethoscope size={18} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>{t('1. Not a Substitute for Medical Care')}</Text>
              </View>
              <Text style={styles.sectionBody}>
                {t('FitTrack and its AI features are informational tools for tracking daily nutrition, hydration, and physical activity. Nothing contained in this application constitutes medical advice, nor does using FitTrack establish a doctor-patient relationship.')}
              </Text>
            </View>

            {/* Section 2: Healthcare Professional Consultation */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <HeartPulse size={18} color={theme.colors.danger} />
                <Text style={styles.sectionTitle}>
                  {t('2. Consult a Licensed Physician First')}
                </Text>
              </View>
              <Text style={styles.sectionBody}>
                {t('Always consult your physician, doctor, or a certified registered dietitian before starting any calorie restriction, aggressive weight loss, intermittent fasting, dietary supplement routine, or strenuous exercise regimen. This is especially vital if you have cardiovascular disease, diabetes, hypertension, kidney disease, are pregnant, or nursing.')}
              </Text>
            </View>

            {/* Section 3: Emergency Protocol */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <ShieldAlert size={18} color={theme.colors.danger} />
                <Text style={styles.sectionTitle}>
                  {t('3. Emergency Situations & Distress')}
                </Text>
              </View>
              <Text style={styles.sectionBody}>
                {t('If you experience chest pain, sudden shortness of breath, dizziness, faintness, heart palpitations, or severe discomfort while exercising or following a diet, stop immediately and contact your local emergency medical services. Never ignore acute bodily symptoms.')}
              </Text>
            </View>

            {/* Section 4: Nutritional & Algorithmic Estimates */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Calculator size={18} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('4. Nutritional & Caloric Approximations')}
                </Text>
              </View>
              <Text style={styles.sectionBody}>
                {t('Calorie budgets, macronutrient ratios, BMR/TDEE equations, barcode nutrition data, and AI meal scans are statistical approximations based on public scientific datasets (USDA, Open Food Facts). Real metabolic expenditure and food composition naturally vary.')}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {onOpenReferences && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onOpenReferences();
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('Scientific References')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <BookOpen size={16} color={theme.colors.primary} />
                <Text style={styles.secondaryBtnText}>{t('Scientific References')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                onAccept();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('I Understand & Agree')}
            >
              <Check size={18} color={theme.colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>
                {isFirstRun ? t('I Understand & Agree') : t('I Understand')}
              </Text>
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
    maxWidth: 580,
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
    backgroundColor: theme.colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
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
    gap: 12,
  },
  warningCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.dangerLight,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  warningIcon: {
    marginTop: 2,
  },
  warningCalloutText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  sectionBody: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
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
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    flex: 1,
    minWidth: 140,
    ...theme.shadow.subtle,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
