import { firebaseConfigured } from './firebaseApp';

export interface AccountDiagnosticInfo {
  firebaseConfigured: boolean;
  missingFirebaseEnvVars: string[];
  nitroGoogleModuleLoaded: boolean;
  playServicesStatus: 'available' | 'unavailable' | 'not_applicable' | 'error';
  playServicesMessage?: string;
  webClientIdSet: boolean;
  packageName: string;
  appVersion: string;
}

const FIREBASE_ENV_VARS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

export function getMissingFirebaseEnvVars(): string[] {
  return FIREBASE_ENV_VARS.filter(
    (name) => !process.env[name] || process.env[name]!.trim().length === 0
  );
}

export function isGoogleWebClientIdSet(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.trim().length > 0
  );
}

export function getAppPackageName(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants');
    return (
      Constants?.default?.expoConfig?.android?.package ??
      Constants?.expoConfig?.android?.package ??
      'com.fittrack.expo'
    );
  } catch {
    return 'com.fittrack.expo';
  }
}

export function getAppVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants');
    return (
      Constants?.default?.expoConfig?.version ??
      Constants?.expoConfig?.version ??
      '1.0.0'
    );
  } catch {
    return '1.0.0';
  }
}

/**
 * Performs account setup inspection for Firebase, Nitro Google Sign-in, and Google Play services.
 * Guarantee: Exclusively reveals variable names, booleans, and statuses. Never displays values, keys, or tokens.
 */
export async function checkAccountSetup(): Promise<AccountDiagnosticInfo> {
  const missingVars = getMissingFirebaseEnvVars();
  const webClientIdSet = isGoogleWebClientIdSet();
  const packageName = getAppPackageName();
  const appVersion = getAppVersion();

  let nitroGoogleModuleLoaded = false;
  let playServicesStatus: AccountDiagnosticInfo['playServicesStatus'] = 'not_applicable';
  let playServicesMessage: string | undefined = undefined;

  let isWeb = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    isWeb = rn?.Platform?.OS === 'web';
  } catch {
    isWeb = typeof window !== 'undefined';
  }

  if (!isWeb) {
    try {
      const nitro = await import('react-native-nitro-google-signin');
      if (nitro && nitro.GoogleOneTapSignIn) {
        nitroGoogleModuleLoaded = true;
        try {
          await nitro.GoogleOneTapSignIn.checkPlayServices();
          playServicesStatus = 'available';
        } catch (playErr: any) {
          playServicesStatus = 'unavailable';
          playServicesMessage = playErr?.message ? String(playErr.message).slice(0, 80) : 'Play services check failed';
        }
      } else {
        playServicesStatus = 'unavailable';
      }
    } catch (modErr: any) {
      nitroGoogleModuleLoaded = false;
      playServicesStatus = 'unavailable';
      playServicesMessage = modErr?.message ? String(modErr.message).slice(0, 80) : 'Failed to load module';
    }
  }

  return {
    firebaseConfigured,
    missingFirebaseEnvVars: missingVars,
    nitroGoogleModuleLoaded,
    playServicesStatus,
    playServicesMessage,
    webClientIdSet,
    packageName,
    appVersion,
  };
}

/**
 * Formats diagnostic inspection results for clipboard copying or review.
 * Never includes secret values or keys.
 */
export function formatAccountDiagnostics(info: AccountDiagnosticInfo): string {
  const missingVars = info.missingFirebaseEnvVars.length === 0
    ? 'None (All configured)'
    : info.missingFirebaseEnvVars.join(', ');

  const playServicesDisplay = info.playServicesStatus === 'available'
    ? 'Available'
    : info.playServicesStatus === 'not_applicable'
    ? 'N/A (Web)'
    : info.playServicesMessage
    ? `Unavailable (${info.playServicesMessage})`
    : 'Unavailable';

  return [
    'FitTrack Account Setup Diagnostics',
    '==================================',
    `App Version: ${info.appVersion}`,
    `Package Name: ${info.packageName}`,
    `Firebase Configured: ${info.firebaseConfigured ? 'Yes' : 'No'}`,
    `Missing Firebase Variables: ${missingVars}`,
    `Google Web Client ID Set: ${info.webClientIdSet ? 'Yes' : 'No'}`,
    `Nitro Google Module: ${info.nitroGoogleModuleLoaded ? 'Loaded' : 'Not Loaded'}`,
    `Play Services: ${playServicesDisplay}`,
  ].join('\n');
}
