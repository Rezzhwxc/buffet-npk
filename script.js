const API_BASE = "/api";
const SESSION_KEY = "employeeId";

const ENDPOINTS = {
    newCaptcha: `${API_BASE}/captcha/new`,
    checkEmployee: `${API_BASE}/employees/check`,
    menu: `${API_BASE}/menu`
};

let allProducts = [];
let activeCategory = "Все";
let currentCaptchaId = "";

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
    const userIdElements = document.querySelectorAll(".menu-user-id");

    userIdElements.forEach(el => {
        el.textContent = `ID: ${id}`;
    });
}

function showAuthError(message, focusTarget = "authInput") {
    const authError = document.getElementById("authError");
    const targetInput = document.getElementById(focusTarget) || document.getElementById("authInput");

    if (authError) {
        authError.textContent = message;
    } else {
        alert(message);
    }

    if (targetInput) {
        targetInput.classList.remove("input-error");
        void targetInput.offsetWidth;
        targetInput.classList.add("input-error");
        targetInput.focus();
        targetInput.select();
    }
}

function clearAuthError() {
    const authError = document.getElementById("authError");
    const authInput = document.getElementById("authInput");
    const captchaInput = document.getElementById("captchaInput");

    if (authError) {
        authError.textContent = "";
    }

    if (authInput) {
        authInput.classList.remove("input-error");
    }

    if (captchaInput) {
        captchaInput.classList.remove("input-error");
    }
}

async function loadCaptcha() {
    const imgEl = document.getElementById("captchaImage");
    const captchaInput = document.getElementById("captchaInput");

    currentCaptchaId = "";
    if (captchaInput) {
        captchaInput.value = "";
    }

    try {
        const res = await fetch(ENDPOINTS.newCaptcha, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!data.captchaId || !data.image) {
            throw new Error("Некорректный ответ капчи");
        }

        currentCaptchaId = data.captchaId;
        if (imgEl) {
            imgEl.src = data.image;
        }
    } catch (error) {
        console.error("Ошибка загрузки капчи:", error);
        showAuthError("Не удалось загрузить капчу. Нажмите ↻");
    }
}

async function checkEmployee() {
    const inputElement = document.getElementById("authInput");
    const captchaInput = document.getElementById("captchaInput");
    const authBtn = document.getElementById("authBtn");

    const employeeId = inputElement?.value.trim();
    const captchaCode = captchaInput?.value.trim();

    if (authBtn?.disabled) return;

    if (!employeeId) {
        showAuthError("Введите ID сотрудника", "authInput");
        return;
    }

    if (!/^\d+$/.test(employeeId)) {
        showAuthError("ID состоит только из цифр", "authInput");
        return;
    }

    if (!currentCaptchaId || !captchaCode) {
        showAuthError("Введите код с картинки", "captchaInput");
        return;
    }

    try {
        if (authBtn) {
            authBtn.disabled = true;
            authBtn.textContent = "Проверка...";
        }

        const response = await fetch(ENDPOINTS.checkEmployee, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                id: employeeId,
                captchaId: currentCaptchaId,
                captchaCode: captchaCode
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (data.captchaInvalid) {
                await loadCaptcha();
            }
            showAuthError(
                data.error || "Ошибка проверки. Попробуйте снова",
                data.captchaInvalid ? "captchaInput" : "captchaInput"
            );
            return;
        }

        if (data.exists === true) {
            showEmployeeId(employeeId);
            saveEmployeeId(employeeId);
            clearAuthError();
            closeModal();
        } else {
            await loadCaptcha();
            showAuthError(
                "ID не найден. Проверьте идентификатор и код с картинки",
                "authInput"
            );
        }
    } catch (error) {
        console.error("Ошибка проверки сотрудника:", error);
        await loadCaptcha();
        showAuthError("Нет связи с сервером. Попробуйте снова", "authInput");
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

function normalizeCategory(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("ё", "е")
        .trim();
}

function getFilteredByCategory(products) {
    if (!activeCategory || normalizeCategory(activeCategory) === "все") {
        return products;
    }

    const target = normalizeCategory(activeCategory);
    return products.filter(product => normalizeCategory(product.category) === target);
}

function initCategoryTabs() {
    const tabs = document.querySelectorAll(".menu-tabs li");
    if (!tabs.length) return;

    tabs.forEach((tab, index) => {
        if (index === 0) {
            tab.classList.add("active");
        }

        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            activeCategory = tab.textContent.trim();

            if (typeof applySearch === "function") {
                applySearch();
            } else {
                renderMenu(getFilteredByCategory(allProducts));
            }
        });
    });
}

async function loadMenu() {
    const cardsGrid = document.querySelector(".cards-grid");

    if (!cardsGrid) return;

    cardsGrid.innerHTML = "<p>Загрузка меню...</p>";

    try {
        const response = await fetch(ENDPOINTS.menu, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const products = await response.json();

        if (!Array.isArray(products)) {
            throw new Error("Некорректный формат ответа API");
        }

        allProducts = products;

        if (typeof applySearch === "function") {
            applySearch();
        } else {
            renderMenu(getFilteredByCategory(products));
        }

    } catch (error) {
        console.error("Ошибка загрузки меню:", error);
        cardsGrid.innerHTML = "<p>Не удалось загрузить меню.</p>";
    }
}

function createProductImage(product) {
    const imageContainer = document.createElement("div");
    imageContainer.className = "card-image";

    const imageUrl = typeof product.image === "string" ? product.image.trim() : "";

    const fallback = document.createElement("span");
    fallback.textContent = "Фото скоро";

    if (!imageUrl) {
        imageContainer.appendChild(fallback);
        return imageContainer;
    }

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = product.name ?? "Товар";
    img.loading = "lazy";

    img.addEventListener("error", () => {
        img.remove();
        imageContainer.appendChild(fallback);
    }, { once: true });

    imageContainer.appendChild(img);
    return imageContainer;
}

function renderMenu(products, emptyText = "Пока нет доступных товаров.") {
    const cardsGrid = document.querySelector(".cards-grid");

    if (!cardsGrid) return;

    cardsGrid.innerHTML = "";

    if (!products.length) {
        cardsGrid.innerHTML = `<p>${emptyText}</p>`;
        return;
    }

    products.forEach(product => {
        const card = document.createElement("div");
        card.className = "card";

        const imageContainer = createProductImage(product);

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

        button.addEventListener("click", () => {
            addToCart(product);

            button.textContent = "Добавлено";
            button.disabled = true;

            setTimeout(() => {
                button.textContent = "В корзину";
                button.disabled = false;
            }, 800);
        });

        content.append(title, price, button);
        card.append(imageContainer, content);
        cardsGrid.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("authForm");
    const authInput = document.getElementById("authInput");
    const captchaInput = document.getElementById("captchaInput");
    const refreshBtn = document.getElementById("refreshCaptchaBtn");
    const savedId = getSavedEmployeeId();

    if (savedId) {
        showEmployeeId(savedId);
        closeModal();
    } else {
        loadCaptcha();
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            clearAuthError();
            loadCaptcha();
        });
    }

    if (authForm) {
        authForm.addEventListener("submit", event => {
            event.preventDefault();
            checkEmployee();
        });
    }

    if (authInput) {
        authInput.addEventListener("input", clearAuthError);
        if (!savedId) {
            authInput.focus();
        }
    }

    if (captchaInput) {
        captchaInput.addEventListener("input", clearAuthError);
    }

    initCategoryTabs();
    loadMenu();
});