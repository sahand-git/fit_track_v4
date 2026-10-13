import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

export const firebaseConfigured = Object.values(config).every(Boolean);
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

if (firebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(config);
  try {
    // Firebase's RN conditional export includes this helper; its shared TypeScript
    // declaration omits it, so narrow the platform export explicitly here.
    const getRNAuthPersistence = (FirebaseAuth as unknown as {
      getReactNativePersistence: (storage: typeof AsyncStorage) => NonNullable<Parameters<typeof initializeAuth>[1]>['persistence'];
    }).getReactNativePersistence;
    auth = initializeAuth(app, { persistence: getRNAuthPersistence(AsyncStorage) });
  } catch {
    auth = getAuth(app);
  }
  firestore = getFirestore(app);
}

export { app, auth, firestore };
