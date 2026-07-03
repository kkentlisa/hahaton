import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function initChatInterface(chatId, formId, inputId, messagesId, currentUserName) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const container = document.getElementById(messagesId);

    if (!form || !input || !container) {
        console.error("Ошибка: Не удалось найти элементы чата по указанным ID.");
        return;
    }

    // Убрали orderBy из запроса, чтобы Firebase не требовал индексов и не падал
    const q = query(
        collection(window.db, "messages"),
        where("chatId", "==", chatId)
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="chat-empty">
                    <div class="chat-empty__icon">🎁</div>
                    <p class="chat-empty__title">Начните обсуждение</p>
                    <p class="chat-empty__sub">Выберите подарок и договоритесь с друзьями</p>
                </div>
            `;
            return;
        }

        container.innerHTML = "";

        // Вытягиваем документы в массив
        const docsArray = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

        // Сортируем сообщения по времени прямо на клиенте (безопасно для Firebase)
        docsArray.sort((a, b) => {
            const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
            const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
            return timeA - timeB;
        });

        // Рендерим отсортированный массив
        docsArray.forEach((data) => {
            const msgElement = document.createElement("div");

            const isOwn = data.sender === currentUserName;
            msgElement.className = `msg ${isOwn ? "msg--own" : "msg--other"}`;

            let timeStr = "⏳";
            if (data.timestamp) {
                const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            msgElement.innerHTML = `
                <span class="msg__sender">${escapeHtml(data.sender)}</span>
                <div class="msg__bubble">
                    <span class="msg__text">${escapeHtml(data.text)}</span>
                    <span class="msg__time">${timeStr}</span>
                </div>
            `;
            container.appendChild(msgElement);
        });

        container.scrollTop = container.scrollHeight;
    }, (error) => {
        console.error("Ошибка при получении сообщений из Firestore:", error);
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        input.value = "";

        try {
            await addDoc(collection(window.db, "messages"), {
                chatId: chatId,
                sender: currentUserName,
                text: text,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Не удалось отправить сообщение в базу данных:", error);
            alert("Ошибка отправки! Загляни в консоль (F12).");
            input.value = text;
        }
    });
}

// Кнопка "Подписаться" на странице друга: подписавшийся автоматически
// становится участником чата этого друга (документ chats/{friendId}
// создаётся автоматически при первой подписке — отдельно настраивать
// коллекцию не нужно).
export function initSubscribeButton(friendId, buttonId, currentUserName) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const chatRef = doc(window.db, "chats", friendId);

    onSnapshot(chatRef, (snap) => {
        const participants = snap.exists() ? (snap.data().participants || []) : [];
        const isSubscribed = participants.includes(currentUserName);
        btn.textContent = isSubscribed ? "✓ Вы подписаны" : "Подписаться";
        btn.classList.toggle("is-subscribed", isSubscribed);
        btn.dataset.subscribed = isSubscribed ? "1" : "0";
    }, (error) => {
        console.error("Ошибка при получении статуса подписки:", error);
    });

    btn.addEventListener("click", async () => {
        const isSubscribed = btn.dataset.subscribed === "1";
        try {
            if (isSubscribed) {
                await updateDoc(chatRef, { participants: arrayRemove(currentUserName) });
            } else {
                await setDoc(chatRef, {
                    ownerId: friendId,
                    participants: arrayUnion(currentUserName)
                }, { merge: true });
            }
        } catch (error) {
            console.error("Не удалось обновить подписку:", error);
            alert("Не удалось изменить подписку. Загляни в консоль (F12).");
        }
    });
}

// Вспомогательная функция защиты от XSS (внедрения тегов пользователями)
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}