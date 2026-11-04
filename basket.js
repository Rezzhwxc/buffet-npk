const API_BASE = "/api";
const SESSION_KEY = "employeeId";

const itemsList = document.querySelector(".cart-items-list");
const totalEl = document.querySelector(".order-total-price");
const countEl = document.querySelector(".cart-count-value");
const clearBtn = document.querySelector(".clear-cart");
const checkoutForm = document.querySelector(".checkout-form");
const checkoutBtn = document.querySelector(".checkout-button");
const locationSelect = document.getElementById("delivery-location");

const receiptOverlay = document.getElementById("receiptOverlay");
const receipt = receiptOverlay?.querySelector(".receipt");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmTitleEl = document.getElementById("confirmTitle");
const confirmTextEl = document.getElementById("confirmText");
const confirmOkBtn = document.getElementById("confirmOk");
const confirmCancelBtn = document.getElementById("confirmCancel");

let confirmResolve = null;
let lastFocused = null;

/* ---------- Общие функции ---------- */

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
}

function lockScroll() {
    document.body.style.overflow = "hidden";
}

function unlockScroll() {
    if (!confirmResolve && receiptOverlay?.hidden !== false) {
        document.body.style.overflow = "";
    }
}

/* ---------- Модальное окно подтверждения ---------- */

function closeConfirm(result) {
    if (!confirmResolve) return;

    confirmOverlay.hidden = true;

    const resolve = confirmResolve;
    confirmResolve = null;

    unlockScroll();
    lastFocused?.focus?.();

    resolve(result);
}

function showConfirm({
    title,
    text = "",
    confirmText = "ОК",
    cancelText = "Отмена",
    danger = false
}) {
    if (confirmResolve) closeConfirm(false);

    return new Promise(resolve => {
        confirmResolve = resolve;
        lastFocused = document.activeElement;

        confirmTitleEl.textContent = title;
        confirmTextEl.textContent = text;
        confirmOkBtn.textContent = confirmText;

        confirmOkBtn.classList.toggle("modal-btn-danger", danger);

        confirmCancelBtn.hidden = cancelText === null;

        if (cancelText !== null) {
            confirmCancelBtn.textContent = cancelText;
        }

        confirmOverlay.hidden = false;
        lockScroll();

        (cancelText !== null && danger
            ? confirmCancelBtn
            : confirmOkBtn
        ).focus();
    });
}

confirmOkBtn.addEventListener("click", () => closeConfirm(true));
confirmCancelBtn.addEventListener("click", () => closeConfirm(false));

confirmOverlay.addEventListener("click", event => {
    if (event.target === confirmOverlay) {
        closeConfirm(false);
    }
});

/* ---------- Клавиатура ---------- */

document.addEventListener("keydown", event => {
    if (confirmResolve) {
        if (event.key === "Escape") {
            closeConfirm(false);
            return;
        }

        if (event.key === "Tab") {
            const buttons = [
                confirmCancelBtn,
                confirmOkBtn
            ].filter(button => !button.hidden);

            const first = buttons[0];
            const last = buttons[buttons.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault();
                first.focus();
            }
        }
    }

    if (
        event.key === "Escape" &&
        receiptOverlay &&
        !receiptOverlay.hidden
    ) {
        closeReceipt();
    }
});

/* ---------- Закрытие чека ---------- */

function closeReceipt() {
    if (!receiptOverlay || receiptOverlay.hidden) return;

    receiptOverlay.hidden = true;

    unlockScroll();
}

/* ---------- Корзина ---------- */

function createItem(item) {
    const article = document.createElement("article");

    article.className = "basket-item";
    article.dataset.code = item.code;

    const name = escapeHtml(item.name);

    article.innerHTML = `
        <img
            src="/img/image.png"
            alt="${name}"
            class="basket-item-image"
        >

        <div class="basket-item-info">
            <h3 class="basket-item-title">${name}</h3>
            <p class="basket-item-unit-label">Цена за шт.</p>
        </div>

        <div class="quantity-counter" aria-label="Количество товара">
            <button
                type="button"
                class="counter-btn minus"
                aria-label="Уменьшить количество"
            >−</i></button>

            <input
                type="number"
                class="counter-input"
                value="${item.qty}"
                min="1"
                max="99"
                aria-label="Количество: ${name}"
            >

            <button
                type="button"
                class="counter-btn plus"
                aria-label="Увеличить количество"
            >+</button>
        </div>

        <div class="basket-item-details">
            <button
                type="button"
                class="remove-item"
                aria-label="Удалить ${name} из корзины"
            >
                <img
                    width="20"
                    height="20"
                    class="remove-item-icon"
                    src="/img/binn.png"
                    alt=""
                >
            </button>

            <p class="basket-item-total">
                ${formatPrice(item.price * item.qty)}
            </p>

            <p class="basket-item-unit-price">
                ${formatPrice(item.price)}
            </p>
        </div>
    `;

    return article;
}

function render() {
    const cart = getCart();
    const { count, total } = getTotals(cart);

    itemsList.innerHTML = "";

    if (cart.length === 0) {
        itemsList.innerHTML = `
            <p class="cart-empty">Корзина пуста</p>
        `;
    } else {
        cart.forEach(item => {
            itemsList.appendChild(createItem(item));
        });
    }

    totalEl.textContent = formatPrice(total);
    countEl.textContent = `${count} шт.`;

    checkoutBtn.disabled = cart.length === 0;
    clearBtn.disabled = cart.length === 0;
}

/* ---------- Изменение количества ---------- */

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

/* ---------- Ручной ввод количества ---------- */

