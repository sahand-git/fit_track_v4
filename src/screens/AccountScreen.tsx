import React, { useState, useMemo } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, ChevronDown, ChevronUp, Cloud, Copy, ExternalLink, LogIn, LogOut, Mail, ShieldCheck, Trash2, Wrench } from 'lucide-react-native';
import { DirectionalIcon } from '../components/DirectionalIcon';
import * as Clipboard from 'expo-clipboard';
import { AppText as Text } from '../components/AppText';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AuthIdentity, formatAuthError, loginWithEmail, loginWithGoogle, logout, refreshVerificationStatus, registerWithEmail, requestPasswordReset, resendVerification } from '../services/authService';
import { AccountDiagnosticInfo, checkAccountSetup, formatAccountDiagnostics } from '../services/accountDiagnosticService';
import { createCloudBackup, deleteAccountAndBackup, getCloudBackupMetadata, restoreCloudBackup } from '../services/cloudBackupService';
import { copyGuestDataToAccount, getGuestDataSummary, isAccountEmpty } from '../services/accountSyncService';
import { firebaseConfigured } from '../services/firebaseApp';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { useTheme } from '../theme/ThemeContext';
import { ThemeType } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIREBASE_SETUP_GUIDE_URL, PRIVACY_POLICY_URL, SUPPORT_EMAIL } from '../constants/urls';

interface Props { user: AuthIdentity | null; onBack: () => void; onRestoreComplete: () => void; }

