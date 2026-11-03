/**
 * Configuración Firebase — DESHABILITADA por decisión de la Dirección Humana
 * (2026-11-03): Firebase/Firestore/FCM y Google Drive salen del producto web
 * (soberanía del dato). Este módulo conserva el shape exportado para no romper
 * `lib/auth.ts` (ahora stub), pero ya no contiene credenciales de Google.
 */
export const firebaseConfig = {
  projectId: '',
  appId: '',
  apiKey: '',
  authDomain: '',
  firestoreDatabaseId: '',
  storageBucket: '',
  messagingSenderId: '',
  measurementId: '',
  oAuthClientId: '',
  recaptchaSiteKey: '',
};

export default firebaseConfig;