itemsList.addEventListener("change", event => {
    if (!event.target.matches(".counter-input")) return;

    const itemEl = event.target.closest(".basket-item");

    setQty(
        itemEl.dataset.code,
        Number(event.target.value)
    );

    render();
});

/* ---------- Очистка корзины ---------- */

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

/* ---------- Формирование чека ---------- */

function showReceipt(order, orderNumber = "") {
    const itemsBox = receipt.querySelector(".receipt-items");

    itemsBox.innerHTML = "";

    // Если есть номер заказа из 1С, можем показать его в заголовке или подзаголовке чека
    const titleEl = receipt.querySelector(".receipt-title");
    if (orderNumber) {
        titleEl.textContent = `Заказ №${orderNumber} оформлен!`;
    } else {
        titleEl.textContent = "Заказ оформлен!";
    }

    order.items.forEach(item => {
        const row = document.createElement("div");

        row.className = "receipt-item";

        const name = document.createElement("span");
        name.className = "receipt-item-name";
        name.textContent = `${item.name} (${item.qty} шт)`;

        const dots = document.createElement("span");
        dots.className = "receipt-item-dots";
        dots.setAttribute("aria-hidden", "true");

        const price = document.createElement("span");
        price.className = "receipt-item-price";
        price.textContent = formatPrice(item.price * item.qty);

        row.append(name, dots, price);

        itemsBox.appendChild(row);
    });

    receipt.querySelector(".receipt-count-value").textContent =
        `${order.count} шт.`;

    receipt.querySelector(".receipt-total-price").textContent =
        formatPrice(order.total);

    receiptOverlay.hidden = false;

    lockScroll();

    receipt.querySelector(".receipt-done-button").focus();
}

/* ---------- Оформление заказа (Интеграция с 1С) ---------- */

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
        document.getElementById("delivery-location-input").focus();
        return;
    }

    const { count, total } = getTotals(cart);

    // Формируем тело запроса строго под требования обработчика 1С:
    // employeeId, location, items (содержит code и qty)
    const payload = {
        employeeId: employeeId,
        location: locationSelect.value,
        items: cart.map(item => ({
            code: item.code,
            qty: item.qty
        }))
    };

    // Защита от повторного нажатия
    checkoutBtn.disabled = true;
    const originalButtonText = checkoutBtn.querySelector("span")?.textContent || "Заказать";
    if (checkoutBtn.querySelector("span")) {
        checkoutBtn.querySelector("span").textContent = "Отправка...";
    }

    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Ошибка при создании заказа в 1С");
        }

        console.log("Заказ успешно создан в 1С:", result);

        // Объект заказа для отрисовки чека на клиенте
        const orderForReceipt = {
            items: cart.map(item => ({ ...item })),
            count,
            total
        };

        // Показываем чек с номером из 1С (orderNumber)
        showReceipt(orderForReceipt, result.orderNumber);

        // Очищаем корзину только после успешного ответа
        clearCart();
        render();

    } catch (error) {
        console.error("Ошибка оформления заказа:", error);
        await showConfirm({
            title: "Не удалось оформить заказ",
            text: error.message || "Проверьте соединение с сервером.",
            confirmText: "Закрыть",
            cancelText: null,
            danger: true
        });
    } finally {
        // Возвращаем кнопку в исходное состояние
        checkoutBtn.disabled = false;
        if (checkoutBtn.querySelector("span")) {
            checkoutBtn.querySelector("span").textContent = originalButtonText;
        }
    }
});

/* ---------- Закрытие чека по фону ---------- */

receiptOverlay.addEventListener("click", event => {
    if (event.target === receiptOverlay) {
        closeReceipt();
    }
});

/* ---------- Анимация кнопок ---------- */

document.querySelectorAll(".ripple-button").forEach(button => {
    button.addEventListener("pointerenter", event => {
        const rect = button.getBoundingClientRect();

        button.style.setProperty(
            "--x",
            `${event.clientX - rect.left}px`
        );

        button.style.setProperty(
            "--y",
            `${event.clientY - rect.top}px`
        );

        button.classList.remove("ripple");

        void button.offsetWidth;

        button.classList.add("ripple");
    });
});

/* ---------- Умный селект для выбора кабинета ---------- */
document.addEventListener("DOMContentLoaded", () => {
    const visibleInput = document.getElementById("delivery-location-input");
    const hiddenInput = document.getElementById("delivery-location");
    const optionsList = document.getElementById("delivery-options-list");

    // Список доступных кабинетов
    const allRooms = ["225", "415", "110"];

    function renderOptions(filterText = "") {
        optionsList.innerHTML = "";
        
        const filtered = allRooms.filter(room => room.includes(filterText));

        if (filtered.length === 0) {
            const li = document.createElement("li");
            li.textContent = "Не найдено";
            li.style.color = "#999";
            li.style.cursor = "default";
            optionsList.appendChild(li);
        } else {
            filtered.forEach(room => {
                const li = document.createElement("li");
                li.textContent = room;
                li.addEventListener("click", () => {
                    visibleInput.value = room;
                    hiddenInput.value = room; 
                    optionsList.classList.remove("active");
                });
                optionsList.appendChild(li);
            });
        }
    }

    visibleInput.addEventListener("focus", () => {
        renderOptions(visibleInput.value);
        optionsList.classList.add("active");
    });

    visibleInput.addEventListener("input", (e) => {
        const text = e.target.value.trim();
        hiddenInput.value = text; 
        renderOptions(text);
        optionsList.classList.add("active");
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".custom-select-wrapper")) {
            optionsList.classList.remove("active");
        }
    });
});

/* ---------- Инициализация ---------- */

render();