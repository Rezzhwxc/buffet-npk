const CART_KEY = "cart";
const MAX_QTY = 99;

function getCart() {
    try {
        const cart = JSON.parse(localStorage.getItem(CART_KEY));
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
        console.error(error);
    }
}

function addToCart(product) {
    const code = String(product.code ?? "");
    if (!code) return;

    const cart = getCart();
    const item = cart.find(i => i.code === code);

    if (item) {
        item.qty = Math.min(item.qty + 1, MAX_QTY);
    } else {
        cart.push({
            code,
            name: product.name ?? "Без названия",
            price: Number(product.price) || 0,
            qty: 1
        });
    }

    saveCart(cart);
}

function setQty(code, qty) {
    const cart = getCart();
    const item = cart.find(i => i.code === code);
    if (!item) return;

    item.qty = Math.min(Math.max(Math.floor(qty) || 1, 1), MAX_QTY);
    saveCart(cart);
}

function removeFromCart(code) {
    saveCart(getCart().filter(i => i.code !== code));
}

function clearCart() {
    saveCart([]);
}

function getTotals(cart = getCart()) {
    return cart.reduce(
        (acc, i) => ({
            count: acc.count + i.qty,
            total: acc.total + i.qty * i.price
        }),
        { count: 0, total: 0 }
    );
}

function formatPrice(value) {
    return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
}