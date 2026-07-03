import { db } from "./config.js";
import { collection, onSnapshot, doc, updateDoc, addDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { watchAuthState, logout } from "./auth.js";
import { initFilters, renderGroupFilters, filterUsers, getEmptyStateText } from "./filters.js";

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

const usersCol = collection(db, "users");
const groupsCol = collection(db, "groups");

let allUsers = [];
let allGroups = [];
let currentUser = null;
let currentUserId = null;
let usersUnsubscribe = null;
let groupsUnsubscribe = null;

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await logout();
    window.location.href = "login.html";
});

initFilters(renderFriends);

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
    if (!myHeroContainer) return;

    const template = document.getElementById("my-profile-hero-template");
    const node = template.content.cloneNode(true);

    const initials = getInitials(currentUser.name);
    const dateStr = formatBirthDate(currentUser.birthday, true);

    node.querySelector(".js-avatar").textContent = initials;
    node.querySelector(".js-name").textContent = currentUser.name;
    node.querySelector(".js-date").textContent = dateStr;

    const groupsContainer = node.querySelector(".js-groups");
    (currentUser.groups || []).forEach(g => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = g;
        groupsContainer.appendChild(chip);
    });

    myHeroContainer.innerHTML = "";
    myHeroContainer.appendChild(node);

    if (window.lucide) window.lucide.createIcons();

    renderMyGroups();
    renderMyWishlist();
}

