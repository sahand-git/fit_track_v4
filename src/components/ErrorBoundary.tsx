import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { AppText as Text } from './AppText';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react-native';
import { theme } from '../theme';
import { I18nContext } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { recordCrash } from '../services/crashReportingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FitTrack ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
    // Record scrubbed crash diagnostic only if user gave explicit consent
    recordCrash(error, errorInfo).catch(() => {});
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <I18nContext.Consumer>
          {(language) => {
            const t = (key: string) => translate(language, key);
            return (
              <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.container}>
                  <View style={styles.iconCircle}>
                    <AlertTriangle size={36} color={theme.colors.warning} />
                  </View>

                  <Text style={styles.title}>{t('Something went wrong')}</Text>
                  <Text style={styles.subtitle}>
                    {t('FitTrack encountered an unexpected issue, but your saved data and meals are safe.')}
                  </Text>

                  <TouchableOpacity
                    style={styles.reloadBtn}
                    onPress={this.handleReload}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('Reload application')}
                  >
                    <RefreshCw size={18} color={theme.colors.textInverted} style={{ marginRight: 8 }} />
                    <Text style={styles.reloadBtnText}>{t('Try Again')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailsToggle}
                    onPress={this.toggleDetails}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailsToggleText}>
                      {this.state.showDetails ? t('Hide error details') : t('Show error details')}
                    </Text>
                    {this.state.showDetails ? (
                      <ChevronUp size={16} color={theme.colors.textMuted} />
                    ) : (
                      <ChevronDown size={16} color={theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {this.state.showDetails && (
                    <View style={styles.detailsBox}>
                      <Text style={styles.errorText}>
                        {__DEV__
                          ? (this.state.error?.toString() || t('Unknown error'))
                          : t('An unexpected application error occurred. Details have been logged securely.')}
                      </Text>
                      {__DEV__ && this.state.errorInfo?.componentStack && (
                        <Text style={styles.stackText}>
                          {this.state.errorInfo.componentStack.slice(0, 1000)}
                        </Text>
                      )}
                    </View>
                  )}
                </ScrollView>
              </SafeAreaView>
            );
          }}
        </I18nContext.Consumer>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.subtle,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 320,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    ...theme.shadow.subtle,
    marginBottom: 20,
  },
  reloadBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textInverted,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  detailsToggleText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  detailsBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
    maxHeight: 240,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 6,
  },
  stackText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
