export function getDaysToBirthday(dateString) {
    if (!dateString) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthDate = new Date(dateString);
    let nextBday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBday < today) {
        nextBday.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = nextBday - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDaysText(days) {
    const lastDigit = days % 10;
    const lastTwoDigits = days % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return "дней";
    if (lastDigit === 1) return "день";
    if (lastDigit >= 2 && lastDigit <= 4) return "дня";
    return "дней";
}

export function getInitials(name) {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
}

export function formatBirthDate(dateString, includeYear = false) {
    if (!dateString) return "";
    const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    const d = new Date(dateString);
    const day = d.getDate();
    const month = months[d.getMonth()];
    if (includeYear) {
        return `${day} ${month} ${d.getFullYear()} года`;
    }
    return `${day} ${month}`;
}

export function pluralizeGifts(count) {
    if (count === 1) return 'подарок';
    if (count > 1 && count < 5) return 'подарка';
    return 'подарков';
}