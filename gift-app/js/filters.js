let currentFilter = 'all';
let selectedGroup = null;
let onChangeCallback = null;

export function initFilters(onChange) {
    onChangeCallback = onChange;

    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;

    filterBar.querySelectorAll('.filter-btn:not(.filter-group-btn)').forEach(btn => {
        btn.addEventListener('click', () => selectFilter(btn.dataset.filter, null));
    });
}

export function renderGroupFilters(groups) {
    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;

    filterBar.querySelectorAll('.filter-group-btn').forEach(btn => btn.remove());

    groups.forEach(g => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn filter-group-btn';
        btn.dataset.filter = 'group';
        btn.dataset.group = g.name;
        btn.textContent = g.name;
        btn.addEventListener('click', () => selectFilter('group', g.name));
        filterBar.appendChild(btn);
    });
}

function selectFilter(filter, group) {
    currentFilter = filter;
    selectedGroup = group;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        const isActive = filter === 'group'
            ? btn.dataset.filter === 'group' && btn.dataset.group === group
            : btn.dataset.filter === filter;
        btn.classList.toggle('is-active', isActive);
    });

    onChangeCallback?.();
}

export function filterUsers(allUsers, currentUserId, currentUserFriends) {
    if (currentFilter === 'friends') {
        return allUsers.filter(u => u.id !== currentUserId && currentUserFriends.includes(u.id));
    }
    if (currentFilter === 'group' && selectedGroup) {
        return allUsers.filter(u => u.id !== currentUserId && (u.groups || []).includes(selectedGroup));
    }
    return allUsers.filter(u => u.id !== currentUserId);
}

export function getEmptyStateText() {
    if (currentFilter === 'friends') return 'У вас пока нет друзей';
    if (currentFilter === 'group') return 'В этой группе пока нет пользователей';
    return 'Пользователей пока нет';
}