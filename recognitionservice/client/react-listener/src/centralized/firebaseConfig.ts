import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebaseCreds";
// Follow this pattern to import other Firebase services
// import { } from 'firebase/<service>';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
