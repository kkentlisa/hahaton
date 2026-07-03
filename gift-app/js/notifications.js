const mockDatabase = [
    {
        id: 'u_001',
        name: 'Олег Иванов',
        birthday: '1998-07-05',
        groups: ['Коллеги', 'Универ'],
        gifts: ['Беспроводные наушники']
    },
    {
        id: 'u_002',
        name: 'Катя Смирнова',
        birthday: '2001-07-12',
        groups: ['Универ'],
        gifts: ['Клубника в шоколаде']
    },
    {
        id: 'u_003',
        name: 'Богдан',
        birthday: '2000-07-03',
        groups: ['Интенсив Сочи'],
        gifts: ['Книга по С++']
    }
];

function subscribeToFriend(friendId) {
    let currentSubscriptions = JSON.parse(localStorage.getItem('mySubscriptions')) || [];
    if (!currentSubscriptions.includes(friendId)) {
        currentSubscriptions.push(friendId);
        localStorage.setItem('mySubscriptions', JSON.stringify(currentSubscriptions));
        updateSubscriptionsDisplay();
        checkBirthdays();
    } else {
        alert('Вы уже следите за этим другом!');
    }
}

function unsubscribeFromFriend(friendId) {
    let currentSubscriptions = JSON.parse(localStorage.getItem('mySubscriptions')) || [];

    currentSubscriptions = currentSubscriptions.filter(id => id !== friendId);

    localStorage.setItem('mySubscriptions', JSON.stringify(currentSubscriptions));
    updateSubscriptionsDisplay();
    checkBirthdays();
}

function subscribeToGroup(groupName) {
    let currentSubscriptions = JSON.parse(localStorage.getItem('mySubscriptions')) || [];
    let addedCount = 0; // Считаем, скольких новых людей добавили

    mockDatabase.forEach(user => {
        if (user.groups.includes(groupName) && !currentSubscriptions.includes(user.id)) {
            currentSubscriptions.push(user.id);
            addedCount++;
        }
    });

    if (addedCount > 0) {
        localStorage.setItem('mySubscriptions', JSON.stringify(currentSubscriptions));
        updateSubscriptionsDisplay();
        checkBirthdays();
        alert(`Подписка оформлена! Добавлено человек из группы "${groupName}": ${addedCount}`);
    } else {
        alert(`Все участники группы "${groupName}" уже добавлены!`);
    }
}

// Очистка всего (для тестов)
function clearSubscriptions() {
    localStorage.removeItem('mySubscriptions');
    updateSubscriptionsDisplay();
    checkBirthdays();
}

function updateSubscriptionsDisplay() {
    let currentSubscriptions = JSON.parse(localStorage.getItem('mySubscriptions')) || [];
    let displayDiv = document.getElementById('my-subscriptions-list');
    displayDiv.innerHTML = '';

    if (currentSubscriptions.length === 0) {
        displayDiv.innerHTML = '<p>Вы пока ни за кем не следите.</p>';
        return;
    }

    currentSubscriptions.forEach(id => {
        let friend = mockDatabase.find(user => user.id === id);
        if (friend) {
            let cardHTML = `
                <div class="card" style="border: 1px solid #ccc; padding: 15px; margin: 10px 0; border-radius: 8px; position: relative;">
                    <h3>${friend.name}</h3>
                    <p><strong>Дата рождения:</strong> ${friend.birthday}</p>
                    <p><strong>Группы:</strong> ${friend.groups.join(', ')}</p>
                    <p><strong>Хочет в подарок:</strong> ${friend.gifts.join(', ')}</p>
                    
                    <button onclick="addToGoogleCalendar('${friend.id}')" 
                            style="margin-top: 10px; background: #4285f4; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                        📅 Добавить в Google Календарь
                    </button>
                    
                    <button onclick="unsubscribeFromFriend('${friend.id}')" 
                            style="position: absolute; top: 15px; right: 15px; background: #ffcdd2; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        ❌ Отписаться
                    </button>
                </div>
            `;
            displayDiv.innerHTML += cardHTML;
        }
    });
}

function checkBirthdays() {
    let currentSubscriptions = JSON.parse(localStorage.getItem('mySubscriptions')) || [];
    let notifyZone = document.getElementById('notification-zone');
    notifyZone.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    currentSubscriptions.forEach(id => {
        let friend = mockDatabase.find(user => user.id === id);
        if (!friend) return;

        const [year, month, day] = friend.birthday.split('-');
        let bdayThisYear = new Date(today.getFullYear(), month - 1, day);

        if (bdayThisYear < today) {
            bdayThisYear.setFullYear(today.getFullYear() + 1);
        }

        const diffTime = bdayThisYear - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0 || diffDays === 365) {
            renderNotification(friend.name, "Праздник прямо сегодня! 🥳", "red");
        } else if (diffDays <= 7) {
            renderNotification(friend.name, `День рождения всего через ${diffDays} дн.! ⏳`, "orange");
        } else if (diffDays > 7 && diffDays <= 14) {
            renderNotification(friend.name, `День рождения всего через ${diffDays} дн.! ⏳`, "yellow");
        }
    });
}

function renderNotification(name, message, color) {
    let notifyZone = document.getElementById('notification-zone');
    let alertHTML = `
        <div style="background-color: ${color === 'red' ? '#ffebee' : '#fff3e0'}; 
                    border-left: 5px solid ${color === 'red' ? '#ef5350' : '#ffb74d'}; 
                    padding: 12px; 
                    margin-bottom: 10px; 
                    border-radius: 4px; color: #333;">
            ${name}: ${message}
        </div>
    `;
    notifyZone.innerHTML += alertHTML;
}

updateSubscriptionsDisplay();
checkBirthdays();

function addToGoogleCalendar(friendId) {
    let friend = mockDatabase.find(user => user.id === friendId);
    if (!friend) return;

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