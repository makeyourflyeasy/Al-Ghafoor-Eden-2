
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Helper to safely access environment variables
const getEnvVar = (key: string) => {
  try {
    // Check if import.meta.env exists (Vite standard)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore errors
  }
  return undefined;
};

// Your web app's configuration
const firebaseConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID")
};

// Initialize Firebase only if config is present
let app;
let db: any = null;

try {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase connected successfully.");
    } else {
        console.warn("Firebase config missing (API Key not found). App running in LocalStorage mode.");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export { db };
