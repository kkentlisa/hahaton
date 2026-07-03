export function initChatInterface(chatId, formId, inputId, chatContainerId, userName) {
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const container = document.getElementById(chatContainerId);

    let renderedIds = new Set();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value.trim() !== "") {
            sendMessage(chatId, userName, input.value);
            input.value = "";
        }
    });

    subscribeToChat(chatId, (data) => {
        // Обновляем закреплённое сообщение
        let pinEl = container.querySelector('.pinned-msg');
        if (data.pinned) {
            if (!pinEl) {
                pinEl = document.createElement('div');
                pinEl.className = 'pinned-msg';
                container.prepend(pinEl);
            }
            pinEl.innerHTML = `📌 ${data.pinned}`;
        } else if (pinEl) {
            pinEl.remove();
        }

        // Добавляем только новые сообщения
        data.messages.forEach(msg => {
            if (renderedIds.has(msg.id)) return;
            renderedIds.add(msg.id);

            const div = document.createElement('div');
            const isOwn = msg.senderName === userName;
            div.className = `msg ${isOwn ? 'msg--own' : 'msg--other'} ${msg.type !== 'text' ? msg.type : ''}`;
            div.innerHTML = `<span class="msg__sender">${msg.senderName}</span><span class="msg__text">${msg.text}</span>`;
            container.appendChild(div);
        });

        container.scrollTop = container.scrollHeight;
    });
}