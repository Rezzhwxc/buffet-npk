// Счетчик
const basketItems = document.querySelectorAll(".basket-item");

basketItems.forEach(item => {
    const minus = item.querySelector(".minus");
    const plus = item.querySelector(".plus");
    const input = item.querySelector('input[type="number"]');

    plus.addEventListener("click", () => {
        input.value = Number(input.value) + 1;
    });

    minus.addEventListener("click", () => {
        if (Number(input.value) > 1) {
            input.value = Number(input.value) - 1;
        }
    });
});

// анимация кнопки
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