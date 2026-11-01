import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Platform,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeType } from '../../theme';
import { useLanguage } from '../../i18n/I18nContext';
import { translate } from '../../i18n/strings';
import { useIsRTL } from '../../hooks/useIsRTL';
import * as Haptics from 'expo-haptics';
import {
  ConfirmDialogOptions,
  NotifyDialogOptions,
  AppDialogContextValue,
  DialogConfig,
  globalDialogManager,
  appDialog,
} from './appDialogCore';

export type {
  ConfirmDialogOptions,
  NotifyDialogOptions,
  AppDialogContextValue,
  DialogConfig,
};

export { appDialog };

const AppDialogContext = createContext<AppDialogContextValue>(appDialog);

export const useAppDialog = (): AppDialogContextValue => {
  return useContext(AppDialogContext);
};

export interface AppDialogProviderProps {
  children: React.ReactNode;
}

export const AppDialogProvider: React.FC<AppDialogProviderProps> = ({ children }) => {
  const { theme } = useTheme();
  const language = useLanguage();
  const isRTL = useIsRTL();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [currentDialog, setCurrentDialog] = useState<DialogConfig | null>(() =>
    globalDialogManager.getCurrentDialog()
  );

  useEffect(() => {
    const unsubscribe = globalDialogManager.subscribe((dialog) => {
      setCurrentDialog(dialog);
    });
    return unsubscribe;
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (!currentDialog) return;
    Haptics.impactAsync(
      currentDialog.type === 'confirm' && currentDialog.options.destructive
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});

    globalDialogManager.resolveCurrent(true);
  }, [currentDialog]);

  const handleCancelAction = useCallback(() => {
    if (!currentDialog) return;
    globalDialogManager.dismissCurrent();
  }, [currentDialog]);

  const handleNotifyDismiss = useCallback(() => {
    if (!currentDialog) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    globalDialogManager.resolveCurrent();
  }, [currentDialog]);

  // Hardware back button dismisses confirm as false, notify as ok
  useEffect(() => {
    if (!currentDialog) return;
    const onBack = () => {
      handleCancelAction();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [currentDialog, handleCancelAction]);

  const contextValue = useMemo<AppDialogContextValue>(
    () => ({
      confirm: (options) => globalDialogManager.confirm(options),
      notify: (options) => globalDialogManager.notify(options),
    }),
    []
  );

  const t = (k: string) => translate(language, k);
  const isVisible = Boolean(currentDialog);

  return (
    <AppDialogContext.Provider value={contextValue}>
      {children}
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelAction}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdropPressable}
            activeOpacity={1}
            onPress={handleCancelAction}
            accessibilityRole="button"
            accessibilityLabel={t('Cancel')}
          />
          {currentDialog && (
            <View
              style={[
                styles.dialogCard,
                { direction: isRTL ? 'rtl' : 'ltr' },
              ]}
              accessibilityRole="alert"
              accessibilityLabel={currentDialog.options.title}
            >
              <Text style={styles.title}>{currentDialog.options.title}</Text>
              {Boolean(currentDialog.options.message) && (
                <Text style={styles.message}>{currentDialog.options.message}</Text>
              )}

              {currentDialog.type === 'confirm' ? (
                <View style={[styles.buttonRow, isRTL && styles.buttonRowRTL]}>
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={handleCancelAction}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={currentDialog.options.cancelText || t('Cancel')}
                  >
                    <Text style={styles.cancelBtnText}>
                      {currentDialog.options.cancelText || t('Cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.btn,
                      currentDialog.options.destructive ? styles.destructiveBtn : styles.confirmBtn,
                    ]}
                    onPress={handleConfirmAction}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={currentDialog.options.confirmText || t('Confirm')}
                  >
                    <Text
                      style={[
                        styles.confirmBtnText,
                        currentDialog.options.destructive && styles.destructiveBtnText,
                      ]}
                    >
                      {currentDialog.options.confirmText || t('Confirm')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.singleButtonRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.confirmBtn, styles.fullWidthBtn]}
                    onPress={handleNotifyDismiss}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={currentDialog.options.buttonText || t('OK')}
                  >
                    <Text style={styles.confirmBtnText}>
                      {currentDialog.options.buttonText || t('OK')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </AppDialogContext.Provider>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.backdrop,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    backdropPressable: {
      ...StyleSheet.absoluteFill,
    },
    dialogCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
        },
        android: {
          elevation: 10,
        },
        web: {
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
        },
      }),
    },
    title: {
      fontFamily: theme.fonts.serif,
      fontSize: 19,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
    },
    buttonRowRTL: {
      flexDirection: 'row-reverse',
    },
    singleButtonRow: {
      width: '100%',
    },
    btn: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: theme.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    fullWidthBtn: {
      width: '100%',
    },
    cancelBtn: {
      backgroundColor: theme.colors.surfaceSubtle,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minWidth: 90,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    confirmBtn: {
      backgroundColor: theme.colors.primary,
      minWidth: 100,
    },
    confirmBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textInverted,
    },
    destructiveBtn: {
      backgroundColor: theme.colors.danger,
    },
    destructiveBtnText: {
      color: theme.colors.textInverted,
    },
  });
