// Versão nativa (iOS/Android). No web o Metro resolve firebase.web.ts em vez deste arquivo.
import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-expect-error getReactNativePersistence só existe na condição de export "react-native"
// do @firebase/auth, que o Metro resolve no nativo. O tsc resolve a condição default e não vê.
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseConfig } from './firebase-config';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
