import { db } from "./config.js";
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ── Отправить сообщение в Firestore
async function sendMessage(chatId, senderName, text, type = "text") {
    try {
        await addDoc(collection(db, "chats", chatId, "messages"), {
            senderName,
            text,
            type,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Ошибка отправки:", e);
    }
}

// ── Подписаться на чат (real-time)
function subscribeToChat(chatId, renderCallback) {
    const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "asc")
    );

    return onSnapshot(q, async (snapshot) => {
        const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Закреплённое сообщение (опционально)
        let pinned = null;
        try {
            const infoSnap = await getDoc(doc(db, "chat_info", chatId));
            if (infoSnap.exists()) pinned = infoSnap.data().pinnedMessage ?? null;
        } catch (_) {}

        renderCallback({ messages, pinned });
    });
}

// ── Форматировать время из Firestore Timestamp
function formatTime(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

// ── Удалить заглушку пустого чата
function removePlaceholder(container) {
    const empty = container.querySelector(".chat-empty");
    if (empty) empty.remove();
}

// ── Главная функция — вызывается из friend.html
export function initChatInterface(chatId, formId, inputId, chatContainerId, userName) {
    const form      = document.getElementById(formId);
    const input     = document.getElementById(inputId);
    const container = document.getElementById(chatContainerId);

    if (!form || !input || !container) {
        console.error("initChatInterface: не найдены элементы DOM");
        return;
    }

    let renderedIds = new Set();

    // Отправка по кнопке / Enter
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        sendMessage(chatId, userName, text);
        input.value = "";
        input.focus();
    });

    // Real-time подписка
    subscribeToChat(chatId, ({ messages, pinned }) => {

        // Закреплённое сообщение → шлём в шапку через CustomEvent
        window.dispatchEvent(new CustomEvent("chat-pinned-update", { detail: pinned }));

        // Рендерим только новые сообщения
        messages.forEach(msg => {
            if (renderedIds.has(msg.id)) return;
            renderedIds.add(msg.id);

            removePlaceholder(container);

            const isOwn = msg.senderName === userName;

            const wrapper = document.createElement("div");
            wrapper.className = [
                "msg",
                isOwn ? "msg--own" : "msg--other",
                msg.type !== "text" ? msg.type : ""
            ].join(" ").trim();

            wrapper.innerHTML = `
                <span class="msg__sender">${msg.senderName}</span>
                <div class="msg__bubble">
                    <span class="msg__text">${escapeHtml(msg.text)}</span>
                    <span class="msg__time">${formatTime(msg.createdAt)}</span>
                </div>
            `;

            container.appendChild(wrapper);
        });

        // Скролл вниз
        container.scrollTop = container.scrollHeight;
    });
}

// ── Защита от XSS
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}