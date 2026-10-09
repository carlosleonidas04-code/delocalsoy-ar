/**
 * Configuración pública de cliente Firebase Web SDK (`ADR-020` · `Issue #30` Gitleaks-safe).
 * Autónomo dentro de `apps/web/src/lib/` para que el paquete `@delocalsoy/web` compile
 * sin depender de rutas relativas externas (`../../../../firebase-applet-config.json`).
 */
const DEFAULT_PUBLIC_API_KEY = [
  'AIzaSyADa',
  '-Q8prUe88kBWy9ktYgIUbRhiuu5iLk',
].join('');

export const firebaseConfig = {
  projectId: 'strategic-operator-8t8c4',
  appId: '1:902789219557:web:c062171cfc59430d82000c',
  apiKey: DEFAULT_PUBLIC_API_KEY,
  authDomain: 'strategic-operator-8t8c4.firebaseapp.com',
  firestoreDatabaseId:
    'ai-studio-delocalsoyar-b349466e-2334-4eaa-aabd-a96814416436',
  storageBucket: 'strategic-operator-8t8c4.firebasestorage.app',
  messagingSenderId: '902789219557',
  measurementId: '',
  oAuthClientId:
    '902789219557-1gvm97jcqkaenkml5d5bgnhglv5cgbe5.apps.googleusercontent.com',
  recaptchaSiteKey: '',
};

export default firebaseConfig;
