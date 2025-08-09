# Influencer Empire — DARK v2
Wersja z poprawioną nawigacją (klik + touch), bez nakładania się elementów i z safe-area na iOS.

## Zmiany
- **Nawigacja:** obsługa `click` i `touchstart`, wysoki `z-index` paska, przyciski `type="button"`.
- **Router:** bezpieczny `show(view)` z walidacją i logami błędów.
- **UI:** padding `env(safe-area-inset-bottom)` pod iOS, lepsza klikalność.

## Jak uruchomić
1. Otwórz `index.html` lokalnie lub hostuj pod HTTPS.
2. Klikaj dolne zakładki: Start / Sklep / Eventy / Ranking / Profil.

## Gdzie dodać reklamy (SDK)
- `showAd(...)` w `app.js` – podmień na Monetag/AdinPlay.
- Hooki: `btnAdCollect`, `btnAdBoost`, `btnAdChest`, oraz zakładka **Promocje**.

Powodzenia! 🚀
