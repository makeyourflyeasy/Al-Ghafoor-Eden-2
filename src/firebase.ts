
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYIyr_ORQ-V28gXZGPaiyjCeOcj55uE70",
  authDomain: "alghafooreden-7bc6b.firebaseapp.com",
  projectId: "alghafooreden-7bc6b",
  storageBucket: "alghafooreden-7bc6b.firebasestorage.app",
  messagingSenderId: "194934662024",
  appId: "1:194934662024:web:0f2eff5a10cbc1943f103d",
  measurementId: "G-TYYPW61MDM"
};

// Initialize Firebase
let app;
let db: any = null;
let analytics;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    console.log("Firebase connected successfully.");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export { db };
