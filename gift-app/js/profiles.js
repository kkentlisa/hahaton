import { db } from "./config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

const usersCol = collection(db, "users");

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await logout();
    window.location.href = "login.html";
});

let usersUnsubscribe = null;

watchAuthState((authUser) => {
    if (!authUser) {
        window.location.href = "login.html";
        return;
    }
    if (usersUnsubscribe) return;

    usersUnsubscribe = onSnapshot(usersCol, (snapshot) => {
        const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const currentUser = users.find(u => u.id === authUser.uid)
            || { name: authUser.email, groups: [], gifts: [] };
        window.currentUser = currentUser;
        window.dispatchEvent(new Event("currentUser-ready"));

        const friendsContainer = document.getElementById("friends-container");
    if (friendsContainer) {
        friendsContainer.innerHTML = "";

        users.forEach(user => {
            const days = getDaysToBirthday(user.birthday);
            const daysText = formatDaysText(days);
            const initials = getInitials(user.name);
            const dateStr = formatBirthDate(user.birthday);
            const groupsHtml = (user.groups || []).map(g => `<span class="chip">${g}</span>`).join("");
            const giftsCount = user.gifts ? user.gifts.length : 0;

            const card = document.createElement("a");
            card.href = `friend.html?id=${user.id}`;
            card.className = "friend-card";
            card.innerHTML = `
                <div class="friend-card__banner">
                    <span class="friend-card__banner-countdown">
                        <strong>${days}</strong>
                        <span>${daysText}</span>
                    </span>
                </div>
                <div class="friend-card__avatar">${initials}</div>
                <div class="friend-card__body">
                    <div class="friend-card__name">${user.name}</div>
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

    const friendProfileContainer = document.getElementById("friend-profile-content");
    if (friendProfileContainer) {
        const params = new URLSearchParams(location.search);
        const friendId = params.get("id");
        const friend = users.find(u => u.id === friendId);

        if (friend) {
            const days = getDaysToBirthday(friend.birthday);
            const daysText = formatDaysText(days);
            const initials = getInitials(friend.name);
            const dateStr = formatBirthDate(friend.birthday, true);
            const groupsHtml = (friend.groups || []).map(g => `<span class="chip">${g}</span>`).join("");

            const wishlistHtml = (friend.gifts || []).map(giftName => `
                <div class="wishlist-item">
                    <div class="wishlist-item__icon">
                        <i data-lucide="gift" style="width:18px;"></i>
                    </div>
                    <span class="wishlist-item__title">${giftName}</span>
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
                            <h1 class="profile-hero__name">${friend.name}</h1>
                            <div class="profile-hero__meta">
                                <span><i data-lucide="calendar" style="width:16px; vertical-align:middle;"></i> ${dateStr}</span>
                            </div>
                            <div class="profile-hero__groups">${groupsHtml}</div>
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
            if (window.lucide) window.lucide.createIcons();
            document.title = `${friend.name} — BdayHub`;
        } else {
            friendProfileContainer.innerHTML = `<p class="page-title">Пользователь не найден</p>`;
        }
    }

    const myHeroContainer = document.getElementById("my-hero-container");
    if (myHeroContainer) {
        const initials = getInitials(currentUser.name);
        const dateStr = formatBirthDate(currentUser.birthday, true);
        const groupsHtml = (currentUser.groups || []).map(g => `<span class="chip">${g}</span>`).join("");

        myHeroContainer.innerHTML = `
            <section class="profile-hero">
                <div class="profile-hero__banner"></div>
                <div class="profile-hero__body">
                    <div class="profile-hero__avatar">${initials}</div>
                    <div class="profile-hero__info">
                        <h1 class="profile-hero__name">${currentUser.name}</h1>
                        <div class="profile-hero__date">
                            <i data-lucide="calendar" style="width:16px; vertical-align:middle;"></i> ${dateStr}
                        </div>
                        <div class="profile-hero__groups">${groupsHtml}</div>
                    </div>
                </div>
            </section>
        `;

        const myGiftsContainer = document.getElementById("my-wishlist-container");
        if (myGiftsContainer) {
            myGiftsContainer.innerHTML = (currentUser.gifts || []).map(giftName => `
                <div class="wishlist-item">
                    <div class="wishlist-item__icon">
                        <i data-lucide="gift" style="width:18px;"></i>
                    </div>
                    <span class="wishlist-item__title">${giftName}</span>
                </div>
            `).join("");
        }
        if (window.lucide) window.lucide.createIcons();
    }
    });
});