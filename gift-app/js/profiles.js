import { db } from "./config.js";
import { collection, onSnapshot, doc, updateDoc, addDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { watchAuthState, logout } from "./auth.js";

function getDaysToBirthday(dateString) {
    if (!dateString) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthDate = new Date(dateString);
    let nextBday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBday < today) {
        nextBday.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = nextBday - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDaysText(days) {
    const lastDigit = days % 10;
    const lastTwoDigits = days % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return "дней";
    if (lastDigit === 1) return "день";
    if (lastDigit >= 2 && lastDigit <= 4) return "дня";
    return "дней";
}

function getInitials(name) {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
}

function formatBirthDate(dateString, includeYear = false) {
    if (!dateString) return "";
    const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    const d = new Date(dateString);
    const day = d.getDate();
    const month = months[d.getMonth()];
    if (includeYear) {
        return `${day} ${month} ${d.getFullYear()} года`;
    }
    return `${day} ${month}`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const usersCol = collection(db, "users");
const groupsCol = collection(db, "groups");

let allUsers = [];
let allGroups = [];
let currentUser = null;
let currentUserId = null;
let usersUnsubscribe = null;
let groupsUnsubscribe = null;
let currentFilter = 'all';

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await logout();
    window.location.href = "login.html";
});

async function updateGroupFriends() {
    if (!currentUserId || !currentUser) return;

    const userGroups = currentUser.groups || [];
    const allGroupUsers = new Set();

    for (const groupName of userGroups) {
        allUsers.forEach(u => {
            if (u.id !== currentUserId && (u.groups || []).includes(groupName)) {
                allGroupUsers.add(u.id);
            }
        });
    }

    const currentFriends = new Set(currentUser.friends || []);
    const toAdd = [...allGroupUsers].filter(id => !currentFriends.has(id));
    const toRemove = [...currentFriends].filter(id => {
        const user = allUsers.find(u => u.id === id);
        if (!user) return true;
        return !allGroupUsers.has(id);
    });

    for (const id of toAdd) {
        await updateDoc(doc(db, "users", currentUserId), {
            friends: arrayUnion(id)
        });
    }

    for (const id of toRemove) {
        await updateDoc(doc(db, "users", currentUserId), {
            friends: arrayRemove(id)
        });
    }
}

function renderMyProfile() {
    if (!currentUser) return;

    const myHeroContainer = document.getElementById("my-hero-container");
    if (myHeroContainer) {
        const initials = getInitials(currentUser.name);
        const dateStr = formatBirthDate(currentUser.birthday, true);
        const groupsHtml = (currentUser.groups || []).map(g => `<span class="chip">${escapeHtml(g)}</span>`).join("");

        myHeroContainer.innerHTML = `
            <section class="profile-hero">
                <div class="profile-hero__banner"></div>
                <div class="profile-hero__body">
                    <div class="profile-hero__avatar">${initials}</div>
                    <div class="profile-hero__info">
                        <h1 class="profile-hero__name">${escapeHtml(currentUser.name)}</h1>
                        <div class="profile-hero__date">
                            <i data-lucide="calendar" style="width:16px; vertical-align:middle;"></i> ${dateStr}
                        </div>
                        <div class="profile-hero__groups">${groupsHtml}</div>
                    </div>
                </div>
            </section>
        `;
        if (window.lucide) window.lucide.createIcons();
    }

    renderMyGroups();
    renderMyWishlist();
}

function renderMyGroups() {
    const container = document.getElementById("my-groups-container");
    if (!container) return;

    const userGroups = currentUser.groups || [];
    const availableGroups = allGroups.filter(g => !userGroups.includes(g.name));

    container.innerHTML = `
        <div class="groups-list">
            ${userGroups.length === 0 ? '<span class="chip-muted">Вы пока не состоите ни в одной группе</span>' :
        userGroups.map(g => `
                <div class="group-chip">
                    <span>${escapeHtml(g)}</span>
                    <button class="btn-group-leave" data-group="${escapeHtml(g)}" title="Выйти из группы">×</button>
                </div>
            `).join('')}
        </div>
        ${availableGroups.length > 0 ? `
            <div class="groups-available">
                ${availableGroups.map(g => `
                    <button class="btn-group-join btn btn-secondary btn-sm" data-group="${escapeHtml(g.name)}">+ ${escapeHtml(g.name)}</button>
                `).join('')}
            </div>
        ` : ''}
        <div class="groups-create">
            <form id="groupCreateForm" class="inline-form">
                <input type="text" id="groupCreateInput" placeholder="Название новой группы" class="input-field" required>
                <button type="submit" class="btn btn-primary btn-sm">Создать группу</button>
            </form>
        </div>
    `;

    container.querySelectorAll('.btn-group-join').forEach(btn => {
        btn.addEventListener('click', async () => {
            const groupName = btn.dataset.group;
            await updateDoc(doc(db, "users", currentUserId), {
                groups: arrayUnion(groupName)
            });
            await updateGroupFriends();
        });
    });

    container.querySelectorAll('.btn-group-leave').forEach(btn => {
        btn.addEventListener('click', async () => {
            const groupName = btn.dataset.group;
            await updateDoc(doc(db, "users", currentUserId), {
                groups: arrayRemove(groupName)
            });
            await updateGroupFriends();
        });
    });

    const createForm = container.querySelector('#groupCreateForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('groupCreateInput');
            const name = input.value.trim();
            if (!name) return;
            if (allGroups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
                return;
            }
            await addDoc(groupsCol, { name });
            input.value = "";
        });
    }
}

