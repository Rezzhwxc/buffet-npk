import "dotenv/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import crypto from "crypto";
import express from "express";
import { createCanvas } from "canvas";

const app = express();
app.use(express.json());

// Подставь свои данные для 1С (или задай их через переменные окружения при запуске)
const ONEC_BASE_URL = process.env.ONEC_BASE_URL || "http://100.125.44.46/InfoBase/hs/api";
const API_LOGIN = process.env.API_LOGIN || "";
const API_PASSWORD = process.env.API_PASSWORD || "";
const API_SECRET = process.env.API_SECRET || "";

const CAPTCHA_TTL_MS = 2 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const captchaStore = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [id, item] of captchaStore.entries()) {
        if (item.expiresAt <= now) {
            captchaStore.delete(id);
        }
    }
}, 30 * 1000);

function buildOneCHeaders() {
    const headers = { "Accept": "application/json" };

    if (API_LOGIN && API_PASSWORD) {
        const credentials = Buffer
            .from(`${API_LOGIN}:${API_PASSWORD}`)
            .toString("base64");
        headers["Authorization"] = `Basic ${credentials}`;
    }

    if (API_SECRET) {
        headers["X-Api-Secret"] = API_SECRET;
    }

    return headers;
}

function generateCode(length = 5) {
    let result = "";
    for (let i = 0; i < length; i++) {
        const idx = crypto.randomInt(0, CHARS.length);
        result += CHARS[idx];
    }
    return result;
}

function renderCaptchaImage(code) {
    const width = 180;
    const height = 56;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#18181c";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + Math.random() * 0.25})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }

    for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `rgba(${100 + Math.random() * 140}, ${140 + Math.random() * 100}, 220, 0.45)`;
        ctx.lineWidth = 1.2 + Math.random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.bezierCurveTo(
            Math.random() * width,
            Math.random() * height,
            Math.random() * width,
            Math.random() * height,
            Math.random() * width,
            Math.random() * height
        );
        ctx.stroke();
    }

    const step = width / (code.length + 1);
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const x = step * (i + 1) + (Math.random() * 6 - 3);
        const y = height / 2 + 8 + (Math.random() * 6 - 3);
        const angle = (Math.random() - 0.5) * 0.45;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = "bold 26px monospace";
        ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#8fd3c8";
        ctx.textAlign = "center";
        ctx.fillText(char, 0, 0);
        ctx.restore();
    }

    return canvas.toDataURL("image/png");
}

app.get("/api/captcha/new", (req, res) => {
    const captchaId = crypto.randomUUID();
    const code = generateCode(5);
    const image = renderCaptchaImage(code);

    captchaStore.set(captchaId, {
        code,
        expiresAt: Date.now() + CAPTCHA_TTL_MS,
        attempts: 0
    });

    res.json({ captchaId, image });
});

app.post("/api/employees/check", async (req, res) => {
    const { id, captchaId, captchaCode } = req.body || {};

    if (!id || !/^\d+$/.test(String(id).trim())) {
        return res.status(400).json({ exists: false, error: "Некорректный ID сотрудника" });
    }

    if (!captchaId || !captchaCode) {
        return res.status(400).json({ exists: false, error: "Введите код с картинки" });
    }

    const record = captchaStore.get(String(captchaId));
    if (!record) {
        return res.status(400).json({ exists: false, captchaInvalid: true, error: "Капча устарела, обновите её" });
    }

    if (Date.now() > record.expiresAt) {
        captchaStore.delete(String(captchaId));
        return res.status(400).json({ exists: false, captchaInvalid: true, error: "Время действия капчи истекло" });
    }

    if (String(captchaCode).trim().toUpperCase() !== record.code) {
        record.attempts += 1;
        if (record.attempts >= MAX_ATTEMPTS) {
            captchaStore.delete(String(captchaId));
            return res.status(400).json({ exists: false, captchaInvalid: true, error: "Превышено число попыток, капча обновлена" });
        }
        return res.status(400).json({ exists: false, captchaInvalid: false, error: "Неверный код с картинки" });
    }

    // Код верный — сжигаем капчу до запроса в 1С
    captchaStore.delete(String(captchaId));

    try {
        const headers = buildOneCHeaders();
        const oneCUrl = `${ONEC_BASE_URL}/employees/check?id=${encodeURIComponent(String(id).trim())}`;
        const oneCRes = await fetch(oneCUrl, { method: "GET", headers });
        const rawText = await oneCRes.text();

        let oneCData = {};
        try {
            oneCData = JSON.parse(rawText);
        } catch {
            oneCData = {};
        }

        if (!oneCRes.ok) {
            console.error("1C error:", oneCRes.status, rawText);
            return res.status(502).json({ exists: false, error: "Ошибка ответа 1С" });
        }

        return res.json({ exists: Boolean(oneCData.exists) });
    } catch (err) {
        console.error("1C proxy error:", err);
        return res.status(502).json({ exists: false, error: "Нет связи с 1С" });
    }
});

app.get("/api/menu", async (req, res) => {
    try {
        const headers = buildOneCHeaders();
        const oneCRes = await fetch(`${ONEC_BASE_URL}/menu`, { method: "GET", headers });
        const data = await oneCRes.json();
        res.status(oneCRes.status).json(data);
    } catch (err) {
        console.error("1C menu error:", err);
        res.status(502).json({ error: "Не удалось загрузить меню" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
});