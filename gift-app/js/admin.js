import {collection, onSnapshot, doc, deleteDoc, addDoc, updateDoc,} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./config.js";

const usersCol = collection(db, "users");
const groupsCol = collection(db, "groups");

const usersListEl = document.getElementById('usersList');
const groupsListEl = document.getElementById('groupsList');
const groupCheckboxesEl = document.getElementById('userGroupCheckboxes');

let users = [];
let groups = [];


onSnapshot(usersCol, (snapshot) => {
    users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderUsers();
});

onSnapshot(groupsCol, (snapshot) => {
    groups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderGroups();
    renderGroupCheckboxes();
});


function renderUsers() {
    if (users.length === 0) {
        usersListEl.innerHTML = "<tr><td colspan='5' class='p-4 text-center'>Пользователей пока нет.</td></tr>";
        return;
    }

    usersListEl.innerHTML = users.map((user) => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3">${escapeHtml(user.name || '—')}</td>
            <td class="p-3">${escapeHtml(user.birthday || '—')}</td>
            <td class="p-3">${(user.groups || []).map(escapeHtml).join(', ') || '—'}</td>
            <td class="p-3">${(user.gifts || []).map(escapeHtml).join(', ') || '—'}</td>
            <td class="p-3 whitespace-nowrap">
                <button data-id="${user.id}" class="edit-user text-blue-600 hover:text-blue-800 font-bold text-sm mr-3">Изменить</button>
                <button data-id="${user.id}" class="delete-user text-red-500 hover:text-red-700 font-bold text-sm">Удалить</button>
            </td>
        </tr>
    `).join('');
}

usersListEl.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-user');
    const deleteBtn = e.target.closest('.delete-user');
    if (editBtn) openUserModal(editBtn.dataset.id);
    if (deleteBtn) deleteUser(deleteBtn.dataset.id);
});

async function deleteUser(userId) {
    if (!confirm("Удалить пользователя из базы?")) return;
    await deleteDoc(doc(db, "users", userId));
}


const userModal = document.getElementById('userModal');
const userForm = document.getElementById('userForm');

function renderGroupCheckboxes(selected = []) {
    if (groups.length === 0) {
        groupCheckboxesEl.innerHTML = "<p class='text-sm text-gray-500'>Сначала создайте группу во вкладке «Группы».</p>";
        return;
    }
    groupCheckboxesEl.innerHTML = groups.map((g) => `
        <label class="inline-flex items-center mr-4 mb-2">
            <input type="checkbox" value="${escapeHtml(g.name)}" class="group-checkbox mr-1" ${selected.includes(g.name) ? 'checked' : ''}>
            ${escapeHtml(g.name)}
        </label>
    `).join('');
}

window.openUserModal = function openUserModal(userId = null) {
    const user = userId ? users.find((u) => u.id === userId) : null;

    userForm.reset();
    userForm.dataset.editingId = userId || "";
    document.getElementById('userModalTitle').textContent = user ? `Редактировать: ${user.name}` : "Новый пользователь";
    document.getElementById('userName').value = user?.name || "";
    document.getElementById('userBirthday').value = user?.birthday || "";
    document.getElementById('userGifts').value = (user?.gifts || []).join('\n');

    renderGroupCheckboxes(user?.groups || []);
    userModal.classList.remove('hidden');
};

window.closeUserModal = function closeUserModal() {
    userModal.classList.add('hidden');
};

userForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('userName').value.trim();
    const birthday = document.getElementById('userBirthday').value;
    const gifts = document.getElementById('userGifts').value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    const selectedGroups = [...document.querySelectorAll('.group-checkbox:checked')].map((cb) => cb.value);

    if (!name || !birthday) {
        alert("Заполните имя и дату рождения.");
        return;
    }

    const payload = { name, birthday, gifts, groups: selectedGroups };
    const editingId = userForm.dataset.editingId;

    if (editingId) {
        await updateDoc(doc(db, "users", editingId), payload);
    } else {
        await addDoc(usersCol, payload);
    }

    closeUserModal();
});


function renderGroups() {
    if (groups.length === 0) {
        groupsListEl.innerHTML = "<tr><td colspan='3' class='p-4 text-center'>Групп пока нет.</td></tr>";
        return;
    }

    groupsListEl.innerHTML = groups.map((g) => {
        const memberCount = users.filter((u) => (u.groups || []).includes(g.name)).length;
        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">${escapeHtml(g.name)}</td>
                <td class="p-3">${memberCount}</td>
                <td class="p-3">
                    <button data-id="${g.id}" class="delete-group text-red-500 hover:text-red-700 font-bold text-sm">Удалить</button>
                </td>
            </tr>
        `;
    }).join('');
}

groupsListEl.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-group');
    if (deleteBtn) deleteGroup(deleteBtn.dataset.id);
});

async function deleteGroup(groupId) {
    if (!confirm("Удалить группу? Она пропадёт из карточек пользователей только при следующем редактировании.")) return;
    await deleteDoc(doc(db, "groups", groupId));
}

document.getElementById('groupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('groupName');
    const name = input.value.trim();
    if (!name) return;

    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
        alert("Такая группа уже существует.");
        return;
    }

    await addDoc(groupsCol, { name });
    input.value = "";
});


window.importUsers = async function importUsers() {
    const jsonText = document.getElementById('jsonInput').value;
    let parsedUsers;

    try {
        parsedUsers = JSON.parse(jsonText);
        if (!Array.isArray(parsedUsers)) throw new Error("Ожидается массив пользователей");
    } catch (e) {
        alert("Ошибка в JSON! Проверьте формат.");
        return;
    }

    const existingGroupNames = new Set(groups.map((g) => g.name));
    const newGroupNames = new Set();

    for (const user of parsedUsers) {
        await addDoc(usersCol, {
            name: user.name || "",
            birthday: user.birthday || "",
            gifts: Array.isArray(user.gifts) ? user.gifts : [],
            groups: Array.isArray(user.groups) ? user.groups : [],
        });
        (user.groups || []).forEach((g) => {
            if (!existingGroupNames.has(g)) newGroupNames.add(g);
        });
    }

    for (const name of newGroupNames) {
        await addDoc(groupsCol, { name });
    }

    alert(`Успешно добавлено пользователей: ${parsedUsers.length}`);
    document.getElementById('jsonInput').value = "";
};


document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('admin-tab-active'));
        document.querySelectorAll('.admin-panel').forEach((p) => p.classList.add('hidden'));
        tab.classList.add('admin-tab-active');
        document.getElementById(tab.dataset.target).classList.remove('hidden');
    });
});

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