function renderMyGroups() {
    const container = document.getElementById("my-groups-container");
    if (!container) return;

    const template = document.getElementById("my-groups-template");
    const node = template.content.cloneNode(true);

    const groupsList = node.querySelector(".js-groups-list");
    const groupsAvailable = node.querySelector(".js-groups-available");

    const userGroups = currentUser.groups || [];
    const availableGroups = allGroups.filter(g => !userGroups.includes(g.name));

    if (userGroups.length === 0) {
        const emptyTemplate = document.getElementById("empty-chip-template");
        const emptyNode = emptyTemplate.content.cloneNode(true);
        emptyNode.querySelector(".js-empty-text").textContent = "Вы пока не состоите ни в одной группе";
        groupsList.appendChild(emptyNode);
    } else {
        const chipTemplate = document.getElementById("group-chip-template");
        userGroups.forEach(groupName => {
            const chipNode = chipTemplate.content.cloneNode(true);
            chipNode.querySelector(".js-group-name").textContent = groupName;
            const leaveBtn = chipNode.querySelector(".btn-group-leave");
            leaveBtn.dataset.group = groupName;
            groupsList.appendChild(chipNode);
        });
    }

    if (availableGroups.length > 0) {
        availableGroups.forEach(g => {
            const btn = document.createElement("button");
            btn.className = "btn-group-join btn btn-secondary btn-sm";
            btn.dataset.group = g.name;
            btn.textContent = `+ ${g.name}`;
            groupsAvailable.appendChild(btn);
        });
    }

    container.innerHTML = "";
    container.appendChild(node);

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

    const template = document.getElementById("my-wishlist-template");
    const node = template.content.cloneNode(true);

    const wishlistItems = node.querySelector(".js-wishlist-items");
    const gifts = currentUser.gifts || [];

    if (gifts.length === 0) {
        const emptyTemplate = document.getElementById("empty-chip-template");
        const emptyNode = emptyTemplate.content.cloneNode(true);
        emptyNode.querySelector(".js-empty-text").textContent = "Список подарков пуст";
        wishlistItems.appendChild(emptyNode);
    } else {
        const itemTemplate = document.getElementById("wishlist-item-template");
        gifts.forEach(giftName => {
            const itemNode = itemTemplate.content.cloneNode(true);
            itemNode.querySelector(".js-title").textContent = giftName;
            const removeBtn = itemNode.querySelector(".btn-gift-remove");
            removeBtn.dataset.gift = giftName;
            wishlistItems.appendChild(itemNode);
        });
    }

    container.innerHTML = "";
    container.appendChild(node);

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

function pluralizeGifts(count) {
    if (count === 1) return 'подарок';
    if (count > 1 && count < 5) return 'подарка';
    return 'подарков';
}

function renderFriends() {
    const friendsContainer = document.getElementById("friends-container");
    if (!friendsContainer) return;

    const currentUserFriends = currentUser?.friends || [];
    const filteredUsers = filterUsers(allUsers, currentUserId, currentUserFriends);

    friendsContainer.innerHTML = "";

    if (filteredUsers.length === 0) {
        const emptyTemplate = document.getElementById("empty-state-template");
        const emptyNode = emptyTemplate.content.cloneNode(true);
        emptyNode.querySelector(".empty-state__text").textContent = getEmptyStateText();
        friendsContainer.appendChild(emptyNode);
        return;
    }

    const cardTemplate = document.getElementById("friend-card-template");

    filteredUsers.forEach(user => {
        const days = getDaysToBirthday(user.birthday);
        const daysText = formatDaysText(days);
        const initials = getInitials(user.name);
        const dateStr = formatBirthDate(user.birthday);
        const giftsCount = user.gifts ? user.gifts.length : 0;
        const isFriend = currentUserFriends.includes(user.id);

        const node = cardTemplate.content.cloneNode(true);
        const card = node.querySelector(".friend-card");
        card.href = `friend.html?id=${user.id}`;

        card.querySelector(".js-days").textContent = days;
        card.querySelector(".js-days-text").textContent = daysText;
        card.querySelector(".js-avatar").textContent = initials;
        card.querySelector(".js-name").textContent = user.name;
        card.querySelector(".js-date").textContent = dateStr;
        card.querySelector(".js-gifts-count").textContent = `${giftsCount} ${pluralizeGifts(giftsCount)}`;
        card.querySelector(".js-friend-badge").hidden = !isFriend;

        const groupsContainer = card.querySelector(".js-groups");
        (user.groups || []).forEach(g => {
            const chip = document.createElement("span");
            chip.className = "chip";
            chip.textContent = g;
            groupsContainer.appendChild(chip);
        });

        friendsContainer.appendChild(node);
    });

    if (window.lucide) window.lucide.createIcons();
}

function renderFriendProfile() {
    const friendProfileContainer = document.getElementById("friend-profile-content");
    if (!friendProfileContainer) return;

    const params = new URLSearchParams(location.search);
    const friendId = params.get("id");
    const friend = allUsers.find(u => u.id === friendId);

    friendProfileContainer.innerHTML = "";

    if (!friend) {
        const notFoundTemplate = document.getElementById("friend-not-found-template");
        friendProfileContainer.appendChild(notFoundTemplate.content.cloneNode(true));
        return;
    }

    const days = getDaysToBirthday(friend.birthday);
    const daysText = formatDaysText(days);
    const initials = getInitials(friend.name);
    const dateStr = formatBirthDate(friend.birthday, true);
    const isFriend = currentUser?.friends?.includes(friendId) || false;

    const profileTemplate = document.getElementById("friend-profile-template");
    const node = profileTemplate.content.cloneNode(true);

    node.querySelector(".js-days").textContent = days;
    node.querySelector(".js-days-text").textContent = daysText;
    node.querySelector(".js-avatar").textContent = initials;
    node.querySelector(".js-name").textContent = friend.name;
    node.querySelector(".js-date").textContent = dateStr;

    const groupsContainer = node.querySelector(".js-groups");
    (friend.groups || []).forEach(g => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = g;
        groupsContainer.appendChild(chip);
    });

    const toggleBtn = node.querySelector(".js-friend-toggle-btn");
    toggleBtn.classList.add(isFriend ? "btn-secondary" : "btn-primary");
    toggleBtn.querySelector(".js-friend-toggle-text").textContent = isFriend ? "✕ Удалить из друзей" : "Добавить в друзья";
    toggleBtn.addEventListener("click", () => window.toggleFriend(friendId));

    const calendarBtn = node.querySelector(".js-calendar-btn");
    calendarBtn.hidden = !isFriend;
    calendarBtn.addEventListener("click", () => {
        if (window.addToGoogleCalendar) {
            window.addToGoogleCalendar(friendId);
        } else {
            console.error("Функция addToGoogleCalendar не найдена");
        }
    });

    const wishlistContainer = node.querySelector(".js-wishlist");
    const gifts = friend.gifts || [];
    if (gifts.length === 0) {
        const emptyText = document.createElement("p");
        emptyText.className = "field-hint";
        emptyText.textContent = "Список подарков пока пуст";
        wishlistContainer.appendChild(emptyText);
    } else {
        const itemTemplate = document.getElementById("wishlist-item-template");
        gifts.forEach(giftName => {
            const itemNode = itemTemplate.content.cloneNode(true);
            itemNode.querySelector(".js-title").textContent = giftName;
            wishlistContainer.appendChild(itemNode);
        });
    }

    friendProfileContainer.appendChild(node);
    if (window.lucide) window.lucide.createIcons();
    document.title = `${friend.name} — BdayHub`;
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
            renderGroupFilters(allGroups);
            window.dispatchEvent(new CustomEvent("user-data-updated"));
        }

        renderFriendProfile();
    });

    groupsUnsubscribe = onSnapshot(groupsCol, (snapshot) => {
        allGroups = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        if (currentUser) {
            renderMyGroups();
            renderGroupFilters(allGroups);
        }
    });
});