export const AccountScreen: React.FC<Props> = ({ user, onBack, onRestoreComplete }) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = (value: string) => translate(language, value);
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verificationOverride, setVerificationOverride] = useState<{ uid: string; verified: boolean } | null>(null);
  const [showSetupCheck, setShowSetupCheck] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AccountDiagnosticInfo | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);
  const emailVerified = user && verificationOverride?.uid === user.uid
    ? verificationOverride.verified
    : !!user?.emailVerified;

  const toggleSetupCheck = async () => {
    const next = !showSetupCheck;
    setShowSetupCheck(next);
    if (next && !diagnostics) {
      setDiagnosticsLoading(true);
      try {
        const info = await checkAccountSetup();
        setDiagnostics(info);
      } catch {
        // Silently handle
      } finally {
        setDiagnosticsLoading(false);
      }
    }
  };

  const copyDiagnostics = async () => {
    if (!diagnostics) return;
    try {
      await Clipboard.setStringAsync(formatAccountDiagnostics(diagnostics));
      setCopiedDiagnostics(true);
      setTimeout(() => setCopiedDiagnostics(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const perform = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setMessage('');
    try {
      await action();
      if (mountedRef.current) setMessage(t(success));
    } catch (cause) {
      if (mountedRef.current) setError(formatAuthError(cause, language));
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const checkGuestDataOffer = async (uid: string) => {
    try {
      const empty = await isAccountEmpty(uid);
      if (!empty) return;

      const guestSummary = await getGuestDataSummary();
      if (guestSummary.totalRecords > 0) {
        const parts: string[] = [];
        if (guestSummary.mealsCount > 0) parts.push(`${guestSummary.mealsCount} ${t('meals')}`);
        if (guestSummary.workoutsCount > 0) parts.push(`${guestSummary.workoutsCount} ${t('workouts')}`);
        if (guestSummary.weightsCount > 0) parts.push(`${guestSummary.weightsCount} ${t('weight records')}`);

        const itemsStr = parts.join(', ');
        Alert.alert(
          t("Copy this device's data into your account?"),
          `${t('Found')} ${itemsStr} ${t("recorded on this device. Would you like to copy them into your account? Your guest data will remain safe.")}`,
          [
            { text: t('Start fresh'), style: 'cancel' },
            {
              text: t('Copy to account'),
              style: 'default',
              onPress: () => perform(async () => {
                await copyGuestDataToAccount(uid);
                onRestoreComplete();
              }, 'Device data copied to your account.'),
            },
          ]
        );
      }
    } catch (copyCheckErr) {
      console.warn('Could not check guest data for copy offer:', copyCheckErr);
    }
  };

  const handlePostSignInDataFlow = async (uid: string) => {
    try {
      const backupMeta = await getCloudBackupMetadata(uid);
      if (backupMeta?.exists) {
        const dateStr = backupMeta.exportedAt ? new Date(backupMeta.exportedAt).toLocaleDateString() : '';
        Alert.alert(
          t('Restore cloud backup?'),
          dateStr
            ? `${t('A cloud backup from')} ${dateStr} ${t('is available in your account. Would you like to restore it now?')}`
            : t('A cloud backup is available in your account. Would you like to restore it now?'),
          [
            {
              text: t('Skip'),
              style: 'cancel',
              onPress: () => {
                checkGuestDataOffer(uid);
              },
            },
            {
              text: t('Restore'),
              style: 'default',
              onPress: () => perform(async () => {
                await restoreCloudBackup(uid);
                onRestoreComplete();
              }, 'Cloud backup restored'),
            },
          ]
        );
        return;
      }
    } catch (backupCheckErr) {
      console.warn('Could not check cloud backup metadata:', backupCheckErr);
    }

    await checkGuestDataOffer(uid);
  };

  const signIn = () => perform(async () => {
    if (mode === 'create') {
      await registerWithEmail(email, password);
    } else {
      const loggedUser = await loginWithEmail(email, password);
      if (loggedUser?.uid) {
        setTimeout(() => handlePostSignInDataFlow(loggedUser.uid), 400);
      }
    }
  }, mode === 'create' ? 'Account created. Check your email to verify it.' : 'Signed in successfully.');

  const googleSignIn = () => perform(async () => {
    const loggedUser = await loginWithGoogle();
    if (loggedUser?.uid) {
      setTimeout(() => handlePostSignInDataFlow(loggedUser.uid), 400);
    }
  }, 'Signed in successfully.');
  const openSetupGuide = async () => {
    try {
      await Linking.openURL(FIREBASE_SETUP_GUIDE_URL);
    } catch {
      setError(t('Could not open Firebase setup guide.'));
    }
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(
        t('Privacy Policy'),
        t('FitTrack operates offline-first. Your nutrition, workout, and biometric data stays strictly on your device unless you explicitly opt in to Firebase Cloud Backup or Gemini AI plate analysis.')
      );
    }
  };

  const cloudBackup = () => perform(async () => {
    if (!user) throw new Error(t('Sign in to use cloud backup.'));
    const result = await createCloudBackup(user.uid);
    setMessage(`${t('Cloud backup saved')}: ${new Date(result.exportedAt).toLocaleString()}`);
  }, 'Cloud backup saved');

  const restore = () => {
    if (!user) return;
    Alert.alert(t('Restore cloud backup?'), t('This replaces the fitness data stored on this device with the backup in your account. Export a local copy first if you need both.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Restore'), style: 'destructive', onPress: () => perform(async () => { await restoreCloudBackup(user.uid); onRestoreComplete(); }, 'Cloud backup restored') },
    ]);
  };

  const removeAccount = () => {
    if (!user) return;
    Alert.alert(t('Delete account and cloud backup?'), t('This permanently deletes your Firebase account and its cloud backup. Local records on this device remain available as guest data.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete account'), style: 'destructive', onPress: () => perform(async () => { await deleteAccountAndBackup(user.uid, password); setPassword(''); }, 'Account deleted') },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(145, insets.bottom + 90) }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back} accessibilityLabel={t('Back')} accessibilityRole="button"><DirectionalIcon name="ArrowLeft" size={19} color={theme.colors.textPrimary} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>{t('Account')}</Text><Text style={styles.title}>{t('Sign in & backup')}</Text></View>
        <ShieldCheck size={24} color={theme.colors.primary} />
      </View>

      {!firebaseConfigured && (
        <View style={styles.notice}>
          <Cloud size={22} color={theme.colors.secondary} />
          <Text style={styles.noticeTitle}>{t('Account services need setup')}</Text>
          <Text style={styles.body}>{t('Firebase is not configured yet. Guest mode and local data continue to work. Add your Firebase app values and publish the Firestore rules using docs/firebase-setup.md.')}</Text>
          <AnimatedPressable style={styles.outlineBtn} onPress={openSetupGuide} accessibilityRole="link" accessibilityLabel={t('Open Firebase setup guide')}>
            <ExternalLink size={16} color={theme.colors.primary} />
            <Text style={styles.outlineText}>{t('Open Firebase setup guide')}</Text>
          </AnimatedPressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('Support')}</Text>
        <TouchableOpacity style={styles.switchMode} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} accessibilityRole="link" accessibilityLabel={t('Contact support')}>
          <Text style={styles.outlineText}>{t('Contact support')} · {SUPPORT_EMAIL}</Text>
        </TouchableOpacity>
      </View>

      {user ? (
        <>
          <View style={styles.notice}>
            <View style={styles.emailIcon}><Mail size={18} color={theme.colors.primary} /></View>
            <Text style={styles.noticeTitle}>{user.displayName || user.email || t('Account')}</Text>
            <Text style={styles.body}>{emailVerified ? t('Verified account') : t('Email not verified yet. Cloud backup stays locked until verification.')}</Text>
            {!emailVerified && <>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => perform(resendVerification, 'Verification email sent.')}
                accessibilityRole="button"
                accessibilityLabel={t('Resend verification email')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.outlineText}>{t('Resend verification email')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => perform(async () => { const refreshed = await refreshVerificationStatus(); setVerificationOverride({ uid: user.uid, verified: !!refreshed?.emailVerified }); if (!refreshed?.emailVerified) throw new Error('Email not verified yet. Cloud backup stays locked until verification.'); }, 'Email verified. Cloud backup is ready.') }
                accessibilityRole="button"
                accessibilityLabel={t('Check verification status')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.outlineText}>{t('Check verification status')}</Text>
              </TouchableOpacity>
            </>}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('Cloud backup')}</Text>
            <Text style={styles.body}>{t('Backups are manual and account-owned. Gemini credentials are never included.')}</Text>
            <TouchableOpacity
              disabled={busy || !emailVerified}
              style={[styles.primaryBtn, (busy || !emailVerified) && styles.disabled]}
              onPress={cloudBackup}
              accessibilityRole="button"
              accessibilityLabel={t('Back up now')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Cloud size={17} color={theme.colors.textInverted} />
              <Text style={styles.primaryText}>{t('Back up now')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy || !emailVerified}
              style={[styles.outlineBtn, (busy || !emailVerified) && styles.disabled]}
              onPress={restore}
              accessibilityRole="button"
              accessibilityLabel={t('Restore cloud backup')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.outlineText}>{t('Restore cloud backup')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('Guest data on this device')}</Text>
            <Text style={styles.body}>{t('Signing in does not merge or upload previous guest records. To keep them, export a local backup before signing in, then import it after sign-in.')}</Text>
          </View>

          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={t('Current password, for account deletion')} placeholderTextColor={theme.colors.textMuted} style={styles.input} accessibilityLabel={t('Current password, for account deletion')} />
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => perform(logout, 'Signed out. Your local and account records are preserved.')}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('Sign out')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LogOut size={17} color={theme.colors.primary} />
            <Text style={styles.outlineText}>{t('Sign out')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, (!emailVerified || busy) && styles.disabled]}
            onPress={removeAccount}
            disabled={busy || !emailVerified}
            accessibilityRole="button"
            accessibilityLabel={t('Delete account')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={17} color={theme.colors.danger} />
            <Text style={styles.deleteText}>{t('Delete account')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t(mode === 'create' ? 'Create your account' : 'Welcome back')}</Text>
          <Text style={styles.body}>{t('You can keep using FitTrack as a guest. An account is only needed for cross-device cloud backup.')}</Text>
          {!firebaseConfigured && <Text style={styles.small}>{t('Connect Firebase before using sign in or account creation.')}</Text>}
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder={t('Email')} placeholderTextColor={theme.colors.textMuted} style={styles.input} accessibilityLabel={t('Email')} />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={t('Password')} placeholderTextColor={theme.colors.textMuted} style={styles.input} accessibilityLabel={t('Password')} />
          <AnimatedPressable
            disabled={busy || !firebaseConfigured || !email.trim() || password.length < 6}
            style={[styles.primaryBtn, (busy || !firebaseConfigured || !email.trim() || password.length < 6) && styles.disabled]}
            onPress={signIn}
            accessibilityRole="button"
            accessibilityLabel={t(mode === 'create' ? 'Create account' : 'Sign in')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LogIn size={17} color={theme.colors.textInverted} />
            <Text style={styles.primaryText}>{t(mode === 'create' ? 'Create account' : 'Sign in')}</Text>
          </AnimatedPressable>
          <TouchableOpacity
            onPress={() => setMode(mode === 'create' ? 'login' : 'create')}
            style={styles.switchMode}
            accessibilityRole="button"
            accessibilityLabel={t(mode === 'create' ? 'Already have an account? Sign in' : 'New to FitTrack? Create an account')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.outlineText}>{t(mode === 'create' ? 'Already have an account? Sign in' : 'New to FitTrack? Create an account')}</Text>
          </TouchableOpacity>
          {mode === 'login' && (
            <TouchableOpacity
              disabled={!firebaseConfigured || busy}
              onPress={() => perform(async () => { await requestPasswordReset(email); }, 'Password reset email sent.')}
              style={styles.switchMode}
              accessibilityRole="button"
              accessibilityLabel={t('Forgot password?')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.outlineText}>{t('Forgot password?')}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.separator}><View style={styles.rule} /><Text style={styles.muted}>{t('or')}</Text><View style={styles.rule} /></View>
          {Platform.OS !== 'web' && <>
            <TouchableOpacity
              disabled={busy || !firebaseConfigured}
              style={[styles.outlineBtn, styles.googleBtn, (busy || !firebaseConfigured) && styles.disabled]}
              onPress={googleSignIn}
              accessibilityRole="button"
              accessibilityLabel={t('Continue with Google')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.outlineText}>{t('Continue with Google')}</Text>
            </TouchableOpacity>
            <Text style={styles.small}>{t('Google sign-in needs a configured mobile development build. It uses your Google identity only, not Gmail or Gemini.')}</Text>
          </>}
        </View>
      )}

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={toggleSetupCheck}
          accessibilityRole="button"
          accessibilityLabel={t('Account setup check')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.rowAlign}>
            <Wrench size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>{t('Account setup check')}</Text>
          </View>
          {showSetupCheck ? <ChevronUp size={20} color={theme.colors.textMuted} /> : <ChevronDown size={20} color={theme.colors.textMuted} />}
        </TouchableOpacity>

        {showSetupCheck && (
          <View style={styles.diagnosticContent}>
            <Text style={styles.body}>{t('Diagnostic information for Firebase and Google Sign-in.')}</Text>

            {diagnosticsLoading ? (
              <Text style={styles.muted}>{t('Checking setup…')}</Text>
            ) : diagnostics ? (
              <View style={styles.diagnosticList}>
                <View style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{t('App version')}</Text>
                  <Text style={styles.diagnosticValue}>{diagnostics.appVersion}</Text>
                </View>
                <View style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{t('Package name')}</Text>
                  <Text style={styles.diagnosticValue}>{diagnostics.packageName}</Text>
                </View>
                <View style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{t('Firebase configured')}</Text>
                  <Text style={[styles.diagnosticValue, { color: diagnostics.firebaseConfigured ? theme.colors.success : theme.colors.danger }]}>
                    {diagnostics.firebaseConfigured ? t('Configured') : t('Not configured')}
                  </Text>
                </View>
                <View style={styles.diagnosticColumn}>
                  <Text style={styles.diagnosticLabel}>{t('Missing Firebase variables')}</Text>
                  {diagnostics.missingFirebaseEnvVars.length === 0 ? (
                    <Text style={[styles.diagnosticValue, { color: theme.colors.success }]}>{t('None (all configured)')}</Text>
                  ) : (
                    <View style={styles.tagWrap}>
                      {diagnostics.missingFirebaseEnvVars.map((v) => (
                        <View key={v} style={styles.tagBadge}>
                          <Text style={styles.tagText}>{v}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{t('Google Web Client ID')}</Text>
                  <Text style={[styles.diagnosticValue, { color: diagnostics.webClientIdSet ? theme.colors.success : theme.colors.danger }]}>
                    {diagnostics.webClientIdSet ? t('Configured') : t('Not configured')}
                  </Text>
                </View>
                <View style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{t('Nitro Google module')}</Text>
                  <Text style={[styles.diagnosticValue, { color: diagnostics.nitroGoogleModuleLoaded ? theme.colors.success : theme.colors.danger }]}>
                    {diagnostics.nitroGoogleModuleLoaded ? t('Loaded') : t('Not loaded')}
                  </Text>
                </View>
                <View style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{t('Google Play services')}</Text>
                  <Text style={[styles.diagnosticValue, { color: diagnostics.playServicesStatus === 'available' ? theme.colors.success : theme.colors.textMuted }]}>
                    {diagnostics.playServicesStatus === 'available' ? t('Available') : diagnostics.playServicesStatus === 'not_applicable' ? 'N/A' : t('Unavailable')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={copyDiagnostics}
                  accessibilityRole="button"
                  accessibilityLabel={t('Copy diagnostics')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {copiedDiagnostics ? <Check size={16} color={theme.colors.success} /> : <Copy size={16} color={theme.colors.primary} />}
                  <Text style={styles.outlineText}>{copiedDiagnostics ? t('Copied!') : t('Copy diagnostics')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>{t('Privacy Policy')}</Text>
        </View>
        <Text style={styles.body}>
          {t('FitTrack operates offline-first. Your nutrition, workout, and biometric data stays strictly on your device unless you explicitly opt in to Firebase Cloud Backup or Gemini AI plate analysis.')}
        </Text>
        <AnimatedPressable
          style={styles.outlineBtn}
          onPress={openPrivacyPolicy}
          accessibilityRole="link"
          accessibilityLabel={t('Open Privacy Policy')}
        >
          <ExternalLink size={16} color={theme.colors.primary} />
          <Text style={styles.outlineText}>{t('Open Privacy Policy')}</Text>
        </AnimatedPressable>
      </View>

      {!!message && <Text accessibilityRole="alert" style={styles.success}>{message}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {busy && <Text style={styles.muted}>{t('Please wait…')}</Text>}
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, paddingBottom: 145, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }, back: { padding: 10, borderRadius: 24, backgroundColor: theme.colors.surface }, eyebrow: { fontSize: 12, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }, title: { fontFamily: theme.fonts.serif, fontSize: 27, color: theme.colors.textPrimary },
  card: { padding: 18, gap: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18 }, notice: { alignItems: 'center', padding: 22, gap: 10, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18 }, emailIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, noticeTitle: { textAlign: 'center', fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontWeight: '700', fontSize: 19 }, cardTitle: { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontWeight: '700', fontSize: 20 }, body: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 }, small: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 16, textAlign: 'center' }, muted: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' },
  input: { width: '100%', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 13, paddingVertical: 12, color: theme.colors.textPrimary, fontSize: 14 }, primaryBtn: { minHeight: 48, backgroundColor: theme.colors.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 }, primaryText: { color: theme.colors.textInverted, fontWeight: '700', fontSize: 14 }, outlineBtn: { minHeight: 45, borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: theme.colors.surface }, outlineText: { color: theme.colors.primary, fontWeight: '700', textAlign: 'center', fontSize: 13 }, disabled: { opacity: 0.5 }, switchMode: { paddingVertical: 6, alignItems: 'center' }, separator: { flexDirection: 'row', alignItems: 'center', gap: 12 }, rule: { flex: 1, height: 1, backgroundColor: theme.colors.border }, googleBtn: { minHeight: 48 }, success: { color: theme.colors.success, textAlign: 'center', fontWeight: '600' }, error: { color: theme.colors.danger, textAlign: 'center', fontSize: 13 }, deleteBtn: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.dangerLight, backgroundColor: theme.colors.surface, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, deleteText: { color: theme.colors.danger, fontWeight: '700' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rowAlign: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  diagnosticContent: { gap: 12, marginTop: 4 },
  diagnosticList: { gap: 8 },
  diagnosticRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  diagnosticColumn: { gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  diagnosticLabel: { fontSize: 13, color: theme.colors.textSecondary },
  diagnosticValue: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagBadge: { backgroundColor: theme.colors.dangerLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 12, color: theme.colors.danger },
});
