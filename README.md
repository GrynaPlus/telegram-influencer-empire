# Influencer Empire — DARK (Telegram Mini App)
Pełny, gotowy **MVP** w ciemnym motywie z symulacją reklam (rewarded).

## Co jest w środku
- Kliker + źródła pasywne (YT, TikTok, IG, Twitch)
- Sklep (Sprzęt/Promocje/Ekipa/Styl), misje dzienne, skrzynia co 4h
- Symulacja reklam: modal z odliczaniem (5 s), hooki pod SDK
- Ranking (placeholder), profil, zapis stanu (localStorage)
- Kontrastowy, czytelny **dark UI**

## Jak uruchomić lokalnie
1. Otwórz `index.html` w przeglądarce.
2. Klikaj i testuj flow „reklam” (symulacja).

## Wdrożenie do Telegrama
1. Wystaw pliki pod HTTPS (Vercel/Netlify/Cloudflare Pages itp.).
2. W @BotFather ustaw domenę (`/setdomain`) i przycisk WebApp (`/setmenubutton`).
3. Wejście: `https://t.me/<TwojBot>?startapp`

## Integracja prawdziwych reklam
Podmień funkcję `showAd(seconds, onDone)` w `app.js` na SDK (np. Monetag/AdinPlay). Punkty wywołań:
- `#btnAdCollect` – zbiór 1h pasywu,
- `#btnAdBoost` – BOOST x2 na 5 min,
- `#btnAdChest` – skrzynia z cooldownem 4h,
- zakładka **Promocje** w sklepie.

## Backend rankingowy (opcjonalnie)
- `POST /score` → `{ user_id, nick, score }`
- `GET /ranking?period=weekly` → `[{nick, score}]`
- `GET /me?user_id=...` → `{nick, score, rank}`
Podpisuj `initData` z Telegrama (WebApp).

Powodzenia! 🚀
