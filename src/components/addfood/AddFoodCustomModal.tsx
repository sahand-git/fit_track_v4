import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { X, Check, AlertTriangle } from 'lucide-react-native';
import { AppLanguage } from '../../types';
import { theme } from '../../theme';

export interface AddFoodCustomModalProps {
  visible: boolean;
  onClose: () => void;
  customName: string;
  setCustomName: (val: string) => void;
  customServing: string;
  setCustomServing: (val: string) => void;
  customCalories: string;
  setCustomCalories: (val: string) => void;
  customProtein: string;
  setCustomProtein: (val: string) => void;
  customCarbs: string;
  setCustomCarbs: (val: string) => void;
  customFat: string;
  setCustomFat: (val: string) => void;
  customError: string | null;
  onSave: () => void;
  language: AppLanguage;
  t: (key: string) => string;
}

export const AddFoodCustomModal: React.FC<AddFoodCustomModalProps> = ({
  visible,
  onClose,
  customName,
  setCustomName,
  customServing,
  setCustomServing,
  customCalories,
  setCustomCalories,
  customProtein,
  setCustomProtein,
  customCarbs,
  setCustomCarbs,
  customFat,
  setCustomFat,
  customError,
  onSave,
  language,
  t,
}) => {
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', alignItems: 'center' }}
        >
          <View style={styles.customModalCard}>
            <View style={styles.customModalHeader}>
              <Text style={styles.customModalTitle}>{t('Create custom food')}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {customError && (
              <View style={styles.errorNotice}>
                <AlertTriangle size={15} color={theme.colors.danger} />
                <Text style={styles.errorNoticeText}>{customError}</Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>{t('Food name')}</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder={t('Food name')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </View>

              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>
                  {t('Serving description (e.g. 1 bowl, 100g)')}
                </Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder={t('Serving description (e.g. 1 bowl, 100g)')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={customServing}
                  onChangeText={setCustomServing}
                />
              </View>

              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>{t('Calories (kcal)')}</Text>
                <TextInput
                  style={styles.customTextInput}
                  placeholder="250"
                  placeholderTextColor={theme.colors.textMuted}
                  value={customCalories}
                  onChangeText={setCustomCalories}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.macrosRowInputs}>
                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Protein (g)')}</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={customProtein}
                    onChangeText={setCustomProtein}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Carbs (g)')}</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.customInputGroup, { flex: 1 }]}>
                  <Text style={styles.customInputLabel}>{t('Fat (g)')}</Text>
                  <TextInput
                    style={styles.customTextInput}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={customFat}
                    onChangeText={setCustomFat}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveCustomBtn}
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel={t('Save custom food')}
            >
              <Check size={16} color={theme.colors.textInverted} />
              <Text style={styles.saveCustomBtnText}>{t('Save custom food')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
