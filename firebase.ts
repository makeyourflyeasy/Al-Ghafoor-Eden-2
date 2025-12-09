
// Firebase configuration disabled for Vercel/Local-only deployment
const firebaseConfig = {
  // Config removed
};

// Initialize Firebase
let app;
let db: any = null;
let analytics;

// Firebase initialization disabled
console.log("Running in Local/Vercel mode. Firebase is disabled.");

export { db };
