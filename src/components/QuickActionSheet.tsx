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
  Barcode,
  Camera,
  Search,
  Droplet,
  Dumbbell,
  Footprints,
  Pill,
  Scale,
  X,
  Sparkles,
} from 'lucide-react-native';
import { MealType } from '../types';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import * as Haptics from 'expo-haptics';

export interface QuickActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpenBarcodeScanner: (meal?: MealType) => void;
  onOpenPlateScanner: (meal?: MealType) => void;
  onOpenFoodLog: (meal?: MealType) => void;
  onQuickWater: (glasses?: number) => void;
  onOpenAddWorkout: () => void;
  onOpenStepTracker: () => void;
  onOpenSupplements?: () => void;
  onOpenLogWeight?: () => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  visible,
  onClose,
  onOpenBarcodeScanner,
  onOpenPlateScanner,
  onOpenFoodLog,
  onQuickWater,
  onOpenAddWorkout,
  onOpenStepTracker,
  onOpenSupplements,
  onOpenLogWeight,
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

  const handleAction = (callback: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
    // Allow sheet exit animation to settle before launching target modal
    setTimeout(() => {
      callback();
    }, 120);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheetCard, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{t('Quick Add')}</Text>
                <View style={styles.badge}>
                  <Sparkles size={11} color={theme.colors.warning} />
                  <Text style={styles.badgeText}>{t('Quick Presets')}</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                {t('1-tap shortcut for food, hydration & exercise')}
              </Text>
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

          {/* Grid of Actions */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Barcode Scanner */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction(() => onOpenBarcodeScanner())}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Scan Barcode')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
                <Barcode size={22} color="#EA580C" />
              </View>
              <Text style={styles.actionTitle}>{t('Scan Barcode')}</Text>
              <Text style={styles.actionSubtitle}>{t('UPC / EAN')}</Text>
            </TouchableOpacity>

            {/* 2. AI Plate Scanner */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction(() => onOpenPlateScanner())}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('AI Plate Scanner')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                <Camera size={22} color="#16A34A" />
              </View>
              <Text style={styles.actionTitle}>{t('AI Plate Scanner')}</Text>
              <Text style={styles.actionSubtitle}>{t('Gemini Vision')}</Text>
            </TouchableOpacity>

            {/* 3. Search Food Database */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction(() => onOpenFoodLog())}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Search Food')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <Search size={22} color="#2563EB" />
              </View>
              <Text style={styles.actionTitle}>{t('Search Food')}</Text>
              <Text style={styles.actionSubtitle}>{t('Database')}</Text>
            </TouchableOpacity>

            {/* 4. Quick Water (+1 Glass) */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction(() => onQuickWater(1))}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Quick Add Water')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#ECFEFF' }]}>
                <Droplet size={22} color="#0891B2" fill="#0891B2" />
              </View>
              <Text style={styles.actionTitle}>{t('Quick Add Water')}</Text>
              <Text style={styles.actionSubtitle}>{t('+250 ml (1 glass)')}</Text>
            </TouchableOpacity>

            {/* 5. Log Workout */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction(() => onOpenAddWorkout())}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Log Workout')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FFF1F2' }]}>
                <Dumbbell size={22} color="#E11D48" />
              </View>
              <Text style={styles.actionTitle}>{t('Log Workout')}</Text>
              <Text style={styles.actionSubtitle}>{t('Cardio & Strength')}</Text>
            </TouchableOpacity>

            {/* 6. Step Tracker */}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleAction(() => onOpenStepTracker())}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Step Tracker')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <Footprints size={22} color="#D97706" />
              </View>
              <Text style={styles.actionTitle}>{t('Step Tracker')}</Text>
              <Text style={styles.actionSubtitle}>{t('Pedometer & Activity')}</Text>
            </TouchableOpacity>

            {/* 7. Check Supplements / Routine */}
            {onOpenSupplements && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => handleAction(() => onOpenSupplements())}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('Daily Routine')}
              >
                <View style={[styles.iconBox, { backgroundColor: '#F5F3FF' }]}>
                  <Pill size={22} color="#7C3AED" />
                </View>
                <Text style={styles.actionTitle}>{t('Daily Routine')}</Text>
                <Text style={styles.actionSubtitle}>{t('Vitamins & Supplements')}</Text>
              </TouchableOpacity>
            )}

            {/* 8. Log Weight */}
            {onOpenLogWeight && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => handleAction(() => onOpenLogWeight())}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('Log Weight')}
              >
                <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                  <Scale size={22} color="#475569" />
                </View>
                <Text style={styles.actionTitle}>{t('Log Weight')}</Text>
                <Text style={styles.actionSubtitle}>{t('Progress & History')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    maxHeight: '80%',
    ...theme.shadow.floating,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
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
  scrollArea: {
    flexGrow: 0,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...theme.shadow.subtle,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
