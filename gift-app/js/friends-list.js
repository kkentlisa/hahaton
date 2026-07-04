import { filterUsers, getEmptyStateText } from "./filters.js";
import { getDaysToBirthday, formatDaysText, getInitials, formatBirthDate, pluralizeGifts } from "./format.js";
import { allUsers, currentUser, currentUserId } from "./state.js";

export function renderFriends() {
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

        const avatarContainer = node.querySelector(".js-avatar");

        if (user.avatar) {
            avatarContainer.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
        } else {
            avatarContainer.textContent = getInitials(user.name);
        }

        card.querySelector(".js-days").textContent = days;
        card.querySelector(".js-days-text").textContent = daysText;
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