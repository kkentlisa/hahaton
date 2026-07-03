export let allUsers = [];
export let allGroups = [];
export let currentUser = null;
export let currentUserId = null;

export function setAllUsers(users) {
    allUsers = users;
}

export function setAllGroups(groups) {
    allGroups = groups;
}

export function setCurrentUser(user) {
    currentUser = user;
}

export function setCurrentUserId(id) {
    currentUserId = id;
}