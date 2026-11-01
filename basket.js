const SESSION_KEY = "employeeId";

const itemsList = document.querySelector(".cart-items-list");
const totalEl = document.querySelector(".order-total-price");
const countEl = document.querySelector(".cart-count-value");
const clearBtn = document.querySelector(".clear-cart");
const checkoutForm = document.querySelector(".checkout-form");
const checkoutBtn = document.querySelector(".checkout-button");
const locationSelect = document.getElementById("delivery-location");
const basketContent = document.querySelector(".basket-content");
const receipt = document.querySelector(".receipt");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmTitleEl = document.getElementById("confirmTitle");
const confirmTextEl = document.getElementById("confirmText");
const confirmOkBtn = document.getElementById("confirmOk");
const confirmCancelBtn = document.getElementById("confirmCancel");

let confirmResolve = null;
let lastFocused = null;

/* ---------- Модальное окно ---------- */

function closeConfirm(result) {
    if (!confirmResolve) return;

    confirmOverlay.hidden = true;
    document.body.style.overflow = "";

    const resolve = confirmResolve;
    confirmResolve = null;

    lastFocused?.focus?.();
    resolve(result);
}

function showConfirm({
    title,
    text = "",
    confirmText = "ОК",
    cancelText = "Отмена",   // null — показать только одну кнопку
    danger = false
}) {
    closeConfirm(false);

    return new Promise(resolve => {
        confirmResolve = resolve;
        lastFocused = document.activeElement;

        confirmTitleEl.textContent = title;
        confirmTextEl.textContent = text;
        confirmOkBtn.textContent = confirmText;
        confirmOkBtn.classList.toggle("modal-btn-danger", danger);

        confirmCancelBtn.hidden = cancelText === null;
        if (cancelText !== null) confirmCancelBtn.textContent = cancelText;

        confirmOverlay.hidden = false;
        document.body.style.overflow = "hidden";

        // для опасных действий фокус на «Отмена»
        (cancelText !== null && danger ? confirmCancelBtn : confirmOkBtn).focus();
    });
}

confirmOkBtn.addEventListener("click", () => closeConfirm(true));
confirmCancelBtn.addEventListener("click", () => closeConfirm(false));

confirmOverlay.addEventListener("click", event => {
    if (event.target === confirmOverlay) closeConfirm(false);
});

