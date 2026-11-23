const API_BASE = "/api";
const SESSION_KEY = "employeeId";

const ENDPOINTS = {
    createOrder: `${API_BASE}/orders`,
    locations: `${API_BASE}/locations`
};

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

confirmOkBtn?.addEventListener("click", () => closeConfirm(true));
confirmCancelBtn?.addEventListener("click", () => closeConfirm(false));

confirmOverlay?.addEventListener("click", event => {
    if (event.target === confirmOverlay) {
        closeConfirm(false);
    }
});

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
            ].filter(button => button && !button.hidden);

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

function closeReceipt() {
    if (!receiptOverlay || receiptOverlay.hidden) return;
    receiptOverlay.hidden = true;
    unlockScroll();
}

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
            >−</button>

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

    if (!itemsList) return;

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

    if (totalEl) totalEl.textContent = formatPrice(total);
    if (countEl) countEl.textContent = `${count} шт.`;

    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
    if (clearBtn) clearBtn.disabled = cart.length === 0;
}

itemsList?.addEventListener("click", event => {
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

itemsList?.addEventListener("change", event => {
    if (!event.target.matches(".counter-input")) return;

    const itemEl = event.target.closest(".basket-item");
    if (!itemEl) return;

    const parsed = Number(event.target.value);
    setQty(itemEl.dataset.code, Number.isFinite(parsed) && parsed > 0 ? parsed : 1);

    render();
});

clearBtn?.addEventListener("click", async () => {
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

function showReceipt(order, orderNumber = "") {
    if (!receipt || !receiptOverlay) return;

    const itemsBox = receipt.querySelector(".receipt-items");
    itemsBox.innerHTML = "";

    const titleEl = receipt.querySelector(".receipt-title");
    if (titleEl) {
        titleEl.textContent = orderNumber
            ? `Заказ №${orderNumber} оформлен!`
            : "Заказ оформлен!";
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

    receipt.querySelector(".receipt-count-value").textContent = `${order.count} шт.`;
    receipt.querySelector(".receipt-total-price").textContent = formatPrice(order.total);

    receiptOverlay.hidden = false;
    lockScroll();
    receipt.querySelector(".receipt-done-button")?.focus();
}

checkoutForm?.addEventListener("submit", async event => {
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

    const location = locationSelect?.value?.trim();
    if (!location) {
        document.getElementById("delivery-location-input")?.focus();
        return;
    }

    const { count, total } = getTotals(cart);

    const payload = {
        employeeId,
        location,
        items: cart.map(item => ({
            code: item.code,
            qty: item.qty
        }))
    };

    if (checkoutBtn) checkoutBtn.disabled = true;
    const labelEl = checkoutBtn?.querySelector("span");
    const originalButtonText = labelEl?.textContent || "Заказать";
    if (labelEl) labelEl.textContent = "Отправка...";

    try {
        const response = await fetch(ENDPOINTS.createOrder, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
            throw new Error(result.message || "Ошибка при создании заказа в 1С");
        }

        const orderForReceipt = {
            items: cart.map(item => ({ ...item })),
            count,
            total
        };

        showReceipt(orderForReceipt, result.orderNumber);
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
        if (checkoutBtn) checkoutBtn.disabled = false;
        if (labelEl) labelEl.textContent = originalButtonText;
    }
});

receiptOverlay?.addEventListener("click", event => {
    if (event.target === receiptOverlay) {
        closeReceipt();
    }
});

document.querySelectorAll(".ripple-button").forEach(button => {
    button.addEventListener("pointerenter", event => {
        const rect = button.getBoundingClientRect();

        button.style.setProperty("--x", `${event.clientX - rect.left}px`);
        button.style.setProperty("--y", `${event.clientY - rect.top}px`);

        if (button.disabled) return;

        button.classList.remove("ripple");
        void button.offsetWidth;
        button.classList.add("ripple");
    });
});

function normalizeCabinetQuery(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("ё", "е")
        .replaceAll(".", "")
        .replace(/\s+/g, " ")
        .trim();
}

function getCabinetLabel(cabinet) {
    const code = String(cabinet.code ?? "").trim();
    const name = String(cabinet.name ?? "").trim();
    return name || code;
}

async function fetchCabinetsFromApi() {
    const response = await fetch(ENDPOINTS.locations, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error("Некорректный формат списка кабинетов");
    }

    return data
        .map(item => {
            if (typeof item === "string") {
                const val = item.trim();
                return val ? { code: val, name: val, territory: "" } : null;
            }
            const code = String(item?.code ?? item?.Код ?? "").trim();
            const name = String(item?.name ?? item?.Наименование ?? code).trim();
            const territory = String(item?.territory ?? item?.Территория ?? "").trim();
            if (!code && !name) return null;
            return {
                code: code || name,
                name: name || code,
                territory
            };
        })
        .filter(Boolean);
}

document.addEventListener("DOMContentLoaded", async () => {
    const visibleInput = document.getElementById("delivery-location-input");
    const hiddenInput = document.getElementById("delivery-location");
    const optionsList = document.getElementById("delivery-options-list");

    if (!visibleInput || !hiddenInput || !optionsList) return;

    let cabinets = [];
    let isLoadingCabinets = true;

    function renderCabinetTiles(filterText = "") {
        optionsList.innerHTML = "";

        if (isLoadingCabinets && cabinets.length === 0) {
            const li = document.createElement("li");
            li.className = "cabinet-empty";
            li.textContent = "Загрузка кабинетов...";
            optionsList.appendChild(li);
            return;
        }

        const normalizedFilter = normalizeCabinetQuery(filterText);
        const words = normalizedFilter ? normalizedFilter.split(" ") : [];

        const filtered = words.length === 0
            ? cabinets
            : cabinets.filter(cab => {
                const haystack = normalizeCabinetQuery(`${cab.code} ${cab.name} ${cab.territory}`);
                const compactHaystack = haystack.replace(/[\s/]/g, "");
                return words.every(word => {
                    const compactWord = word.replace(/[\s/]/g, "");
                    return haystack.includes(word) || (compactWord && compactHaystack.includes(compactWord));
                });
            });

        if (filtered.length === 0) {
            const li = document.createElement("li");
            li.className = "cabinet-empty";
            li.textContent = "Не найдено";
            optionsList.appendChild(li);
            return;
        }

        filtered.forEach(cab => {
            const li = document.createElement("li");
            li.className = "cabinet-tile";
            li.tabIndex = 0;

            const label = getCabinetLabel(cab);
            li.textContent = label;
            li.title = cab.territory
                ? `${label} (${cab.code}) — ${cab.territory}`
                : (cab.name && cab.name !== cab.code ? `${cab.name} (${cab.code})` : label);

            if (hiddenInput.value && hiddenInput.value === cab.code) {
                li.classList.add("is-selected");
            }

            const selectCabinet = () => {
                visibleInput.value = label;
                hiddenInput.value = cab.code;
                optionsList.classList.remove("active");
            };

            li.addEventListener("click", selectCabinet);
            li.addEventListener("keydown", e => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectCabinet();
                }
            });

            optionsList.appendChild(li);
        });
    }

    visibleInput.addEventListener("focus", () => {
        renderCabinetTiles(visibleInput.value);
        optionsList.classList.add("active");
    });

    visibleInput.addEventListener("input", e => {
        const text = e.target.value;
        const exactMatch = cabinets.find(
            c => normalizeCabinetQuery(c.code) === normalizeCabinetQuery(text)
                || normalizeCabinetQuery(c.name) === normalizeCabinetQuery(text)
        );
        hiddenInput.value = exactMatch ? exactMatch.code : text.trim();
        renderCabinetTiles(text);
        optionsList.classList.add("active");
    });

    document.addEventListener("click", e => {
        if (!e.target.closest(".custom-select-wrapper")) {
            optionsList.classList.remove("active");
        }
    });

    try {
        cabinets = await fetchCabinetsFromApi();
    } catch (error) {
        console.error("Ошибка загрузки кабинетов:", error);
        cabinets = [
            { code: "225", name: "225", territory: "" },
            { code: "415", name: "415", territory: "" },
            { code: "110", name: "110", territory: "" }
        ];
    } finally {
        isLoadingCabinets = false;
        if (optionsList.classList.contains("active")) {
            renderCabinetTiles(visibleInput.value);
        }
    }
});

render();