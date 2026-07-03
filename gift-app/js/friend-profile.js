import { db } from "./config.js";
import { doc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDaysToBirthday, formatDaysText, getInitials, formatBirthDate } from "./format.js";
import { allUsers, currentUser, currentUserId } from "./state.js";

export function renderFriendProfile() {
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