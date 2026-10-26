import React, { useMemo } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { AppText as Text } from '../AppText';
import { Trash2 } from 'lucide-react-native';
import { LoggedDailySupplement, AppLanguage } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';

export interface SupplementDeleteModalProps {
  item: LoggedDailySupplement | null;
  isInRoutine: boolean;
  onDeleteDayOnly: () => void;
  onDeleteRoutineToo: () => void;
  onCancel: () => void;
  language: AppLanguage;
  t: (key: string) => string;
}

export const SupplementDeleteModal: React.FC<SupplementDeleteModalProps> = ({
  item,
  isInRoutine,
  onDeleteDayOnly,
  onDeleteRoutineToo,
  onCancel,
  language,
  t,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Modal
      visible={Boolean(item)}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={[
          styles.deleteModalBackdrop,
          { direction: language === 'en' ? 'ltr' : 'rtl' },
        ]}
      >
        <View style={styles.deleteModalCard}>
          <View style={styles.deleteModalIconBox}>
            <Trash2 size={24} color={theme.colors.danger} />
          </View>

          <Text style={styles.deleteModalTitle}>{t('Delete supplement')}</Text>

          <Text style={styles.deleteModalMsg}>
            {t('Are you sure you want to delete this supplement?')}
            {item ? `\n"${item.name}"` : ''}
          </Text>

          <View style={styles.deleteModalBtnGroup}>
            {isInRoutine ? (
              <>
                <TouchableOpacity
                  style={[styles.deleteModalBtn, styles.deleteModalBtnSecondary]}
                  onPress={onDeleteDayOnly}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('Remove from this day')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteModalBtnSecondaryText}>
                    {t('Remove from this day')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deleteModalBtn, styles.deleteModalBtnDanger]}
                  onPress={onDeleteRoutineToo}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('Remove from routine too')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteModalBtnDangerText}>
                    {t('Remove from routine too')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.deleteModalBtn, styles.deleteModalBtnDanger]}
                onPress={onDeleteDayOnly}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('Delete')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.deleteModalBtnDangerText}>{t('Delete')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.deleteModalBtn, styles.deleteModalBtnCancel]}
              onPress={onCancel}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Cancel')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteModalBtnCancelText}>{t('Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  deleteModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    ...theme.shadow.floating,
  },
  deleteModalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalMsg: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteModalBtnGroup: {
    width: '100%',
    gap: 8,
  },
  deleteModalBtn: {
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalBtnSecondary: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteModalBtnSecondaryText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteModalBtnDanger: {
    backgroundColor: theme.colors.danger,
  },
  deleteModalBtnDangerText: {
    color: theme.colors.textInverted,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteModalBtnCancel: {
    backgroundColor: 'transparent',
  },
  deleteModalBtnCancelText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
