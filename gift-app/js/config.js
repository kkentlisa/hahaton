import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export const firebaseConfig = { apiKey: "AIzaSyAe4ZXtxKH119CrCwBXM7ZjXDyiH5n3tjU",
    authDomain: "birthday-wishes-hits.firebaseapp.com",
    projectId: "birthday-wishes-hits",
    storageBucket: "birthday-wishes-hits.firebasestorage.app",
    messagingSenderId: "650338158827",
    appId: "1:650338158827:web:0bd1caba97a65a2de1d6ae" };
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
