const searchInput = document.getElementById("index-search");

function normalizeText(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("ё", "е")
        .trim();
}

function applySearch() {
    const baseList = typeof getFilteredByCategory === "function"
        ? getFilteredByCategory(allProducts)
        : allProducts;

    if (!searchInput) {
        renderMenu(baseList);
        return;
    }

    const query = normalizeText(searchInput.value);

    if (!query) {
        renderMenu(baseList);
        return;
    }

    const words = query.split(/\s+/);

    const found = baseList.filter(product => {
        const name = normalizeText(product.name);
        return words.every(word => name.includes(word));
    });

    renderMenu(found, "Ничего не найдено");
}

function debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

if (searchInput) {
    searchInput.addEventListener("input", debounce(applySearch, 200));
}