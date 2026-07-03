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

const USER_PALETTE = [
    { bg: "var(--color-navy)",  text: "var(--color-surface)" },
    { bg: "var(--color-rose)",  text: "var(--color-surface)" },
    { bg: "var(--color-coral)", text: "var(--color-surface)" },
    { bg: "var(--color-peach)", text: "var(--color-navy)" },
    { bg: "var(--color-gold)",  text: "var(--color-navy)" },
];

function paletteForSender(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
    }
    return USER_PALETTE[Math.abs(hash) % USER_PALETTE.length];
}

export function initChatInterface(chatId, formId, inputId, messagesId, currentUserName) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const container = document.getElementById(messagesId);

    if (!form || !input || !container) {
        console.error("Ошибка: Не удалось найти элементы чата по указанным ID.");
        return;
    }

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

        const docsArray = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

        docsArray.sort((a, b) => {
            const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
            const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
            return timeA - timeB;
        });

        docsArray.forEach((data) => {
            const msgElement = document.createElement("div");

            const isOwn = data.sender === currentUserName;
            msgElement.className = `msg ${isOwn ? "msg--own" : "msg--other"}`;
            if (!isOwn) {
                const palette = paletteForSender(data.sender);
                msgElement.style.setProperty("--msg-color", palette.bg);
                msgElement.style.setProperty("--msg-text-color", palette.text);
            }

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

export function initSubscribeButton(friendId, buttonId, currentUserName) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const chatRef = doc(window.db, "chats", friendId);

    onSnapshot(chatRef, (snap) => {
        const participants = snap.exists() ? (snap.data().participants || []) : [];
        const isSubscribed = participants.includes(currentUserName);
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
