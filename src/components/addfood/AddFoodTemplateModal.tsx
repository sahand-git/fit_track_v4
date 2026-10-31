import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { X, Check, Bookmark, AlertTriangle } from 'lucide-react-native';
import { MealType, LoggedMeal, AppLanguage } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getKeyboardVerticalOffset } from '../../utils/keyboardAvoidance';

export interface AddFoodTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMeal: MealType;
  currentDayMeals: LoggedMeal[];
  templateName: string;
  setTemplateName: (val: string) => void;
  templateError: string | null;
  templateSaving: boolean;
  onSave: () => void;
  language: AppLanguage;
  t: (key: string) => string;
}

export const AddFoodTemplateModal: React.FC<AddFoodTemplateModalProps> = ({
  visible,
  onClose,
  selectedMeal,
  currentDayMeals,
  templateName,
  setTemplateName,
  templateError,
  templateSaving,
  onSave,
  language,
  t,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const currentSlotMeals = currentDayMeals.filter((m) => m.mealType === selectedMeal);

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
                <Bookmark size={17} color={theme.colors.primary} />
                <Text style={styles.customModalTitle}>{t('Save as template')}</Text>
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

            {templateError && (
              <View style={styles.errorNotice}>
                <AlertTriangle size={15} color={theme.colors.danger} />
                <Text style={styles.errorNoticeText}>{templateError}</Text>
              </View>
            )}

            <Text style={styles.templateModalDescription}>
              {`${t('Save current')} ${t(
                selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)
              )} (${currentSlotMeals.length} ${t(
                'items'
              )}) ${t('as a reusable template to log again in one tap.')}`}
            </Text>

            <View style={styles.customInputGroup}>
              <Text style={styles.customInputLabel}>{t('Template name')}</Text>
              <TextInput
                style={styles.customTextInput}
                placeholder={t('e.g. My Usual Breakfast, Friday BBQ')}
                placeholderTextColor={theme.colors.textMuted}
                value={templateName}
                onChangeText={setTemplateName}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.saveCustomBtn}
              onPress={onSave}
              disabled={templateSaving}
              accessibilityRole="button"
              accessibilityLabel={t('Save template')}
            >
              {templateSaving ? (
                <ActivityIndicator size="small" color={theme.colors.textInverted} />
              ) : (
                <>
                  <Check size={16} color={theme.colors.textInverted} />
                  <Text style={styles.saveCustomBtnText}>{t('Save template')}</Text>
                </>
              )}
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
  templateModalDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
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
