const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to inject production Release signing configuration
 * into android/app/build.gradle.
 *
 * If FITTRACK_RELEASE_STORE_FILE is provided via gradle.properties or command line,
 * the release build will be signed with the custom release keystore and credentials.
 * Otherwise, it falls back to the default debug key so local builds and CI without secrets
 * don't fail.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    // Check if already configured
    if (contents.includes('FITTRACK_RELEASE_STORE_FILE')) {
      return modConfig;
    }

    const signingSearch = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

    const signingReplacement = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('FITTRACK_RELEASE_STORE_FILE')) {
                storeFile file(FITTRACK_RELEASE_STORE_FILE)
                storePassword FITTRACK_RELEASE_STORE_PASSWORD
                keyAlias FITTRACK_RELEASE_KEY_ALIAS
                keyPassword FITTRACK_RELEASE_KEY_PASSWORD
            }
        }
    }`;

    if (contents.includes(signingSearch)) {
      contents = contents.replace(signingSearch, signingReplacement);
    } else {
      // Fallback regex matching in case whitespace varies
      contents = contents.replace(
        /signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}\s*\}/,
        signingReplacement.trim()
      );
    }

    const releaseBuildTypeSearch = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

    const releaseBuildTypeReplacement = `        release {
            // Production release signing from gradle.properties or fallback
            signingConfig (project.hasProperty('FITTRACK_RELEASE_STORE_FILE') ? signingConfigs.release : signingConfigs.debug)`;

    if (contents.includes(releaseBuildTypeSearch)) {
      contents = contents.replace(releaseBuildTypeSearch, releaseBuildTypeReplacement);
    } else {
      // Fallback replacement for release signingConfig
      contents = contents.replace(
        /release\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/,
        (match) => match.replace('signingConfig signingConfigs.debug', 'signingConfig (project.hasProperty(\'FITTRACK_RELEASE_STORE_FILE\') ? signingConfigs.release : signingConfigs.debug)')
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
