import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  // apiKey: "AIzaSyAVTq89H0x_KzlgxiobbCGUhdnqICsBi48",
  // authDomain: "customer-abe40.firebaseapp.com",
  // projectId: "customer-abe40",
  // storageBucket: "customer-abe40.firebasestorage.app",
  // messagingSenderId: "566208631479",
  // appId: "1:566208631479:web:540f9812eceb08690cb332",
  // measurementId: "G-BKJVVKWWV2"

  // apiKey: "AIzaSyCAts2_k5koBbKEpEYN7FHAV8kVnPVnuQg",
  // authDomain: "billiing-system.firebaseapp.com",
  // projectId: "billiing-system",
  // storageBucket: "billiing-system.firebasestorage.app",
  // messagingSenderId: "902814918340",
  // appId: "1:902814918340:web:2b4244de8b79a57c9a0b91",
  // measurementId: "G-Q3GRMJXXQ8"

   apiKey: "AIzaSyCIUXb_Wn-JcDp8bR-0QsIhlKJmaPtM9AQ",
  authDomain: "golden-oil-64706.firebaseapp.com",
  projectId: "golden-oil-64706",
  storageBucket: "golden-oil-64706.firebasestorage.app",
  messagingSenderId: "398282244656",
  appId: "1:398282244656:web:42ff87867d216cf34d23f5",
  measurementId: "G-SJQ0Q4B79S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app; 