document.addEventListener("keydown", event => {
    if (!confirmResolve) return;

    if (event.key === "Escape") {
        closeConfirm(false);
        return;
    }

    // Tab не уходит за пределы модалки
    if (event.key === "Tab") {
        const buttons = [confirmCancelBtn, confirmOkBtn].filter(b => !b.hidden);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});

/* ---------- Корзина ---------- */

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

function createItem(item) {
    const article = document.createElement("article");
    article.className = "basket-item";
    article.dataset.code = item.code;

    const name = escapeHtml(item.name);

    article.innerHTML = `
        <img src="/img/image.png" alt="${name}" class="basket-item-image">

        <div class="basket-item-info">
            <h3 class="basket-item-title">${name}</h3>
            <p class="basket-item-unit-label">Цена за шт.</p>
        </div>

        <div class="quantity-counter" aria-label="Количество товара">
            <button type="button" class="counter-btn minus" aria-label="Уменьшить количество">−</button>
            <input type="number" class="counter-input" value="${item.qty}" min="1" max="99" aria-label="Количество: ${name}">
            <button type="button" class="counter-btn plus" aria-label="Увеличить количество">+</button>
        </div>

        <div class="basket-item-details">
            <button type="button" class="remove-item" aria-label="Удалить ${name} из корзины">
                <img width="20" height="20" class="remove-item-icon" src="https://img.icons8.ru/external-tanah-basah-basic-outline-tanah-basah/48/external-recycle-bin-nature-tanah-basah-basic-outline-tanah-basah.png" alt="">
            </button>
            <p class="basket-item-total">${formatPrice(item.price * item.qty)}</p>
            <p class="basket-item-unit-price">${formatPrice(item.price)}</p>
        </div>
    `;

    return article;
}

function render() {
    const cart = getCart();
    const { count, total } = getTotals(cart);

    itemsList.innerHTML = "";

    if (cart.length === 0) {
        itemsList.innerHTML = '<p class="cart-empty">Корзина пуста</p>';
    } else {
        cart.forEach(item => itemsList.appendChild(createItem(item)));
    }

    totalEl.textContent = formatPrice(total);
    countEl.textContent = `${count} шт.`;
    checkoutBtn.disabled = cart.length === 0;
    clearBtn.disabled = cart.length === 0;
}

// +, −, удалить
itemsList.addEventListener("click", event => {
    const itemEl = event.target.closest(".basket-item");
    if (!itemEl) return;

    const code = itemEl.dataset.code;
    const item = getCart().find(i => i.code === code);
    if (!item) return;

    if (event.target.closest(".plus")) {
        setQty(code, item.qty + 1);
    } else if (event.target.closest(".minus")) {
        setQty(code, item.qty - 1);
    } else if (event.target.closest(".remove-item")) {
        removeFromCart(code);
    } else {
        return;
    }

    render();
});

// ручной ввод количества
itemsList.addEventListener("change", event => {
    if (!event.target.matches(".counter-input")) return;

    const itemEl = event.target.closest(".basket-item");
    setQty(itemEl.dataset.code, Number(event.target.value));
    render();
});

clearBtn.addEventListener("click", async () => {
    if (getCart().length === 0) return;

    const ok = await showConfirm({
        title: "Очистить корзину?",
        text: "Все товары будут удалены из корзины.",
        confirmText: "Очистить",
        cancelText: "Отмена",
        danger: true
    });

    if (ok) {
        clearCart();
        render();
    }
});

/* ---------- Оформление заказа ---------- */

function showReceipt(order) {
    const itemsBox = receipt.querySelector(".receipt-items");

    itemsBox.innerHTML = "";
    order.items.forEach(item => {
        const row = document.createElement("div");
        row.className = "receipt-item";
        row.innerHTML = `
            <span class="receipt-item-name">${escapeHtml(item.name)} (${item.qty} шт)</span>
            <span class="receipt-item-dots" aria-hidden="true"></span>
            <span class="receipt-item-price">${formatPrice(item.price * item.qty)}</span>
        `;
        itemsBox.appendChild(row);
    });

    receipt.querySelector(".receipt-count-value").textContent = `${order.count} шт.`;
    receipt.querySelector(".receipt-total-price").textContent = formatPrice(order.total);

    basketContent.hidden = true;
    receipt.hidden = false;
}

checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();

    const cart = getCart();
    if (cart.length === 0) return;

    const employeeId = sessionStorage.getItem(SESSION_KEY);
    if (!employeeId) {
        await showConfirm({
            title: "Нужен вход",
            text: "Сначала войдите по ID на странице меню.",
            confirmText: "Понятно",
            cancelText: null
        });
        return;
    }

    if (!locationSelect.value) {
        locationSelect.focus();
        return;
    }

    const { count, total } = getTotals(cart);

    const order = {
        employeeId,
        location: locationSelect.value,
        items: cart,
        count,
        total
    };

    // TODO: здесь будет оплата / отправка заказа в API.
    // Корзину лучше очищать только после успешного ответа.
    console.log("Заказ:", order);

    showReceipt(order);
    clearCart();
});

/* ---------- Анимация кнопок ---------- */

document.querySelectorAll(".ripple-button").forEach(button => {
    button.addEventListener("pointerenter", event => {
        const rect = button.getBoundingClientRect();
        button.style.setProperty("--x", `${event.clientX - rect.left}px`);
        button.style.setProperty("--y", `${event.clientY - rect.top}px`);
        button.classList.remove("ripple");
        void button.offsetWidth;
        button.classList.add("ripple");
    });
});

render();