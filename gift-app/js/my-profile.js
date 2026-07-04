import { db } from "./config.js";
import { collection, doc, updateDoc, addDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getInitials, formatBirthDate } from "./format.js";
import { allUsers, allGroups, currentUser, currentUserId } from "./state.js";

const groupsCol = collection(db, "groups");

export async function updateGroupFriends() {
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

export function renderMyProfile() {
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

    const avatarContainer = node.querySelector(".js-avatar");
    const uploadBtn = node.querySelector(".js-avatar-upload");
    const fileInput = node.querySelector(".js-avatar-input");
    const deleteBtn = node.querySelector(".js-avatar-delete");

    const cropModal = node.querySelector(".js-crop-modal");
    const imageToCrop = node.querySelector(".js-image-to-crop");
    const cancelCropBtn = node.querySelector(".js-cancel-crop");
    const saveCropBtn = node.querySelector(".js-save-crop");

    const viewModal = node.querySelector(".js-view-modal");
    const imageToView = node.querySelector(".js-image-to-view");
    const closeViewBtn = node.querySelector(".js-close-view");

    let cropperInstance = null;

    if (currentUser.avatar) {
        avatarContainer.innerHTML = `<img src="${currentUser.avatar}" alt="Аватар">`;
        deleteBtn.hidden = false;
    } else {
        avatarContainer.textContent = initials;
        deleteBtn.hidden = true;
    }

    uploadBtn.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const maxFileSize = 5 * 1024 * 1024;
        if (file.size > maxFileSize) {
            alert("Файл слишком большой. Пожалуйста, выберите фото размером до 5 МБ.");
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        imageToCrop.src = objectUrl;
        cropModal.hidden = false;

        if (cropperInstance) {
            cropperInstance.destroy();
        }

        setTimeout(() => {
            cropperInstance = new window.Cropper(imageToCrop, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move'
            });
        }, 50);

        fileInput.value = "";
    });

    cancelCropBtn.addEventListener("click", () => {
        cropModal.hidden = true;
        if (cropperInstance) cropperInstance.destroy();
    });

    saveCropBtn.addEventListener("click", async () => {
        if (!cropperInstance) return;

        const croppedCanvas = cropperInstance.getCroppedCanvas({
            width: 400,
            height: 400
        });

        const base64String = croppedCanvas.toDataURL("image/jpeg", 0.8);

        await updateDoc(doc(db, "users", currentUserId), {
            avatar: base64String
        });

        cropModal.hidden = true;
        cropperInstance.destroy();

        avatarContainer.innerHTML = `<img src="${base64String}" alt="Аватар">`;
        deleteBtn.hidden = false;
    });

    avatarContainer.addEventListener("click", (e) => {
        if (e.target.tagName === "IMG") {
            imageToView.src = e.target.src;
            viewModal.hidden = false;
        }
    });

    closeViewBtn.addEventListener("click", () => {
        viewModal.hidden = true;
    });

    viewModal.addEventListener("click", (e) => {
        if (e.target === viewModal) {
            viewModal.hidden = true;
        }
    });

    deleteBtn.addEventListener("click", async () => {
        await updateDoc(doc(db, "users", currentUserId), {
            avatar: null
        });
    });

    myHeroContainer.innerHTML = "";
    myHeroContainer.appendChild(node);

    if (window.lucide) window.lucide.createIcons();

    renderMyGroups();
    renderMyWishlist();
}

export function renderMyGroups() {
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

export function renderMyWishlist() {
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