# Influencer Empire — DARK v3
Nowe systemy: **Prestige, Trendy, Skrzynie → Karty (kolekcja), AFK Booster, Avatary**.  
Wersja z symulacją reklam (rewarded) i gotowym UI.

## Co dodano
- **Prestige**: reset progresu za stały mnożnik zysków (+15% za poziom).
- **Trendy (3h)**: rotujący buff x2 dla jednego kanału, z opcją **+10 min po reklamie**.
- **Skrzynie kolekcjonerskie**: drop kart (common/rare/epic/legendary) → bonusy zestawów.
- **AFK Booster**: +1h limitu offline, max 2×/dzień (po reklamie).
- **Avatary**: 6 stylów, wybór w Profilu.
- **Kolekcja**: podsumowanie bonusów setowych.

## Uruchomienie
1. Otwórz `index.html` lokalnie, lub hostuj pod HTTPS.
2. W Telegramie dodaj jako WebApp (patrz wcześniejsze README).

## Integracja reklam (SDK)
Podmień `showAd(...)` w `app.js` na SDK (Monetag/AdinPlay). Hooki: `btnAdCollect`, `btnAdBoost`, `btnAdChest`, `btnAfkBoost`, `btnTrendExtend`.

## Balans
- Prestige req: `1e6 * (prestigeLevel+1)` total.
- Set bonusy (stackują się): Audio +5%, Video +7%, Light +4%, Crew +10%.
- Trend: x2 na kanał przez 3h, odświeża się automatycznie po wygaśnięciu.

Powodzenia! 🚀
