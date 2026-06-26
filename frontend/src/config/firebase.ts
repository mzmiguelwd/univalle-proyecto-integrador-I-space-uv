import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// CONFIGURATION

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// VALIDATION

if (!firebaseConfig.projectId) {
  throw new Error(
    "Fallo crítico: Variables de entorno de Firebase no encontradas. Verifica tu archivo .env",
  );
}

// INITIALIZATION

// Check if Firebase app is already initialized to avoid re-initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// Only log in development mode
if (import.meta.env.DEV) {
  console.info("Firebase inicializado correctamente.", firebaseConfig);
}

export { app, auth, db };
