import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from "./config.js";

const USERNAME_DOMAIN = "wishbird.local";
const usernameToEmail = (username) => `${username}@${USERNAME_DOMAIN}`;

function normalizeUsername(raw) {
    return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function isUsernameTaken(username) {
    const q = query(collection(db, "users"), where("username", "==", normalizeUsername(username)));
    const snap = await getDocs(q);
    return !snap.empty;
}

export async function registerUser({ username, password, name, birthday, groups, gifts }) {
    const cleanUsername = normalizeUsername(username);

    if (!cleanUsername) throw new Error("Введите логин");
    if (await isUsernameTaken(cleanUsername)) {
        throw new Error("Этот логин уже занят, выберите другой");
    }

    let credential;
    try {
        credential = await createUserWithEmailAndPassword(auth, usernameToEmail(cleanUsername), password);
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            throw new Error("Этот логин уже занят, выберите другой");
        }
        if (error.code === "auth/weak-password") {
            throw new Error("Пароль слишком короткий (минимум 6 символов)");
        }
        throw error;
    }

    await setDoc(doc(db, "users", credential.user.uid), {
        username: cleanUsername,
        name,
        birthday,
        groups: groups || [],
        gifts: gifts || [],
        friends: [],
    });

    return credential.user;
}

export async function loginUser(username, password) {
    try {
        const credential = await signInWithEmailAndPassword(auth, usernameToEmail(normalizeUsername(username)), password);
        return credential.user;
    } catch (error) {
        console.error("Firebase auth error (loginUser):", error.code, error.message);
        throw new Error("Неверный логин или пароль");
    }
}


export async function loginAdmin(email, password) {
    let credential;
    try {
        credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (error) {
        console.error("Firebase auth error (loginAdmin):", error.code, error.message);
        throw new Error(`Неверный email или пароль (${error.code})`);
    }

    const isAdmin = await checkIsAdmin(credential.user.uid);
    if (!isAdmin) {
        await signOut(auth);
        throw new Error("У этого аккаунта нет прав администратора");
    }

    return credential.user;
}

export async function checkIsAdmin(uid) {
    const adminDoc = await getDoc(doc(db, "admins", uid));
    return adminDoc.exists();
}

export function logout() {
    return signOut(auth);
}

export function watchAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}
