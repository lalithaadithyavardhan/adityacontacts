import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- PASTE YOUR CONFIG HERE ---
const firebaseConfig = {
  apiKey: "AIzaSyAKwBlqRRbNZ4IxoCOmL_KpvBpg6hTd0rw",
  authDomain: "adityacontacts9492.firebaseapp.com",
  projectId: "adityacontacts9492",
  storageBucket: "adityacontacts9492.firebasestorage.app",
  messagingSenderId: "1006082142462",
  appId: "1:1006082142462:web:efd65950104524766f35af",
  measurementId: "G-FCCD5V51DD"
};


const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);