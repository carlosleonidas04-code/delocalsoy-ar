import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from './firebaseConfig';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/documents.readonly',
];

export const firebaseProjectId = firebaseConfig.projectId;
export const firebaseDatabaseId = firebaseConfig.firestoreDatabaseId;
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Validación obligatoria de conexión inicial a Firestore (Skill firebase-integration-rpc)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Incluso sin token OAuth de Drive en caché, el usuario de Firebase Auth está autenticado para Firestore
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken ?? '';
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
