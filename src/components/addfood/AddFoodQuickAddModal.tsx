import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { X, Check, Zap, AlertTriangle } from 'lucide-react-native';
import { MealType, AppLanguage } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getKeyboardVerticalOffset } from '../../utils/keyboardAvoidance';

export interface AddFoodQuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMeal: MealType;
  quickAddName: string;
  setQuickAddName: (val: string) => void;
  quickAddCalories: string;
  setQuickAddCalories: (val: string) => void;
  quickAddProtein: string;
  setQuickAddProtein: (val: string) => void;
  quickAddCarbs: string;
  setQuickAddCarbs: (val: string) => void;
  quickAddFat: string;
  setQuickAddFat: (val: string) => void;
  quickAddError: string | null;
  onSave: () => void;
  language: AppLanguage;
  t: (key: string) => string;
}

export const AddFoodQuickAddModal: React.FC<AddFoodQuickAddModalProps> = ({
  visible,
  onClose,
  selectedMeal,
  quickAddName,
  setQuickAddName,
  quickAddCalories,
  setQuickAddCalories,
  quickAddProtein,
  setQuickAddProtein,
  quickAddCarbs,
  setQuickAddCarbs,
  quickAddFat,
  setQuickAddFat,
  quickAddError,
  onSave,
  language,
  t,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.customModalBackdrop,
          { direction: language === 'en' ? 'ltr' : 'rtl' },
        ]}
      >
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={getKeyboardVerticalOffset(insets.top)}
          style={{ width: '100%', alignItems: 'center' }}
        >
          <View style={styles.customModalCard}>
            <View style={styles.customModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Zap size={18} color={theme.colors.primary} />
                <Text style={styles.customModalTitle}>{t('Quick Add Calories')}</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {quickAddError && (
              <View style={styles.errorNotice}>
                <AlertTriangle size={15} color={theme.colors.danger} />
                <Text style={styles.errorNoticeText}>{quickAddError}</Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>
                  {t('Food name')} ({t('Optional')})
                </Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder={`${t('Quick Add')} (${t(
                    selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)
                  )})`}
                  placeholderTextColor={theme.colors.textMuted}
                  value={quickAddName}
                  onChangeText={setQuickAddName}
                />
              </View>

              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>{t('Calories')} *</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder="e.g. 450"
                  placeholderTextColor={theme.colors.textMuted}
                  value={quickAddCalories}
                  onChangeText={setQuickAddCalories}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <View style={styles.macrosRowInputs}>
                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Protein')} (g)</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={quickAddProtein}
                    onChangeText={setQuickAddProtein}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Carbs')} (g)</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={quickAddCarbs}
                    onChangeText={setQuickAddCarbs}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Fat')} (g)</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={quickAddFat}
                    onChangeText={setQuickAddFat}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveCustomBtn}
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel={t('Log Calories')}
            >
              <Check size={16} color={theme.colors.textInverted} />
              <Text style={styles.saveCustomBtnText}>{t('Log Calories')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ThemeType) => StyleSheet.create({
  customModalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  customModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    gap: 14,
    ...theme.shadow.subtle,
  },
  customModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.dangerLight,
    padding: 10,
    borderRadius: theme.radius.sm,
    gap: 8,
  },
  errorNoticeText: {
    fontSize: 12,
    color: theme.colors.danger,
    flex: 1,
  },
  customInputGroup: {
    marginBottom: 12,
    gap: 4,
  },
  customInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  customTextInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  macrosRowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  saveCustomBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    gap: 8,
    marginTop: 6,
  },
  saveCustomBtnText: {
    color: theme.colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
});
