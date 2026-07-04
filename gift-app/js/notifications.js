import { db } from './config.js';
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { watchAuthState } from './auth.js';

let mockDatabase = [];
let currentUserFriends = [];
let currentUserId = null;

function loadDataFromFirebase() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        mockDatabase = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            mockDatabase.push({
                id: doc.id,
                name: data.name,
                birthday: data.birthday,
                groups: data.groups || [],
                gifts: data.gifts || []
            });
        });
        syncAllButtons();
        checkBirthdays();
    });

    watchAuthState((user) => {
        if (user) {
            currentUserId = user.uid;
            onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    currentUserFriends = data.friends || [];
                    syncAllButtons();
                    checkBirthdays();
                }
            });
        }
    });
}

function toggleCardButtons(friendId, isSubscribed) {
    const subscribeBtn = document.getElementById(`subscribe-${friendId}`);
    const unsubscribeBtn = document.getElementById(`unsubscribe-${friendId}`);
    const calendarBtn = document.getElementById(`calendar-${friendId}`);

    if (subscribeBtn && unsubscribeBtn && calendarBtn) {
        if (isSubscribed) {
            subscribeBtn.style.display = 'none';
            unsubscribeBtn.style.display = 'inline-block';
            calendarBtn.style.display = 'inline-block';
        } else {
            subscribeBtn.style.display = 'inline-block';
            unsubscribeBtn.style.display = 'none';
            calendarBtn.style.display = 'none';
        }
    }
}

function syncAllButtons() {
    mockDatabase.forEach(friend => {
        const isSubscribed = currentUserFriends.includes(friend.id);
        toggleCardButtons(friend.id, isSubscribed);
    });
}

function renderNotification(name, message, color) {
    let notifyZone = document.getElementById('notification-zone');

    let bgColor = '#fff3e0';
    let borderColor = '#ffb74d';

    if (color === 'red') {
        bgColor = '#ffebee';
        borderColor = '#ef5350';
    } else if (color === 'yellow') {
        bgColor = '#fffde7';
        borderColor = '#fff176';
    }

    let alertHTML = `
        <div style="background-color: ${bgColor}; border-left: 5px solid ${borderColor}; padding: 12px; margin-bottom: 10px; border-radius: 4px; color: #333;">
            <strong>${name}</strong>: ${message}
        </div>
    `;
    notifyZone.innerHTML += alertHTML;
}

async function subscribeToFriend(friendId) {
    if (!currentUserFriends.includes(friendId)) {
        currentUserFriends.push(friendId);

        if (currentUserId) {
            const userRef = doc(db, "users", currentUserId);
            await updateDoc(userRef, {
                friends: currentUserFriends
            });
        }

        toggleCardButtons(friendId, true);
        checkBirthdays();
    }
}

async function unsubscribeFromFriend(friendId) {
    currentUserFriends = currentUserFriends.filter(id => id !== friendId);

    if (currentUserId) {
        const userRef = doc(db, "users", currentUserId);
        await updateDoc(userRef, {
            friends: currentUserFriends
        });
    }

    toggleCardButtons(friendId, false);
    checkBirthdays();
}

async function subscribeToGroup(groupName) {
    let addedCount = 0;

    mockDatabase.forEach(user => {
        if (user.groups.includes(groupName) && !currentUserFriends.includes(user.id)) {
            currentUserFriends.push(user.id);
            addedCount++;
        }
    });

    if (addedCount > 0 && currentUserId) {
        const userRef = doc(db, "users", currentUserId);
        await updateDoc(userRef, {
            friends: currentUserFriends
        });
        syncAllButtons();
        checkBirthdays();
    }
}

function checkBirthdays() {
    let notifyZone = document.getElementById('notification-zone');
    notifyZone.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let found = false;

    currentUserFriends.forEach(id => {
        let friend = mockDatabase.find(user => user.id === id);
        if (!friend || !friend.birthday) return;

        const [year, month, day] = friend.birthday.split('-');
        let bdayThisYear = new Date(today.getFullYear(), month - 1, day);

        if (bdayThisYear < today) {
            bdayThisYear.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = bdayThisYear - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            renderNotification(friend.name, "Праздник прямо сегодня! 🥳", "red");
            found = true;
        } else if (diffDays <= 7) {
            renderNotification(friend.name, `День рождения всего через ${diffDays} дн.! ⏳`, "orange");
            found = true;
        } else if (diffDays > 7 && diffDays <= 14) {
            renderNotification(friend.name, `День рождения всего через ${diffDays} дн.! ⏳`, "yellow");
            found = true;
        }
    });

    if (!found && currentUserFriends.length > 0) {
        notifyZone.innerHTML = `
            <div style="background-color: #e8f5e9; border-left: 5px solid #66bb6a; padding: 12px; margin-bottom: 10px; border-radius: 4px; color: #2e7d32;">
                🎯 У ваших друзей нет ближайших дней рождения
            </div>
        `;
    }
}

function addToGoogleCalendar(friendId) {
    let friend = mockDatabase.find(user => user.id === friendId);
    if (!friend || !friend.birthday) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [bYear, bMonth, bDay] = friend.birthday.split('-');

    let eventYear = today.getFullYear();
    let bdayThisYear = new Date(eventYear, bMonth - 1, bDay);

    if (bdayThisYear < today) {
        eventYear += 1;
    }

    const startDate = `${eventYear}${bMonth}${bDay}`;
    let nextDay = new Date(eventYear, bMonth - 1, parseInt(bDay) + 1);
    let endMonth = String(nextDay.getMonth() + 1).padStart(2, '0');
    let endDateFormatted = String(nextDay.getDate()).padStart(2, '0');
    const endDate = `${nextDay.getFullYear()}${endMonth}${endDateFormatted}`;

    const title = encodeURIComponent(`День рождения: ${friend.name}`);
    const description = encodeURIComponent(`Идеи для подарка: ${friend.gifts.join(', ')}`);

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${description}`;
    window.open(googleCalendarUrl, '_blank');
}

window.subscribeToFriend = subscribeToFriend;
window.unsubscribeFromFriend = unsubscribeFromFriend;
window.subscribeToGroup = subscribeToGroup;
window.addToGoogleCalendar = addToGoogleCalendar;

loadDataFromFirebase();
setInterval(checkBirthdays, 15000);