function renderMyWishlist() {
    const container = document.getElementById("my-wishlist-container");
    if (!container) return;

    const gifts = currentUser.gifts || [];

    container.innerHTML = `
        <div class="wishlist-items">
            ${gifts.length === 0 ? '<span class="chip-muted">Список подарков пуст</span>' :
        gifts.map(g => `
                <div class="wishlist-item">
                    <div class="wishlist-item__icon">
                        <i data-lucide="gift" style="width:18px;"></i>
                    </div>
                    <span class="wishlist-item__title">${escapeHtml(g)}</span>
                    <button class="btn-gift-remove" data-gift="${escapeHtml(g)}" title="Удалить">×</button>
                </div>
            `).join('')}
        </div>
        <div class="gift-add">
            <form id="giftAddForm" class="inline-form">
                <input type="text" id="giftAddInput" placeholder="Название подарка" class="input-field" required>
                <button type="submit" class="btn btn-primary btn-sm">Добавить подарок</button>
            </form>
        </div>
    `;

    container.querySelectorAll('.btn-gift-remove').forEach(btn => {
        btn.addEventListener('click', async () => {
            const giftName = btn.dataset.gift;
            await updateDoc(doc(db, "users", currentUserId), {
                gifts: arrayRemove(giftName)
            });
        });
    });

    const addForm = container.querySelector('#giftAddForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('giftAddInput');
            const name = input.value.trim();
            if (!name) return;
            await updateDoc(doc(db, "users", currentUserId), {
                gifts: arrayUnion(name)
            });
            input.value = "";
        });
    }

    if (window.lucide) window.lucide.createIcons();
}

function renderFriends() {
    const friendsContainer = document.getElementById("friends-container");
    if (!friendsContainer) return;

    const currentUserFriends = currentUser?.friends || [];
    let filteredUsers = [];

    if (currentFilter === 'friends') {
        filteredUsers = allUsers.filter(user =>
            user.id !== currentUserId && currentUserFriends.includes(user.id)
        );
    } else {
        filteredUsers = allUsers.filter(user => user.id !== currentUserId);
    }

    if (filteredUsers.length === 0) {
        friendsContainer.innerHTML = `
            <div class="empty-state">
                <p class="empty-state__text">${currentFilter === 'friends' ? 'У вас пока нет друзей' : 'Пользователей пока нет'}</p>
            </div>
        `;
        return;
    }

    friendsContainer.innerHTML = "";
    filteredUsers.forEach(user => {
        const days = getDaysToBirthday(user.birthday);
        const daysText = formatDaysText(days);
        const initials = getInitials(user.name);
        const dateStr = formatBirthDate(user.birthday);
        const groupsHtml = (user.groups || []).map(g => `<span class="chip">${escapeHtml(g)}</span>`).join("");
        const giftsCount = user.gifts ? user.gifts.length : 0;
        const isFriend = currentUserFriends.includes(user.id);

        const card = document.createElement("a");
        card.href = `friend.html?id=${user.id}`;
        card.className = "friend-card";
        card.innerHTML = `
            <div class="friend-card__banner">
                <span class="friend-card__banner-countdown">
                    <strong>${days}</strong>
                    <span>${daysText}</span>
                </span>
                ${isFriend ? '<span class="friend-badge">👥 В друзьях</span>' : ''}
            </div>
            <div class="friend-card__avatar">${initials}</div>
            <div class="friend-card__body">
                <div class="friend-card__name">${escapeHtml(user.name)}</div>
                <div class="friend-card__date">${dateStr}</div>
                <div class="friend-card__groups">${groupsHtml}</div>
                <div class="wishlist-count">
                    <i data-lucide="gift" style="width:14px;"></i>
                    ${giftsCount} ${giftsCount === 1 ? 'подарок' : giftsCount > 1 && giftsCount < 5 ? 'подарка' : 'подарков'}
                </div>
            </div>
        `;
        friendsContainer.appendChild(card);
    });
    if (window.lucide) window.lucide.createIcons();
}

