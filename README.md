# Influencer Empire — Telegram Mini App (Idle Clicker) MVP

To jest gotowy **MVP** gry Idle Clicker działającej jako **Telegram Mini App**.  
Zawiera pełny loop: klikanie, pasywne źródła, ulepszenia, boosty po "reklamie", misje dzienne, skrzynia dzienna, ranking (placeholder) i zapisywanie stanu.

## 1) Jak uruchomić lokalnie
1. Otwórz `index.html` w przeglądarce (działa bez backendu).
2. Klikaj, kupuj ulepszenia, testuj symulacje reklam (modal z odliczaniem).

> **Uwaga:** W Telegramie załaduje się `window.Telegram.WebApp`. Lokalnie jest ignorowany.

## 2) Wdrożenie na produkcję (Telegram Mini App)
1. **Wystaw pliki** na HTTPS (np. Vercel, Netlify, Cloudflare Pages, dowolny serwer www).
2. **Utwórz bota** w @BotFather i skopiuj token.
3. W @BotFather ustaw:
   - `/setdomain` → domena, na której hostujesz grę (HTTPS).
   - `/setmenubutton` → *Web App* i URL do `index.html`.
   - (opcjonalnie) `/setuserpic`, `/setname`, `/setdescription`.
4. Otwieranie gry: link `https://t.me/<TwojBot>?startapp` lub przycisk w menu bota.

## 3) Integracja z API Telegram WebApp
Plik `app.js` wykrywa `window.Telegram.WebApp` i:
- wywołuje `WebApp.ready()` oraz `WebApp.expand()`,
- używa `showPopup` do prostych komunikatów,
- można skonfigurować `MainButton` / `BackButton` (do rozbudowy).

## 4) Monetyzacja reklam (wstaw SDK)
W MVP jest **symulacja rewarded ads** (modal z odliczaniem).  
Podmień funkcję `showAd(seconds, onDone)` na prawdziwe SDK (np. Monetag, AdinPlay).

Punkty integracji (hooks):
- `btnAdCollect` → natychmiastowe zebranie 1h pasywnego dochodu,
- `btnAdBoost` → x2 zyski na 5 min,
- `btnAdChest` → skrzynia z cooldownem 4h,
- Upgrades w zakładce **Promocje** (też wymagają reklamy).

## 5) Ekonomia gry (formuły)
- **Koszt źródeł:** `cost = baseCost * 1.15^level` (zaokrąglone w górę).
- **Klik:** `perClick = log10(1 + total/100 + 1)` × mnożniki.
- **Pasywne:** `rate = baseRate * level` × mnożniki.
- **Mnożniki:** z ulepszeń (sprzęt/ekipa/styl) i z boosta `x2`.
- **Offline earnings:** naliczane przy starcie, z limitem **8 godzin**.
- **Poziom:** cel `level^2 * 100` łącznych followersów.

Wszystkie liczby możesz łatwo dostroić w `app.js`.

## 6) Misje i skrzynia
- Misje dzienne: 3 zadania (kliknięcia, offline, zakupy). Stan w `localStorage`.
- Skrzynia co 4h (reklama wymagana), 15% szans na „Gwiazdy” (placeholder).

## 7) Ranking — integracja z backendem
Tymczasowo jest **placeholder**. API, które możesz wdrożyć (Node/Python/PHP):
- `POST /score` → body: `{ user_id, nick, score }`
- `GET /ranking?period=weekly` → `[{nick, score}]`
- `GET /me?user_id=...` → `{nick, score, rank}`

W Telegramie wyciągnij `initDataUnsafe.user.id` i podpisuj requesty **hash**em (patrz: dokumentacja Telegram Web Apps).

## 8) GrynaPlus / nagrody (opcjonalnie)
Dodaj webhook:
- `POST https://<twoj-serwer>/gnp/award` → `{ user_id, nick, reason, value }`
Wywołuj np. po ukończeniu misji dziennych lub po otwarciu skrzyni.

## 9) Struktura plików
```
/ (hosting root)
  index.html
  styles.css
  app.js
  /assets
    avatar.svg
    gear.svg
```
Możesz dodać Service Workera i wersjonowanie zasobów dla PWA/offline.

## 10) Roadmap (szybkie rozszerzenia)
- Skórki/ubrania influencera (wizualny progres).
- Wydarzenia weekendowe z unikalnym buffem i tablicą wyników eventu.
- Gildie (wspólny viral): wspólne misje, premie za aktywność.
- Prawdziwy sklep premium (Gwiazdy) → płatności Telegram Stars lub Stripe (poza Telegramem).
