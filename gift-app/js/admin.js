import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAe4ZXtxKH119CrCWBXM7ZjXDyiH5n3tjU",
    authDomain: "birthday-wishes-hits.firebaseapp.com",
    projectId: "birthday-wishes-hits",
    storageBucket: "birthday-wishes-hits.appspot.com",
    messagingSenderId: "650338158827",
    appId: "1:650338158827:web:0bd1caba97a65a2de1d6ae"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const usersListContainer = document.getElementById('usersList');

async function loadUsersForAdmin() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        usersListContainer.innerHTML = "";

        if (querySnapshot.empty) {
            usersListContainer.innerHTML = "<tr><td colspan='5' class='p-4 text-center'>Пользователей пока нет.</td></tr>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const userId = docSnap.id;

            const row = document.createElement('tr');
            row.className = "border-b hover:bg-gray-50";
            row.innerHTML = `
                <td class="p-3">${userData.name || '—'}</td>
                <td class="p-3">${userData.birthday || '—'}</td>
                <td class="p-3">${userData.groups?.join(', ') || '—'}</td>
                <td class="p-3">${userData.gifts?.join(', ') || '—'}</td>
                <td class="p-3">
                    <button onclick="window.deleteUser('${userId}')" class="text-red-500 hover:text-red-700 font-bold text-sm">Удалить</button>
                </td>
            `;
            usersListContainer.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        usersListContainer.innerHTML = "<tr><td colspan='5' class='p-4 text-red-500'>Ошибка загрузки</td></tr>";
    }
}

async function deleteUser(userId) {
    if (!confirm("Удалить пользователя из базы?")) return;
    await deleteDoc(doc(db, "users", userId));
    loadUsersForAdmin();
}

async function importUsers() {
    const jsonText = document.getElementById('jsonInput').value;
    try {
        const users = JSON.parse(jsonText);
        for (const user of users) {
            await addDoc(collection(db, "users"), user);
        }
        alert("Успешно добавлено!");
        document.getElementById('jsonInput').value = "";
        loadUsersForAdmin();
    } catch (e) {
        alert("Ошибка в JSON! Проверьте формат.");
    }
}

window.deleteUser = deleteUser;
window.importUsers = importUsers;
window.addEventListener('DOMContentLoaded', loadUsersForAdmin);