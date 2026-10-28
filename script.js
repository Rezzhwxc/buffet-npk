document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('authOverlay');
    const input = document.getElementById('authInput');
    const btn = document.getElementById('authBtn');

    // При загрузке страницы сразу блокируем скролл если модалка открыта
    if (overlay && !overlay.classList.contains('hidden')) {
        document.body.classList.add('no-scroll');
    }

    // Клик по кнопке Войти
    btn.addEventListener('click', () => {
        if (input.value.trim() !== '') {
            closeAuthModal();
        } else {
            alert('Введите ID!');
        }
    });

    // Нажатие Enter в поле ввода
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            btn.click();
        }
    });

    function closeAuthModal() {
        overlay.classList.add('hidden');
        document.body.classList.remove('no-scroll');
    }
});