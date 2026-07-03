const mockUsers = [
    {
        id: "u1",
        name: "Алина Петрова",
        birthDate: "2006-03-15",
        groups: ["972501 ТГУ", "Сборная по волейболу"],
        wishlist: [
            { title: "Наушники Sony WH-1000XM5", icon: "headphones" },
            { title: "Книга «Мастер и Маргарита»", icon: "book-open" }
        ]
    },
    {
        id: "u2",
        name: "Марк Иванов",
        birthDate: "2006-07-20",
        groups: ["972501 ТГУ"],
        wishlist: [
            { title: "Механическая клавиатура", icon: "keyboard" }
        ]
    },
    {
        id: "u3",
        name: "Соня Кузнецова",
        birthDate: "2006-12-02",
        groups: ["Сборная по волейболу", "Клуб настолок"],
        wishlist: [
            { title: "Настольная игра Codenames", icon: "dices" },
            { title: "Худи оверсайз", icon: "shirt" },
            { title: "Термокружка", icon: "cup-totem" }
        ]
    },
    {
        id: "current_user",
        name: "Полина Смирнова",
        birthDate: "2006-09-08",
        groups: ["972501 ТГУ"],
        wishlist: [
            { title: "Кофемолка ручная", icon: "coffee" },
            { title: "Набор акварели", icon: "palette" }
        ]
    }
];

const allGroups = [
    { name: "972501 ТГУ", count: 24 },
    { name: "Сборная по волейболу", count: 14 },
    { name: "Клуб настолок", count: 9 }
];