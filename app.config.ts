import type { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'fs';

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidGoogleServicesFile =
    process.env.GOOGLE_ANDROID_SERVICES_FILE ||
    (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);

  const iosGoogleServicesFile =
    process.env.GOOGLE_IOS_SERVICES_FILE ||
    (fs.existsSync('./GoogleService-Info.plist') ? './GoogleService-Info.plist' : undefined);

  const nitroPluginConfig: Record<string, string> = {};
  if (androidGoogleServicesFile) {
    nitroPluginConfig.androidGoogleServicesFile = androidGoogleServicesFile;
  }
  if (iosGoogleServicesFile) {
    nitroPluginConfig.iosGoogleServicesFile = iosGoogleServicesFile;
  }
  if (process.env.GOOGLE_IOS_URL_SCHEME) {
    nitroPluginConfig.iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  }

  const hasNitroConfig = Object.keys(nitroPluginConfig).length > 0;
  const googlePlugin: [string, Record<string, string>] | null = hasNitroConfig
    ? ['react-native-nitro-google-signin', nitroPluginConfig]
    : null;

  return {
    ...config,
    name: config.name ?? 'FitTrack',
    slug: config.slug ?? 'fittrack-expo',
    android: {
      ...config.android,
      ...(androidGoogleServicesFile ? { googleServicesFile: androidGoogleServicesFile } : {}),
    },
    ios: {
      ...config.ios,
      ...(iosGoogleServicesFile ? { googleServicesFile: iosGoogleServicesFile } : {}),
    },
    plugins: [
      ...(config.plugins || []).filter(
        (plugin) =>
          plugin !== 'react-native-nitro-google-signin' &&
          !(Array.isArray(plugin) && plugin[0] === 'react-native-nitro-google-signin')
      ),
      ...(googlePlugin ? [googlePlugin] : []),
    ],
  };
};

