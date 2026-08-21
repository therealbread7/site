# GiftVault site (Vite + React)

Витрина-каталог. Данные — с твоего прокси (Railway), картинки — Fragment.

## Локально
npm i
npm run dev        # http://localhost:5173

## Деплой на Vercel
1. Залей папку site/ в GitHub-репозиторий.
2. vercel.com → Add New → Project → выбери репозиторий.
3. Framework: Vite (определится сам). Build: `npm run build`, Output: `dist`.
4. Deploy. Получишь адрес *.vercel.app с реальными подарками.

## Сменить адрес прокси
В src/GiftVault.jsx строка:  const PROXY = "https://...railway.app";
