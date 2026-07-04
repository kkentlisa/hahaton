import { db } from "./config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { watchAuthState, logout } from "./auth.js";
import { initFilters, renderGroupFilters } from "./filters.js";
import { setAllUsers, setAllGroups, setCurrentUser, setCurrentUserId, currentUser, allGroups } from "./state.js";
import { renderMyProfile, renderMyGroups } from "./my-profile.js";
import { renderFriends } from "./friends-list.js";
import { renderFriendProfile } from "./friend-profile.js";

const usersCol = collection(db, "users");
const groupsCol = collection(db, "groups");

let usersUnsubscribe = null;
let groupsUnsubscribe = null;

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await logout();
    window.location.href = "login.html";
});

initFilters(renderFriends);

watchAuthState((authUser) => {
    if (!authUser) {
        window.location.href = "login.html";
        return;
    }

    setCurrentUserId(authUser.id);

    if (usersUnsubscribe) return;

    usersUnsubscribe = onSnapshot(usersCol, (snapshot) => {
        const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllUsers(users);
        const userData = users.find(u => u.id === authUser.uid);
        if (userData) {
            setCurrentUser(userData);
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
        const groups = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllGroups(groups);
        if (currentUser) {
            renderMyGroups();
            renderGroupFilters(groups);
        }
    });
});