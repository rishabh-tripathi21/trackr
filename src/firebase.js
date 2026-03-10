import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBNds04EN3VYJZFyQNh4bNGxEOS1O2kV8k",
  authDomain: "trackr-54b54.firebaseapp.com",
  projectId: "trackr-54b54",
  storageBucket: "trackr-54b54.firebasestorage.app",
  messagingSenderId: "141123578875",
  appId: "1:141123578875:web:cb36574f09f64c650af95e",
  measurementId: "G-VDFDC1E1B3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();