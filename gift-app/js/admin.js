import { collection,
    onSnapshot,
    doc,
    deleteDoc,
    addDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./config.js";
import { watchAuthState, checkIsAdmin, logout, createUserAsAdmin } from "./auth.js";

const usersCol = collection(db, "users");
const groupsCol = collection(db, "groups");

const usersListEl = document.getElementById('usersList');
const groupsListEl = document.getElementById('groupsList');
const groupCheckboxesEl = document.getElementById('userGroupCheckboxes');
const friendCheckboxesEl = document.getElementById('userFriendCheckboxes');
const userSearchEl = document.getElementById('userSearch');
const groupSearchEl = document.getElementById('groupSearch');

let users = [];
let groups = [];
const expandedGroups = new Set();

function startAdminData() {
    onSnapshot(usersCol, (snapshot) => {
        users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        document.getElementById('statUsers').textContent = users.length;
        renderUsers();
        renderGroups();
    });

    onSnapshot(groupsCol, (snapshot) => {
        groups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        document.getElementById('statGroups').textContent = groups.length;
        renderGroups();
        renderGroupCheckboxes();
    });
}


userSearchEl.addEventListener('input', renderUsers);
groupSearchEl.addEventListener('input', renderGroups);

function renderUsers() {
    const query = userSearchEl.value.trim().toLowerCase();
    const filtered = query ? users.filter((u) =>
            (u.name || '').toLowerCase().includes(query) ||
            (u.groups || []).some((g) => g.toLowerCase().includes(query)))
        : users;

    if (filtered.length === 0) {
        usersListEl.innerHTML = `<tr><td colspan="5" class="admin-empty">${users.length === 0 ? 'Пользователей пока нет.' : 'Ничего не найдено.'}</td></tr>`;
        return;
    }

    usersListEl.innerHTML = filtered.map((user) => `
        <tr>
            <td>${escapeHtml(user.name || '—')}</td>
            <td>${escapeHtml(user.birthday || '—')}</td>
            <td>${renderChipList(user.groups)}</td>
            <td>${renderChipList(user.gifts)}</td>
            <td>${renderFriendsChipList(user.friends)}</td>
            <td>
                <div class="row-actions">
                    <button data-id="${user.id}" class="edit-user btn btn-secondary btn-sm">Изменить</button>
                    <button data-id="${user.id}" class="delete-user btn-danger">Удалить</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderChipList(items) {
    const clean = (items || []).filter(Boolean);
    if (clean.length === 0) return '<span class="chip-muted">—</span>';
    return `<div class="chip-list">${clean.map((i) => `<span class="chip">${escapeHtml(i)}</span>`).join('')}</div>`;
}

function renderFriendsChipList(friendIds) {
    const clean = (friendIds || []).filter(Boolean);
    if (clean.length === 0) return '<span class="chip-muted">—</span>';
    const names = clean.map((id) => users.find((u) => u.id === id)?.name || '(удалён)');
    return `<div class="chip-list">${names.map((n) => `<span class="chip">${escapeHtml(n)}</span>`).join('')}</div>`;
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
    showToast("Пользователь удалён");
}


const userModal = document.getElementById('userModal');
const userForm = document.getElementById('userForm');

function renderGroupCheckboxes(selected = []) {
    if (groups.length === 0) {
        groupCheckboxesEl.innerHTML = "<p class='field-hint'>Сначала создайте группу во вкладке «Группы».</p>";
        return;
    }
    groupCheckboxesEl.innerHTML = groups.map((g) => `
        <button type="button" class="chip-toggle ${selected.includes(g.name) ? 'is-selected' : ''}" data-value="${escapeHtml(g.name)}">
            ${escapeHtml(g.name)}
        </button>
    `).join('');
}

groupCheckboxesEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-toggle');
    if (chip) chip.classList.toggle('is-selected');
});


function renderFriendCheckboxes(selected = [], excludeUserId = null) {
    const candidates = users.filter((u) => u.id !== excludeUserId);
    if (candidates.length === 0) {
        friendCheckboxesEl.innerHTML = "<p class='field-hint'>Пока некого выбрать — сначала добавьте других пользователей.</p>";
        return;
    }
    friendCheckboxesEl.innerHTML = candidates.map((u) => `
        <button type="button" class="chip-toggle ${selected.includes(u.id) ? 'is-selected' : ''}" data-value="${u.id}">
            ${escapeHtml(u.name || '—')}
        </button>
    `).join('');
}

friendCheckboxesEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-toggle');
    if (chip) chip.classList.toggle('is-selected');
});

window.openUserModal = function openUserModal(userId = null) {
    const user = userId ? users.find((u) => u.id === userId) : null;

    userForm.reset();
    userForm.dataset.editingId = userId || "";
    document.getElementById('userModalTitle').textContent = user ? `Редактировать: ${user.name}` : "Новый пользователь";
    document.getElementById('userName').value = user?.name || "";
    document.getElementById('userBirthday').value = user?.birthday || "";
    document.getElementById('userGifts').value = (user?.gifts || []).join('\n');

    renderGroupCheckboxes(user?.groups || []);
    renderFriendCheckboxes(user?.friends || [], userId);

    const credentialsFields = document.getElementById('userCredentialsFields');
    credentialsFields.style.display = user ? 'none' : '';
    document.getElementById('userUsername').value = '';
    document.getElementById('userPassword').value = '';

    userModal.classList.remove('hidden');
};

window.closeUserModal = function closeUserModal() {
    userModal.classList.add('hidden');
};

userModal.addEventListener('click', (e) => {
    if (e.target === userModal) closeUserModal();
});

userForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('userName').value.trim();
    const birthday = document.getElementById('userBirthday').value;
    const gifts = document.getElementById('userGifts').value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    const selectedGroups = [...groupCheckboxesEl.querySelectorAll('.chip-toggle.is-selected')].map((c) => c.dataset.value);
    const selectedFriends = [...friendCheckboxesEl.querySelectorAll('.chip-toggle.is-selected')].map((c) => c.dataset.value);

    if (!name || !birthday) {
        showToast("Заполните имя и дату рождения.", true);
        return;
    }

    const payload = { name, birthday, gifts, groups: selectedGroups, friends: selectedFriends };
    const editingId = userForm.dataset.editingId;

    if (editingId) {
        await updateDoc(doc(db, "users", editingId), payload);
        showToast("Изменения сохранены");
    } else {
        const username = document.getElementById('userUsername').value.trim();
        const password = document.getElementById('userPassword').value;

        if (!username || !password) {
            showToast("Укажите логин и пароль для нового пользователя.", true);
            return;
        }

        try {
            await createUserAsAdmin({ username, password, ...payload });
            showToast(`Пользователь добавлен. Логин: ${username}, пароль: ${password}`);
        } catch (error) {
            showToast(error.message, true);
            return;
        }
    }

    closeUserModal();
});


function renderGroups() {
    const query = groupSearchEl.value.trim().toLowerCase();
    const filtered = query ? groups.filter((g) => g.name.toLowerCase().includes(query)) : groups;

    if (filtered.length === 0) {
        groupsListEl.innerHTML = `<div class="admin-empty">${groups.length === 0 ? 'Групп пока нет.' : 'Ничего не найдено.'}</div>`;
        return;
    }

    groupsListEl.innerHTML = filtered.map((g) => {
        const members = users.filter((u) => (u.groups || []).includes(g.name));
        const nonMembers = users.filter((u) => !(u.groups || []).includes(g.name));
        const isExpanded = expandedGroups.has(g.id);

        return `
            <div class="group-card ${isExpanded ? 'is-expanded' : ''}" data-group-id="${g.id}">
                <div class="group-card__header" data-toggle-group="${g.id}">
                    <div class="group-card__title">
                        ${escapeHtml(g.name)}
                        <span class="group-card__count">${members.length}</span>
                    </div>
                    <div class="group-card__right">
                        <button data-id="${g.id}" class="delete-group btn-danger">Удалить</button>
                        <span class="group-card__chevron">▾</span>
                    </div>
                </div>
                <div class="group-card__body">
                    <div class="member-list">
                        ${members.length === 0
                            ? '<span class="chip-muted">В группе пока никого нет.</span>'
                            : members.map((u) => `
                                <span class="member-chip">
                                    ${escapeHtml(u.name)}
                                    <button type="button" class="member-chip__remove remove-member" data-user-id="${u.id}" data-group-name="${escapeHtml(g.name)}" title="Убрать из группы">×</button>
                                </span>
                            `).join('')}
                    </div>
                    ${nonMembers.length > 0 ? `
                        <form class="add-member-row add-member-form" data-group-name="${escapeHtml(g.name)}">
                            <select>
                                ${nonMembers.map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}
                            </select>
                            <button type="submit" class="btn btn-primary btn-sm">Добавить</button>
                        </form>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

groupsListEl.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-group');
    const removeBtn = e.target.closest('.remove-member');
    const toggleHeader = e.target.closest('[data-toggle-group]');

    if (deleteBtn) {
        deleteGroup(deleteBtn.dataset.id);
        return;
    }
    if (removeBtn) {
        removeMemberFromGroup(removeBtn.dataset.userId, removeBtn.dataset.groupName);
        return;
    }
    if (toggleHeader) {
        const groupId = toggleHeader.dataset.toggleGroup;
        if (expandedGroups.has(groupId)) {
            expandedGroups.delete(groupId);
        } else {
            expandedGroups.add(groupId);
        }
        renderGroups();
    }
});

groupsListEl.addEventListener('submit', (e) => {
    const form = e.target.closest('.add-member-form');
    if (!form) return;
    e.preventDefault();
    const userId = form.querySelector('select').value;
    addMemberToGroup(userId, form.dataset.groupName);
});

async function addMemberToGroup(userId, groupName) {
    await updateDoc(doc(db, "users", userId), { groups: arrayUnion(groupName) });
    showToast("Участник добавлен в группу");
}

async function removeMemberFromGroup(userId, groupName) {
    await updateDoc(doc(db, "users", userId), { groups: arrayRemove(groupName) });
    showToast("Участник убран из группы");
}

async function deleteGroup(groupId) {
    if (!confirm("Удалить группу? Она пропадёт из карточек пользователей только при следующем редактировании.")) return;
    await deleteDoc(doc(db, "groups", groupId));
    expandedGroups.delete(groupId);
    showToast("Группа удалена");
}

document.getElementById('groupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('groupName');
    const name = input.value.trim();
    if (!name) return;

    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
        showToast("Такая группа уже существует.", true);
        return;
    }

    await addDoc(groupsCol, { name });
    input.value = "";
    showToast("Группа создана");
});


window.importUsers = async function importUsers() {
    const jsonText = document.getElementById('jsonInput').value;
    let parsedUsers;

    try {
        parsedUsers = JSON.parse(jsonText);
        if (!Array.isArray(parsedUsers)) throw new Error("Ожидается массив пользователей");
    } catch (e) {
        showToast("Ошибка в JSON! Проверьте формат.", true);
        return;
    }

    const existingGroupNames = new Set(groups.map((g) => g.name));
    const newGroupNames = new Set();
    const failed = [];
    let successCount = 0;

    for (const user of parsedUsers) {
        const label = user.name || user.username || "(без имени)";

        if (!user.username || !user.password) {
            failed.push(`${label} — нет логина/пароля`);
            continue;
        }

        try {
            await createUserAsAdmin({
                username: user.username,
                password: user.password,
                name: user.name || "",
                birthday: user.birthday || "",
                gifts: Array.isArray(user.gifts) ? user.gifts : [],
                groups: Array.isArray(user.groups) ? user.groups : [],
                friends: [],
            });
            successCount++;
            (user.groups || []).forEach((g) => {
                if (!existingGroupNames.has(g)) newGroupNames.add(g);
            });
        } catch (error) {
            failed.push(`${label} — ${error.message}`);
        }
    }

    for (const name of newGroupNames) {
        await addDoc(groupsCol, { name });
    }

    const summary = failed.length === 0
        ? `Успешно добавлено пользователей: ${successCount}`
        : `Добавлено ${successCount} из ${parsedUsers.length}. Пропущены: ${failed.join('; ')}`;
    showToast(summary, failed.length > 0);
    document.getElementById('jsonInput').value = "";
};


document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('is-active'));
        document.querySelectorAll('.admin-panel').forEach((p) => p.classList.add('hidden'));
        tab.classList.add('is-active');
        document.getElementById(tab.dataset.target).classList.remove('hidden');
    });
});


const toastStack = document.getElementById('toastStack');

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : ''}`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


document.getElementById('adminLogoutBtn')?.addEventListener('click', async () => {
    await logout();
    window.location.href = 'login.html?as=admin';
});

watchAuthState(async (user) => {
    if (!user) {
        window.location.href = 'login.html?as=admin';
        return;
    }

    const isAdmin = await checkIsAdmin(user.uid);
    if (!isAdmin) {
        await logout();
        window.location.href = 'login.html?as=admin';
        return;
    }

    const emailEl = document.getElementById('adminEmailLabel');
    if (emailEl) emailEl.textContent = user.email;

    startAdminData();
});
