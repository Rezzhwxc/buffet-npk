const searchInput = document.getElementById('index-search');

function normalizeText(value) {
    return String(value ?? "")
        .toLowerCase()
        .replaceAll("ё", "е")
        .trim();
}

function applySearch() {
    if (!searchInput) return;

    const query = normalizeText(searchInput.value);

    if (!query) {
        renderMenu(allProducts);
        return;
    }

    // "кофе латте" найдёт товар, где есть оба слова в любом порядке
    const words = query.split(/\s+/);

    const found = allProducts.filter(product => {
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