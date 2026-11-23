const API_BASE = "/api";
const SESSION_KEY = "employeeId";

// В самом модуле 1С фигурирует путь /hs/api/orders/history; проверь точный шаблон URL в конфигураторе
const ENDPOINTS = {
    ordersHistory: `${API_BASE}/orders/history`
};

const ordersListEl = document.querySelector(".orders-list");

function getEmployeeId() {
    try {
        return sessionStorage.getItem(SESSION_KEY)?.trim() || "";
    } catch {
        return "";
    }
}

function formatMoney(value) {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : 0;
    return `${new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(safe)}₽`;
}

function formatOrderDate(rawDate) {
    if (!rawDate) return "";
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return String(rawDate);

    return parsed.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function createOrderCard(order) {
    const card = document.createElement("article");
    card.className = "order-card";

    const header = document.createElement("div");
    header.className = "order-card-header";

    const title = document.createElement("h2");
    const numText = order.orderNumber ?? order.orderId ?? "";
    const dateText = formatOrderDate(order.date);
    title.textContent = dateText ? `Заказ № ${numText} (${dateText})` : `Заказ № ${numText}`;

    const statusP = document.createElement("p");
    statusP.textContent = "Статус: ";
    const statusSpan = document.createElement("span");
    statusSpan.textContent = order.status ?? "";
    statusP.appendChild(statusSpan);

    header.append(title, statusP);

    const table = document.createElement("div");
    table.className = "order-table";

    const tableHeader = document.createElement("div");
    tableHeader.className = "order-table-header";
    ["Товары", "Количество", "Цена", "Кабинет"].forEach(label => {
        const span = document.createElement("span");
        span.textContent = label;
        tableHeader.appendChild(span);
    });
    table.appendChild(tableHeader);

    const items = Array.isArray(order.items) ? order.items : [];
    const cabinet = order.cabinet ?? "";

    items.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "order-item";

        const nameSpan = document.createElement("span");
        nameSpan.textContent = item.name ?? item.code ?? "Товар";

        const qtySpan = document.createElement("span");
        qtySpan.textContent = `${item.qty ?? 0}шт`;

        const priceSpan = document.createElement("span");
        const rowSum = item.sum !== undefined ? item.sum : (Number(item.price) || 0) * (Number(item.qty) || 0);
        priceSpan.textContent = formatMoney(rowSum);

        const cabSpan = document.createElement("span");
        cabSpan.className = "order-cabinet";
        cabSpan.textContent = index === 0 ? cabinet : "";

        row.append(nameSpan, qtySpan, priceSpan, cabSpan);
        table.appendChild(row);
    });

    const totalDiv = document.createElement("div");
    totalDiv.className = "order-total";

    const totalLabel = document.createElement("strong");
    totalLabel.textContent = "ИТОГО:";

    const totalLine = document.createElement("span");
    totalLine.className = "order-total-line";

    const totalValue = document.createElement("strong");
    totalValue.textContent = formatMoney(order.total);

    totalDiv.append(totalLabel, totalLine, totalValue);

    card.append(header, table, totalDiv);
    return card;
}

async function loadOrdersHistory() {
    if (!ordersListEl) return;

    const employeeId = getEmployeeId();

    if (!employeeId) {
        ordersListEl.innerHTML = `
            <p class="orders-empty">
                Сначала войдите по ID сотрудника на <a href="/pages/index.html">главной странице</a>.
            </p>
        `;
        return;
    }

    ordersListEl.innerHTML = "<p>Загрузка истории заказов...</p>";

    try {
        const url = `${ENDPOINTS.ordersHistory}?employeeId=${encodeURIComponent(employeeId)}&limit=20`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        if (!Array.isArray(data)) {
            throw new Error("Некорректный формат истории заказов");
        }

        ordersListEl.innerHTML = "";

        if (data.length === 0) {
            ordersListEl.innerHTML = "<p class=\"orders-empty\">Заказов пока нет.</p>";
            return;
        }

        data.forEach(order => {
            ordersListEl.appendChild(createOrderCard(order));
        });

    } catch (error) {
        console.error("Ошибка загрузки истории заказов:", error);
        ordersListEl.innerHTML = "<p class=\"orders-empty\">Не удалось загрузить историю заказов.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadOrdersHistory);