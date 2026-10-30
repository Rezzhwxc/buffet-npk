const API_BASE = "http://localhost/InfoBase/hs/api";
const API_LOGIN = "apiadmin";
const API_PASSWORD = "12345";
const SESSION_KEY = "employeeId";

function saveEmployeeId(id) {
    try {
        sessionStorage.setItem(SESSION_KEY, id);
    } catch (error) {
        console.error(error);
    }
}

function getSavedEmployeeId() {
    try {
        return sessionStorage.getItem(SESSION_KEY);
    } catch (error) {
        return null;
    }
}

function showEmployeeId(id) {
    const userId = document.querySelector(".menu-user-id");

    if (userId) {
        userId.textContent = `ID: ${id}`;
    }
}

function utf8ToBase64(str) {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    );
}

function getAuthHeaders() {
    return {
        "Authorization": `Basic ${utf8ToBase64(`${API_LOGIN}:${API_PASSWORD}`)}`,
        "Accept": "application/json"
    };
}

function showAuthError(message) {
    const authError = document.getElementById("authError");
    const authInput = document.getElementById("authInput");

    if (authError) {
        authError.textContent = message;
    } else {
        alert(message);
    }

    if (authInput) {
        authInput.classList.remove("input-error");
        void authInput.offsetWidth;
        authInput.classList.add("input-error");
        authInput.focus();
        authInput.select();
    }
}

function clearAuthError() {
    const authError = document.getElementById("authError");
    const authInput = document.getElementById("authInput");

    if (authError) {
        authError.textContent = "";
    }

    if (authInput) {
        authInput.classList.remove("input-error");
    }
}

async function checkEmployee() {
    const inputElement = document.getElementById("authInput");
    const authBtn = document.getElementById("authBtn");
    const employeeId = inputElement?.value.trim();

    if (authBtn?.disabled) return;

    if (!employeeId) {
        showAuthError("Введите ID сотрудника");
        return;
    }

    if (!/^\d+$/.test(employeeId)) {
        showAuthError("ID состоит только из цифр");
        return;
    }

    try {
        if (authBtn) {
            authBtn.disabled = true;
            authBtn.textContent = "Проверка...";
        }

        const response = await fetch(
            `${API_BASE}/employees/check?id=${encodeURIComponent(employeeId)}`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.exists === true) {
            showEmployeeId(employeeId);
            saveEmployeeId(employeeId);
            clearAuthError();
            closeModal();
        } else {
            showAuthError("ID не найден. Проверьте идентификатор и попробуйте снова");
        }
    } catch (error) {
        console.error(error);
        showAuthError("Нет связи с сервером. Попробуйте позже");
    } finally {
        if (authBtn) {
            authBtn.disabled = false;
            authBtn.textContent = "Войти";
        }
    }
}

function closeModal() {
    const authOverlay = document.getElementById("authOverlay");

    if (authOverlay) {
        authOverlay.style.display = "none";
    }
}

async function loadMenu() {
    const cardsGrid = document.querySelector(".cards-grid");

    if (!cardsGrid) return;

    cardsGrid.innerHTML = "";

    try {
        const response = await fetch(`${API_BASE}/menu`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const products = await response.json();

        if (!Array.isArray(products)) {
            throw new Error("Некорректный формат ответа API");
        }

        renderMenu(products);
    } catch (error) {
        console.error(error);
        cardsGrid.innerHTML = "<p>Не удалось загрузить меню.</p>";
    }
}

function renderMenu(products) {
    const cardsGrid = document.querySelector(".cards-grid");

    if (!cardsGrid) return;

    cardsGrid.innerHTML = "";

    if (products.length === 0) {
        cardsGrid.innerHTML = "<p>Пока нет доступных товаров.</p>";
        return;
    }

    products.forEach(product => {
        const card = document.createElement("div");
        card.className = "card";

        const imageContainer = document.createElement("div");
        imageContainer.className = "card-image";

        const imagePlaceholder = document.createElement("span");
        imagePlaceholder.textContent = "Фото скоро";

        imageContainer.appendChild(imagePlaceholder);

        const content = document.createElement("div");
        content.className = "card-content";

        const title = document.createElement("h3");
        title.className = "card-title";
        title.textContent = product.name ?? "Без названия";
        title.title = title.textContent;

        const price = document.createElement("p");
        price.className = "card-price";

        const numericPrice = Number(product.price);

        price.textContent = Number.isFinite(numericPrice)
            ? new Intl.NumberFormat("ru-RU", {
                style: "currency",
                currency: "RUB",
                maximumFractionDigits: 2
            }).format(numericPrice)
            : "Цена не указана";

        const button = document.createElement("button");
        button.className = "card-btn";
        button.type = "button";
        button.textContent = "В корзину";
        button.dataset.code = product.code ?? "";

        content.append(title, price, button);
        card.append(imageContainer, content);
        cardsGrid.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("authForm");
    const authInput = document.getElementById("authInput");
    const savedId = getSavedEmployeeId();

    if (savedId) {
        showEmployeeId(savedId);
        closeModal();
    }

    const authBtn = document.getElementById("authBtn");

    if (authForm) {
        authForm.addEventListener("submit", event => {
            event.preventDefault();
            checkEmployee();
        });
    } else {
        if (authBtn) {
            authBtn.addEventListener("click", checkEmployee);
        }

        if (authInput) {
            authInput.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    checkEmployee();
                }
            });
        }
    }

    if (authInput) {
        authInput.addEventListener("input", clearAuthError);
        authInput.focus();
    }

    loadMenu();
});