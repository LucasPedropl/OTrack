import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBVsgZTEq_I_LwLsa5xcmzYDpsprk-bGC0",
  authDomain: "otrack-106bf.firebaseapp.com",
  projectId: "otrack-106bf",
  storageBucket: "otrack-106bf.firebasestorage.app",
  messagingSenderId: "588002339083",
  appId: "1:588002339083:web:d62b71d5ef98043b785a0e",
  measurementId: "G-NHBES14ZMY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // Initialized but using mock auth for this stage