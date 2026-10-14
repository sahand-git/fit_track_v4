import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Cloud, ExternalLink, LogIn, LogOut, Mail, ShieldCheck, Trash2 } from 'lucide-react-native';
import { AppText as Text } from '../components/AppText';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AuthIdentity, getAuthErrorMessage, loginWithEmail, loginWithGoogle, logout, refreshVerificationStatus, registerWithEmail, requestPasswordReset, resendVerification } from '../services/authService';
import { createCloudBackup, deleteAccountAndBackup, restoreCloudBackup } from '../services/cloudBackupService';
import { firebaseConfigured } from '../services/firebaseApp';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';
import { theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props { user: AuthIdentity | null; onBack: () => void; onRestoreComplete: () => void; }

export const AccountScreen: React.FC<Props> = ({ user, onBack, onRestoreComplete }) => {
  const language = useLanguage();
  const insets = useSafeAreaInsets();
  const t = (value: string) => translate(language, value);
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verificationOverride, setVerificationOverride] = useState<{ uid: string; verified: boolean } | null>(null);
  const emailVerified = user && verificationOverride?.uid === user.uid
    ? verificationOverride.verified
    : !!user?.emailVerified;

  const perform = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(t(success)); }
    catch (cause) { setError(t(getAuthErrorMessage(cause))); }
    finally { setBusy(false); }
  };

  const signIn = () => perform(async () => { if (mode === 'create') await registerWithEmail(email, password); else await loginWithEmail(email, password); }, mode === 'create' ? 'Account created. Check your email to verify it.' : 'Signed in successfully.');
  const googleSignIn = () => perform(async () => { await loginWithGoogle(); }, 'Signed in successfully.');
  const openSetupGuide = async () => {
    try {
      await Linking.openURL('https://github.com/sahand-git/fit_track_v4/blob/main/docs/firebase-setup.md');
    } catch {
      setError(t('Could not open Firebase setup guide.'));
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back} accessibilityLabel={t('Back')} accessibilityRole="button"><ArrowLeft size={19} color={theme.colors.textPrimary} /></TouchableOpacity>
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

      {user ? (
        <>
          <View style={styles.notice}>
            <View style={styles.emailIcon}><Mail size={18} color={theme.colors.primary} /></View>
            <Text style={styles.noticeTitle}>{user.displayName || user.email || t('Account')}</Text>
            <Text style={styles.body}>{emailVerified ? t('Verified account') : t('Email not verified yet. Cloud backup stays locked until verification.')}</Text>
            {!emailVerified && <>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => perform(resendVerification, 'Verification email sent.')}><Text style={styles.outlineText}>{t('Resend verification email')}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => perform(async () => { const refreshed = await refreshVerificationStatus(); setVerificationOverride({ uid: user.uid, verified: !!refreshed?.emailVerified }); if (!refreshed?.emailVerified) throw new Error('Email not verified yet. Cloud backup stays locked until verification.'); }, 'Email verified. Cloud backup is ready.') }><Text style={styles.outlineText}>{t('Check verification status')}</Text></TouchableOpacity>
            </>}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('Cloud backup')}</Text>
            <Text style={styles.body}>{t('Backups are manual and account-owned. Gemini credentials are never included.')}</Text>
            <TouchableOpacity disabled={busy || !emailVerified} style={[styles.primaryBtn, (busy || !emailVerified) && styles.disabled]} onPress={cloudBackup} accessibilityRole="button"><Cloud size={17} color={theme.colors.textInverted} /><Text style={styles.primaryText}>{t('Back up now')}</Text></TouchableOpacity>
            <TouchableOpacity disabled={busy || !emailVerified} style={[styles.outlineBtn, (busy || !emailVerified) && styles.disabled]} onPress={restore} accessibilityRole="button"><Text style={styles.outlineText}>{t('Restore cloud backup')}</Text></TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('Guest data on this device')}</Text>
            <Text style={styles.body}>{t('Signing in does not merge or upload previous guest records. To keep them, export a local backup before signing in, then import it after sign-in.')}</Text>
          </View>

          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={t('Current password, for account deletion')} placeholderTextColor={theme.colors.textMuted} style={styles.input} accessibilityLabel={t('Current password, for account deletion')} />
          <TouchableOpacity style={styles.outlineBtn} onPress={() => perform(logout, 'Signed out. Your local and account records are preserved.')} disabled={busy}><LogOut size={17} color={theme.colors.primary} /><Text style={styles.outlineText}>{t('Sign out')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.deleteBtn, (!emailVerified || busy) && styles.disabled]} onPress={removeAccount} disabled={busy || !emailVerified} accessibilityRole="button"><Trash2 size={17} color={theme.colors.danger} /><Text style={styles.deleteText}>{t('Delete account')}</Text></TouchableOpacity>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t(mode === 'create' ? 'Create your account' : 'Welcome back')}</Text>
          <Text style={styles.body}>{t('You can keep using FitTrack as a guest. An account is only needed for cross-device cloud backup.')}</Text>
          {!firebaseConfigured && <Text style={styles.small}>{t('Connect Firebase before using sign in or account creation.')}</Text>}
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder={t('Email')} placeholderTextColor={theme.colors.textMuted} style={styles.input} accessibilityLabel={t('Email')} />
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={t('Password')} placeholderTextColor={theme.colors.textMuted} style={styles.input} accessibilityLabel={t('Password')} />
          <AnimatedPressable disabled={busy || !firebaseConfigured || !email.trim() || password.length < 6} style={[styles.primaryBtn, (busy || !firebaseConfigured || !email.trim() || password.length < 6) && styles.disabled]} onPress={signIn} accessibilityRole="button"><LogIn size={17} color={theme.colors.textInverted} /><Text style={styles.primaryText}>{t(mode === 'create' ? 'Create account' : 'Sign in')}</Text></AnimatedPressable>
          <TouchableOpacity onPress={() => setMode(mode === 'create' ? 'login' : 'create')} style={styles.switchMode}><Text style={styles.outlineText}>{t(mode === 'create' ? 'Already have an account? Sign in' : 'New to FitTrack? Create an account')}</Text></TouchableOpacity>
          {mode === 'login' && <TouchableOpacity disabled={!firebaseConfigured || busy} onPress={() => perform(async () => { await requestPasswordReset(email); }, 'Password reset email sent.')} style={styles.switchMode}><Text style={styles.outlineText}>{t('Forgot password?')}</Text></TouchableOpacity>}
          <View style={styles.separator}><View style={styles.rule} /><Text style={styles.muted}>{t('or')}</Text><View style={styles.rule} /></View>
          {Platform.OS !== 'web' && <>
            <TouchableOpacity disabled={busy || !firebaseConfigured} style={[styles.outlineBtn, styles.googleBtn, (busy || !firebaseConfigured) && styles.disabled]} onPress={googleSignIn}><Text style={styles.outlineText}>{t('Continue with Google')}</Text></TouchableOpacity>
            <Text style={styles.small}>{t('Google sign-in needs a configured mobile development build. It uses your Google identity only, not Gmail or Gemini.')}</Text>
          </>}
        </View>
      )}
      {!!message && <Text accessibilityRole="alert" style={styles.success}>{message}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {busy && <Text style={styles.muted}>{t('Please wait…')}</Text>}
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: 18, paddingBottom: 145, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }, back: { padding: 10, borderRadius: 24, backgroundColor: theme.colors.surface }, eyebrow: { fontSize: 11, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }, title: { fontFamily: theme.fonts.serif, fontSize: 27, color: theme.colors.textPrimary },
  card: { padding: 18, gap: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18 }, notice: { alignItems: 'center', padding: 22, gap: 10, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18 }, emailIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, noticeTitle: { textAlign: 'center', fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontWeight: '700', fontSize: 19 }, cardTitle: { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary, fontWeight: '700', fontSize: 20 }, body: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 }, small: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' }, muted: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' },
  input: { width: '100%', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 13, paddingVertical: 12, color: theme.colors.textPrimary, fontSize: 14 }, primaryBtn: { minHeight: 48, backgroundColor: theme.colors.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 }, primaryText: { color: theme.colors.textInverted, fontWeight: '700', fontSize: 14 }, outlineBtn: { minHeight: 45, borderWidth: 1, borderColor: theme.colors.borderStrong, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: theme.colors.surface }, outlineText: { color: theme.colors.primary, fontWeight: '700', textAlign: 'center', fontSize: 13 }, disabled: { opacity: 0.5 }, switchMode: { paddingVertical: 6, alignItems: 'center' }, separator: { flexDirection: 'row', alignItems: 'center', gap: 12 }, rule: { flex: 1, height: 1, backgroundColor: theme.colors.border }, googleBtn: { minHeight: 48 }, success: { color: theme.colors.success, textAlign: 'center', fontWeight: '600' }, error: { color: theme.colors.danger, textAlign: 'center', fontSize: 13 }, deleteBtn: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.dangerLight, backgroundColor: theme.colors.surface, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, deleteText: { color: theme.colors.danger, fontWeight: '700' },
});
