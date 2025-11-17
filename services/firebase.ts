

import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/functions";
import "firebase/compat/storage";

// The types for App and Auth are part of the firebase namespace.
type FirebaseApp = firebase.app.App;
type Auth = firebase.auth.Auth;

// --- Firebase Configuration ---
export const firebaseConfig = {
  apiKey: "AIzaSyApU57VCS5a72W0-V9F3MC54WtxpKBzjIs",
  authDomain: "user-management-all.firebaseapp.com",
  projectId: "user-management-all",
  storageBucket: "user-management-all.firebasestorage.app",
  messagingSenderId: "9549477457",
  appId: "1:9549477457:web:760ef803bcd9945d25aa70",
  measurementId: "G-QFRE2L59E0"
};

// --- Initialize Firebase and Services ---
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Export the initialized service instances.
export const auth = firebase.auth();
export const db = firebase.firestore();
export const functions = app.functions('asia-south1');
export const storage = firebase.storage();
export const FieldValue = firebase.firestore.FieldValue;

// Enable Firestore offline persistence with tab synchronization
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time. This is a normal scenario.
      console.warn('Firestore persistence failed: Multiple tabs open.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence.
      console.warn('Firestore persistence not supported in this browser.');
    }
  });


// --- Secondary App Helpers for Admin User Creation ---
// This is a specific utility for the admin dashboard to create users without
// affecting the admin's own auth state.
export const initializeSecondaryApp = (config: object, name: string): { app: FirebaseApp, auth: Auth } => {
    const secondaryApp = firebase.initializeApp(config, name);
    const secondaryAuth = secondaryApp.auth();
    return { app: secondaryApp, auth: secondaryAuth };
};

export const deleteApp = (app: FirebaseApp) => {
    return app.delete();
};