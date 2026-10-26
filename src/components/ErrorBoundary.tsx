import React, { Component, ErrorInfo, ReactNode, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText as Text } from './AppText';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { recordCrash, scrubCrashText, getAppVersion } from '../services/crashReportingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FitTrack ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
    // Record scrubbed crash diagnostic locally on device (never transmitted externally)
    recordCrash(error, errorInfo).catch(() => {});
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  handleCopyDetails = async () => {
    const errorName = scrubCrashText(this.state.error?.name || 'Error');
    const errorMessage = scrubCrashText(this.state.error?.message || this.state.error?.toString() || 'Unknown error');
    const rawStack = this.state.errorInfo?.componentStack || this.state.error?.stack || '';
    const scrubbedStack = scrubCrashText(rawStack);
    const stackLines = scrubbedStack
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 8)
      .join('\n');

    const appVer = getAppVersion();
    const payload = [
      `FitTrack Error Diagnostic (v${appVer})`,
      `Error: ${errorName}`,
      `Message: ${errorMessage}`,
      stackLines ? `\nComponent Stack (first 8 lines):\n${stackLines}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Clipboard.setStringAsync(payload);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryFallbackContent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          showDetails={this.state.showDetails}
          copied={this.state.copied}
          onReload={this.handleReload}
          onToggleDetails={this.toggleDetails}
          onCopyDetails={this.handleCopyDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
  onReload: () => void;
  onToggleDetails: () => void;
  onCopyDetails: () => void;
}

const ErrorBoundaryFallbackContent: React.FC<FallbackProps> = ({
  error,
  errorInfo,
  showDetails,
  copied,
  onReload,
  onToggleDetails,
  onCopyDetails,
}) => {
  const language = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (key: string) => translate(language, key);

  const errorName = scrubCrashText(error?.name || 'Error');
  const errorMessage = scrubCrashText(
    error?.message || error?.toString() || t('Unknown error')
  );
  const rawStack = errorInfo?.componentStack || error?.stack || '';
  const scrubbedStack = scrubCrashText(rawStack);
  const stackLines = scrubbedStack
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join('\n');

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
          onPress={onReload}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('Reload application')}
        >
          <RefreshCw size={18} color={theme.colors.textInverted} style={{ marginRight: 8 }} />
          <Text style={styles.reloadBtnText}>{t('Try Again')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailsToggle}
          onPress={onToggleDetails}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={showDetails ? t('Hide error details') : t('Show error details')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.detailsToggleText}>
            {showDetails ? t('Hide error details') : t('Show error details')}
          </Text>
          {showDetails ? (
            <ChevronUp size={16} color={theme.colors.textMuted} />
          ) : (
            <ChevronDown size={16} color={theme.colors.textMuted} />
          )}
        </TouchableOpacity>

        {showDetails && (
          <View style={styles.detailsBox}>
            <Text style={styles.errorText}>
              {errorName}: {errorMessage}
            </Text>
            {stackLines ? (
              <Text style={styles.stackText}>
                {stackLines}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={onCopyDetails}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={copied ? t('Copied!') : t('Copy error details')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {copied ? (
                <Check size={14} color={theme.colors.primary} />
              ) : (
                <Copy size={14} color={theme.colors.textMuted} />
              )}
              <Text style={styles.copyBtnText}>
                {copied ? t('Copied!') : t('Copy error details')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
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
    maxHeight: 280,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.danger,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 6,
  },
  stackText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
});
