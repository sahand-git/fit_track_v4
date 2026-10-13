import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const hasBothGoogleServiceFiles = Boolean(process.env.GOOGLE_ANDROID_SERVICES_FILE && process.env.GOOGLE_IOS_SERVICES_FILE);
  const googlePlugin: [string, Record<string, string>] | null = hasBothGoogleServiceFiles
    ? ['react-native-nitro-google-signin', {
        androidGoogleServicesFile: process.env.GOOGLE_ANDROID_SERVICES_FILE!,
        iosGoogleServicesFile: process.env.GOOGLE_IOS_SERVICES_FILE!,
      }]
    : process.env.GOOGLE_IOS_URL_SCHEME
      ? ['react-native-nitro-google-signin', { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }]
      : null;

  return {
    ...config,
    name: config.name ?? 'FitTrack',
    slug: config.slug ?? 'fittrack-expo',
    android: {
      ...config.android,
      ...(process.env.GOOGLE_ANDROID_SERVICES_FILE ? { googleServicesFile: process.env.GOOGLE_ANDROID_SERVICES_FILE } : {}),
    },
    ios: {
      ...config.ios,
      ...(process.env.GOOGLE_IOS_SERVICES_FILE ? { googleServicesFile: process.env.GOOGLE_IOS_SERVICES_FILE } : {}),
    },
    plugins: [
      ...(config.plugins || []).filter((plugin) => plugin !== 'react-native-nitro-google-signin'),
      ...(googlePlugin ? [googlePlugin] : []),
    ],
  };
};
