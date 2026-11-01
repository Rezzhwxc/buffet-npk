# Buffet NPK

## Установка и запуск проекта

### 1. Установите программы
- [Node.js](https://nodejs.org/) (версия LTS).
- [Visual Studio Code](https://code.visualstudio.com/).

### 2. Скачайте проект
1. Откройте VS Code.
2. Нажмите `Ctrl + Shift + P`.
3. Найдите `Git: Clone`.
4. Вставьте ссылку:

```text
https://github.com/Rezzhwxc/buffet-npk.git
```

5. Выберите папку для сохранения проекта.
6. После загрузки нажмите **Open**.

### 3. Установите зависимости

В VS Code откройте **Terminal → New Terminal** и выполните:

```powershell
npm install
```

### 4. Настройте API

1. В корне проекта создайте файл `.env.local`.
2. Скопируйте в него содержимое `.env.example`.
3. Укажите выданные логин и пароль 1С.

### 5. Запустите сайт

В терминале VS Code выполните:

```powershell
npm run dev
```

Откройте сайт в браузере:

http://localhost:5173/pages/

**Важно:** не закрывайте терминал во время работы сайта. Для остановки нажмите `Ctrl + C`. Не публикуйте файл `.env.local` и не передавайте пароль посторонним.