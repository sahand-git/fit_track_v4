import {
  checkAccountSetup,
  formatAccountDiagnostics,
  getMissingFirebaseEnvVars,
  isGoogleWebClientIdSet,
  getAppPackageName,
  getAppVersion,
  AccountDiagnosticInfo,
} from './accountDiagnosticService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAccountDiagnosticTests() {
  console.log('Starting Account Diagnostic Service Unit Tests...');

  // 1. Missing Firebase env vars verification
  {
    const missing = getMissingFirebaseEnvVars();
    assert(Array.isArray(missing), 'getMissingFirebaseEnvVars must return an array');
    for (const name of missing) {
      assert(name.startsWith('EXPO_PUBLIC_FIREBASE_'), `Variable name must be an EXPO_PUBLIC_FIREBASE_* name, got ${name}`);
    }
    console.log('✓ Test 1 passed: Firebase missing variable check returns valid names only.');
  }

  // 2. Google Web Client ID boolean check
  {
    const isSet = isGoogleWebClientIdSet();
    assert(typeof isSet === 'boolean', 'isGoogleWebClientIdSet must return a boolean');
    console.log('✓ Test 2 passed: Google Web Client ID check returns strict boolean.');
  }

  // 3. Package name and version
  {
    const pkg = getAppPackageName();
    const ver = getAppVersion();
    assert(typeof pkg === 'string' && pkg.length > 0, 'Package name must be a non-empty string');
    assert(typeof ver === 'string' && ver.length > 0, 'App version must be a non-empty string');
    console.log(`✓ Test 3 passed: Package (${pkg}) and version (${ver}) resolved.`);
  }

  // 4. checkAccountSetup execution
  {
    const setup = await checkAccountSetup();
    assert(typeof setup.firebaseConfigured === 'boolean', 'firebaseConfigured must be boolean');
    assert(Array.isArray(setup.missingFirebaseEnvVars), 'missingFirebaseEnvVars must be array');
    assert(typeof setup.nitroGoogleModuleLoaded === 'boolean', 'nitroGoogleModuleLoaded must be boolean');
    assert(['available', 'unavailable', 'not_applicable', 'error'].includes(setup.playServicesStatus), 'playServicesStatus must be valid status');
    assert(typeof setup.webClientIdSet === 'boolean', 'webClientIdSet must be boolean');
    assert(setup.packageName.length > 0, 'packageName must be non-empty');
    assert(setup.appVersion.length > 0, 'appVersion must be non-empty');
    console.log('✓ Test 4 passed: checkAccountSetup returns valid diagnostic info.');
  }

  // 5. formatAccountDiagnostics formatting and secret protection
  {
    const mockInfo: AccountDiagnosticInfo = {
      firebaseConfigured: false,
      missingFirebaseEnvVars: ['EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_APP_ID'],
      nitroGoogleModuleLoaded: false,
      playServicesStatus: 'unavailable',
      playServicesMessage: 'DEVELOPER_ERROR',
      webClientIdSet: false,
      packageName: 'com.fittrack.expo',
      appVersion: '1.0.0',
    };

    const formatted = formatAccountDiagnostics(mockInfo);
    assert(formatted.includes('FitTrack Account Setup Diagnostics'), 'Header must exist');
    assert(formatted.includes('App Version: 1.0.0'), 'Version must exist');
    assert(formatted.includes('Package Name: com.fittrack.expo'), 'Package name must exist');
    assert(formatted.includes('Firebase Configured: No'), 'Firebase Configured line must exist');
    assert(formatted.includes('EXPO_PUBLIC_FIREBASE_API_KEY'), 'Missing variable name must be displayed');
    assert(formatted.includes('Google Web Client ID Set: No'), 'Google Client ID line must exist');
    assert(formatted.includes('Nitro Google Module: Not Loaded'), 'Nitro line must exist');
    assert(formatted.includes('Unavailable (DEVELOPER_ERROR)'), 'Play services display must exist');

    // Security check: no keys, no passwords, no tokens
    assert(!formatted.includes('AIza'), 'No AIza key prefix should appear in formatted output');
    assert(!formatted.includes('secret'), 'No secret should appear in formatted output');
    assert(!formatted.includes('token'), 'No token should appear in formatted output');

    console.log('✓ Test 5 passed: formatAccountDiagnostics accurately formats and maintains zero secret leakage.');
  }

  console.log('All Account Diagnostic Service Unit Tests PASSED successfully!');
}

runAccountDiagnosticTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