function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            currentFilter = btn.dataset.filter;
            renderFriends();
        });
    });
}

window.toggleFriend = async function(userId) {
    if (!currentUserId || !currentUser) return;
    const isFriend = (currentUser.friends || []).includes(userId);
    if (isFriend) {
        await updateDoc(doc(db, "users", currentUserId), {
            friends: arrayRemove(userId)
        });
    } else {
        await updateDoc(doc(db, "users", currentUserId), {
            friends: arrayUnion(userId)
        });
    }
};

watchAuthState((authUser) => {
    if (!authUser) {
        window.location.href = "login.html";
        return;
    }

    currentUserId = authUser.uid;

    if (usersUnsubscribe) return;

    usersUnsubscribe = onSnapshot(usersCol, (snapshot) => {
        allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const userData = allUsers.find(u => u.id === authUser.uid);
        if (userData) {
            currentUser = userData;
            window.currentUser = userData;
            window.dispatchEvent(new CustomEvent("currentUser-ready"));
            renderMyProfile();
            renderFriends();
            initFilters();
            window.dispatchEvent(new CustomEvent("user-data-updated"));
        }

        const friendProfileContainer = document.getElementById("friend-profile-content");
        if (friendProfileContainer) {
            const params = new URLSearchParams(location.search);
            const friendId = params.get("id");
            const friend = allUsers.find(u => u.id === friendId);

            if (friend) {
                const days = getDaysToBirthday(friend.birthday);
                const daysText = formatDaysText(days);
                const initials = getInitials(friend.name);
                const dateStr = formatBirthDate(friend.birthday, true);
                const groupsHtml = (friend.groups || []).map(g => `<span class="chip">${escapeHtml(g)}</span>`).join("");
                const isFriend = currentUser?.friends?.includes(friendId) || false;

                const wishlistHtml = (friend.gifts || []).map(giftName => `
                    <div class="wishlist-item">
                        <div class="wishlist-item__icon">
                            <i data-lucide="gift" style="width:18px;"></i>
                        </div>
                        <span class="wishlist-item__title">${escapeHtml(giftName)}</span>
                    </div>
                `).join("");

                friendProfileContainer.innerHTML = `
                    <section class="profile-hero">
                        <div class="profile-hero__banner">
                            <div class="profile-hero__countdown">
                                <div class="profile-hero__countdown-number">${days}</div>
                                <div class="profile-hero__countdown-label">${daysText} до ДР</div>
                            </div>
                        </div>
                        <div class="profile-hero__body">
                            <div class="profile-hero__avatar">${initials}</div>
                            <div class="profile-hero__info">
                                <h1 class="profile-hero__name">${escapeHtml(friend.name)}</h1>
                                <div class="profile-hero__meta">
                                    <span><i data-lucide="calendar" style="width:16px; vertical-align:middle;"></i> ${dateStr}</span>
                                </div>
                                <div class="profile-hero__groups">${groupsHtml}</div>
                                <div style="margin-top:12px;">
                                    <button class="btn ${isFriend ? 'btn-secondary' : 'btn-primary'}" id="friendToggleBtn" data-friend-id="${friendId}">
                                        ${isFriend ? '✕ Удалить из друзей' : 'Добавить в друзья'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section>
                        <h2 class="section-title">Список подарков</h2>
                        <div class="wishlist">
                            ${wishlistHtml || '<p class="field-hint">Список подарков пока пуст</p>'}
                        </div>
                    </section>
                `;

                const toggleBtn = document.getElementById('friendToggleBtn');
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', async () => {
                        const friendId = toggleBtn.dataset.friendId;
                        await window.toggleFriend(friendId);
                    });
                }

                if (window.lucide) window.lucide.createIcons();
                document.title = `${friend.name} — BdayHub`;
            } else {
                friendProfileContainer.innerHTML = `<p class="page-title">Пользователь не найден</p>`;
            }
        }
    });

    groupsUnsubscribe = onSnapshot(groupsCol, (snapshot) => {
        allGroups = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (currentUser) renderMyGroups();
    });
});