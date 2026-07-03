document.addEventListener("DOMContentLoaded", () => {
    function getDaysToBirthday(dateString) {
        const today = new Date();
        today.setHours(0,0,0,0);
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
        return name.split(" ").map(n => n[0]).join("").toUpperCase();
    }

    const friendsContainer = document.getElementById("friends-container");
    if (friendsContainer) {
        // Рендерим только друзей (исключая текущего пользователя)
        const friends = mockUsers.filter(u => u.id !== "current_user");

        friends.forEach(user => {
            const days = getDaysToBirthday(user.birthDate);
            const card = document.createElement("a");
            card.href = `friend.html?id=${user.id}`;
            card.className = "friend-card";

            card.innerHTML = `
                <div class="friend-card__banner">
                    <span class="friend-card__banner-countdown">
                        <strong>${days}</strong>
                        <span>${formatDaysText(days)}</span>
                    </span>
                </div>
                <div class="friend-card__avatar">${getInitials(user.name)}</div>
                <div class="friend-card__body">
                    <div class="friend-card__name">${user.name}</div>
                    <div class="friend-card__date">${new Date(user.birthDate).toLocaleString('ru', {day:'numeric', month:'long'})}</div>
                    <div class="friend-card__groups">
                        ${user.groups.map(g => `<span class="chip">${g}</span>`).join("")}
                    </div>
                    <div class="wishlist-count">
                        <i data-lucide="gift" style="width:14px;"></i>
                        ${user.wishlist.length} ${user.wishlist.length === 1 ? 'подарок' : user.wishlist.length < 5 ? 'подарка' : 'подарков'}
                    </div>
                </div>
            `;
            friendsContainer.appendChild(card);
        });
        if (window.lucide) lucide.createIcons();
    }

    const friendProfileContent = document.getElementById("friend-profile-content");
    if (friendProfileContent) {
        const params = new URLSearchParams(window.location.search);
        const friendId = params.get("id") || "u1"; // Дефолт u1 если зашли просто так
        const user = mockUsers.find(u => u.id === friendId);

        if (user) {
            const days = getDaysToBirthday(user.birthDate);
            friendProfileContent.innerHTML = `
                <section class="profile-hero">
                    <div class="profile-hero__banner">
                        <div>
                            <div class="profile-hero__countdown-number">${days}</div>
                            <div class="profile-hero__countdown-label">${formatDaysText(days)} до ДР</div>
                        </div>
                    </div>
                    <div class="profile-hero__body">
                        <div class="profile-hero__avatar">${getInitials(user.name)}</div>
                        <div>
                            <h1 class="profile-hero__name">${user.name}</h1>
                            <p class="profile-hero__date">${new Date(user.birthDate).toLocaleString('ru', {day:'numeric', month:'long'})}</p>
                            <div class="profile-hero__groups">
                                ${user.groups.map(g => `<span class="chip">${g}</span>`).join("")}
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div class="section-header">
                        <h2>Список желаемых подарков</h2>
                    </div>
                    <div class="wishlist">
                        ${user.wishlist.map(item => `
                            <div class="wishlist-item">
                                <div class="wishlist-item__icon">
                                    <i data-lucide="${item.icon || 'gift'}" style="width:18px;"></i>
                                </div>
                                <span class="wishlist-item__title">${item.title}</span>
                            </div>
                        `).join("")}
                    </div>
                </section>
            `;
        }
        if (window.lucide) lucide.createIcons();
    }

    const myHeroContainer = document.getElementById("my-hero-container");
    if (myHeroContainer) {
        const currentUser = mockUsers.find(u => u.id === "current_user");

        function renderMyProfile() {
            const days = getDaysToBirthday(currentUser.birthDate);

            myHeroContainer.innerHTML = `
                <section class="profile-hero">
                    <div class="profile-hero__banner">
                        <div>
                            <div class="profile-hero__countdown-number">${days}</div>
                            <div class="profile-hero__countdown-label">${formatDaysText(days)} до ДР</div>
                        </div>
                    </div>
                    <div class="profile-hero__body">
                        <div class="profile-hero__avatar">${getInitials(currentUser.name)}</div>
                        <div>
                            <h1 class="profile-hero__name">${currentUser.name}</h1>
                            <p class="profile-hero__date">${new Date(currentUser.birthDate).toLocaleString('ru', {day:'numeric', month:'long'})}</p>
                            <div class="profile-hero__groups">
                                ${currentUser.groups.map(g => `<span class="chip">${g}</span>`).join("")}
                            </div>
                        </div>
                    </div>
                </section>
            `;

            const groupsContainer = document.getElementById("my-groups-container");
            groupsContainer.innerHTML = "";
            allGroups.forEach(group => {
                const isJoined = currentUser.groups.includes(group.name);
                const item = document.createElement("div");
                item.className = "group-item";
                item.innerHTML = `
                    <div>
                        <div class="group-item__name">${group.name}</div>
                        <div class="group-item__count">${group.count} участника</div>
                    </div>
                    ${isJoined ? `
                        <span class="group-item__joined">
                            <i data-lucide="check" style="width:14px;"></i>
                            Вы участник
                        </span>
                    ` : `
                        <button class="btn btn-primary btn-join" data-group="${group.name}">Вступить</button>
                    `}
                `;
                groupsContainer.appendChild(item);
            });

            const wishlistContainer = document.getElementById("my-wishlist-container");
            wishlistContainer.innerHTML = "";
            currentUser.wishlist.forEach(item => {
                const div = document.createElement("div");
                div.className = "wishlist-item";
                div.innerHTML = `
                    <div class="wishlist-item__icon">
                        <i data-lucide="${item.icon || 'gift'}" style="width:18px;"></i>
                    </div>
                    <span class="wishlist-item__title">${item.title}</span>
                `;
                wishlistContainer.appendChild(div);
            });

            if (window.lucide) lucide.createIcons();
        }

        document.getElementById("my-groups-container").addEventListener("click", (e) => {
            if (e.target.classList.contains("btn-join")) {
                const groupName = e.target.getAttribute("data-group");
                currentUser.groups.push(groupName);
                const targetGroup = allGroups.find(g => g.name === groupName);
                if (targetGroup) targetGroup.count++;
                renderMyProfile();
            }
        });

        document.getElementById("btn-add-gift").addEventListener("click", () => {
            const title = prompt("Введите название подарка:");
            if (title && title.trim() !== "") {
                currentUser.wishlist.push({ title: title.trim(), icon: "gift" });
                renderMyProfile();
            }
        });

        document.getElementById("btn-create-group").addEventListener("click", () => {
            const name = prompt("Введите название новой группы:");
            if (name && name.trim() !== "") {
                const trimmedName = name.trim();
                if (!allGroups.some(g => g.name === trimmedName)) {
                    allGroups.push({ name: trimmedName, count: 1 });
                    currentUser.groups.push(trimmedName);
                    renderMyProfile();
                } else {
                    alert("Такая группа уже существует!");
                }
            }
        });

        renderMyProfile();
    }
});