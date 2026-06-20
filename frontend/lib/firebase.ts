/**
 * Firebase Auth client.
 *
 * Identity now lives in Firebase. The frontend signs in with Firebase and
 * sends the resulting ID token to the API, which verifies it and maps it to a
 * Supabase user row.
 *
 * Returns `null` when the public Firebase web config is not present, so the app
 * cleanly falls back to the existing Supabase/local auth path until Firebase is
 * configured (set the NEXT_PUBLIC_FIREBASE_* env vars to enable).
 */

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(config);
  auth = getAuth(app);
}

export const firebaseAuth: Auth | null = auth;
