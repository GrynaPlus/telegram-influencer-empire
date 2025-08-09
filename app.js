// Influencer Empire — Dark v3 with Prestige, Trends, Cards, AFK Booster, Avatars
(function(){
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) { tg.ready(); tg.expand && tg.expand(); }

  // Minimal Monetag rewarded call
  function showMonetagReward(onReward){
    if (typeof window.show_9691940 !== 'function'){ 
      toast('Reklama niegotowa (HTTPS/Telegram?/allowlist Monetag)'); 
      return; 
    }
    window.show_9691940()
      .then(()=>{ try{ onReward && onReward(); }catch(e){ console.error(e); } })
      .catch((e)=>{ console.warn('Ad error:', e); toast('Reklama niedostępna, spróbuj ponownie.'); });
  }


  // ----- State -----
  const state = {
    nick: "gość",
    avatar: "avatar1.svg",
    followers: 0, total: 0, perClick: 1,
    level: 1, badges: 0, lastTs: Date.now(),
    boost: { active:false, mult:1, until:0 },
    chest: { next: 0 },
    prestige: { level: 0, mult: 1.0 },
    offline: { capHoursBase: 8, extraToday: 0, lastResetDay: "" },
    trend: { channel: "tiktok", until: 0 },
    sources: [
      { id:"youtube", name:"YouTube", level:0, baseRate:6, rate:0, baseCost:50, cost:50 },
      { id:"tiktok", name:"TikTok", level:0, baseRate:4, rate:0, baseCost:25, cost:25 },
      { id:"instagram", name:"Instagram", level:0, baseRate:3, rate:0, baseCost:20, cost:20 },
      { id:"twitch", name:"Twitch", level:0, baseRate:2, rate:0, baseCost:15, cost:15 },
    ],
    upgrades: {
      sprzet:[
        { id:"kamera4k", name:"Kamera 4K", desc:"+20% followersów", level:0, baseCost:500, cost:500, type:"mult_all", value:0.20 },
        { id:"micro_pro", name:"Mikrofon PRO", desc:"+15% jakości (klik)", level:0, baseCost:300, cost:300, type:"mult_click", value:0.15 },
        { id:"light", name:"Oświetlenie", desc:"+10% nagrywania", level:0, baseCost:250, cost:250, type:"mult_all", value:0.10 },
      ],
      promocje:[
        { id:"ads", name:"Reklama płatna", desc:"x2 przez 5 min (po reklamie)", level:0, baseCost:0, cost:0, type:"ad_boost" },
        { id:"instant", name:"Natychmiastowy zbiór", desc:"Zbierz 1h (po reklamie)", level:0, baseCost:0, cost:0, type:"ad_collect" },
      ],
      ekipa:[
        { id:"montazysta", name:"Montażysta", desc:"+20% offline", level:0, baseCost:800, cost:800, type:"mult_passive", value:0.20 },
        { id:"manager", name:"Menedżer", desc:"+25% sponsorzy", level:0, baseCost:1200, cost:1200, type:"mult_all", value:0.25 },
      ],
      styl:[
        { id:"brand", name:"Branding", desc:"+5% wszystkiego", level:0, baseCost:600, cost:600, type:"mult_all", value:0.05 },
      ]
    },
    multipliers: { all:1, click:1, passive:1 },
    cards: {
      // rarity: common, rare, epic, legendary
      pool: [
        {id:"mic_basic", name:"Mikrofon Basic", rar:"common", set:"audio"},
        {id:"mic_pro", name:"Mikrofon PRO", rar:"rare", set:"audio"},
        {id:"camera_hd", name:"Kamera HD", rar:"common", set:"video"},
        {id:"camera_4k", name:"Kamera 4K", rar:"epic", set:"video"},
        {id:"light_ring", name:"Ring Light", rar:"common", set:"light"},
        {id:"light_soft", name:"Softbox", rar:"rare", set:"light"},
        {id:"editor", name:"Montażysta", rar:"epic", set:"crew"},
        {id:"manager", name:"Menedżer", rar:"legendary", set:"crew"},
      ],
      inv: {}, // id -> count
      sets: {
        audio: { need:2, bonus:0.05, name:"Audio Set" },
        video: { need:2, bonus:0.07, name:"Video Set" },
        light: { need:2, bonus:0.04, name:"Light Set" },
        crew:  { need:2, bonus:0.10, name:"Crew Set" }
      }
    }
  };

  const SAVE_KEY = "influencer_empire_dark_v3";
  const el = s => document.querySelector(s);
  const els = s => document.querySelectorAll(s);
  const todayStr = ()=> new Date().toDateString();

  function fmt(n){ if (n < 1000) return Math.floor(n).toString();
    const u=["K","M","B","T","q"]; let i=-1; while(n>=1000 && i<u.length-1){ n/=1000; i++; }
    return n.toFixed(1).replace(/\.0$/,"")+u[i];
  }

  function load(){ try{ const raw=localStorage.getItem(SAVE_KEY); if(raw) Object.assign(state, JSON.parse(raw)); }catch(e){ console.warn(e);} }
  function save(){ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

  // ------- Systems
  function applyDailyResets(){
    if (state.offline.lastResetDay !== todayStr()){
      state.offline.extraToday = 0;
      state.offline.lastResetDay = todayStr();
    }
  }

  function recalc(){
    // Prestige
    state.prestige.mult = 1 + 0.15 * state.prestige.level;

    // Multipliers from upgrades
    state.multipliers = { all:1, click:1, passive:1 };
    Object.values(state.upgrades).flat().forEach(u=>{
      if (u.level>0){
        if (u.type==="mult_all") state.multipliers.all *= (1 + u.value * u.level);
        if (u.type==="mult_click") state.multipliers.click *= (1 + u.value * u.level);
        if (u.type==="mult_passive") state.multipliers.passive *= (1 + u.value * u.level);
      }
    });

    // Multipliers from sets
    const setCounts = {};
    Object.keys(state.cards.sets).forEach(k=> setCounts[k]=0);
    Object.entries(state.cards.inv).forEach(([id,count])=>{
      if (!count) return;
      const card = state.cards.pool.find(c=> c.id===id);
      if (card) setCounts[card.set] += 1;
    });
    let setBonus = 0;
    Object.entries(state.cards.sets).forEach(([k,info])=>{
      if (setCounts[k] >= info.need) setBonus += info.bonus;
    });
    state.multipliers.all *= (1 + setBonus);

    // Boost and Trend
    const boostMult = state.boost.active ? state.boost.mult : 1;

    // Per click scales with total
    const baseClick = 1 + Math.log10(1 + state.total/100 + 1);
    state.perClick = Math.max(1, baseClick) * state.multipliers.click * state.multipliers.all * state.prestige.mult * boostMult;

    // Sources
    state.sources.forEach(s=>{
      const trendMult = (state.trend.channel === s.id && Date.now() < state.trend.until) ? 2 : 1;
      const base = s.baseRate * s.level;
      s.rate = base * state.multipliers.passive * state.multipliers.all * state.prestige.mult * boostMult * trendMult;
    });
  }

  function offlineEarnings(){
    const now = Date.now();
    const diff = Math.max(0, now - state.lastTs);
    const cap = (state.offline.capHoursBase + state.offline.extraToday) * 60*60*1000;
    const dt = Math.min(diff, cap) / 1000;
    const perSec = state.sources.reduce((a,s)=> a + s.rate/60, 0);
    const gain = perSec * dt;
    state.followers += gain; state.total += gain; state.lastTs = now;
  }

  function tick(){
    const now = Date.now();
    const perSec = state.sources.reduce((a,s)=> a + s.rate/60, 0);
    state.followers += perSec; state.total += perSec;

    if (state.boost.active && now >= state.boost.until){
      state.boost.active = false; state.boost.mult = 1;
    }
    // Auto-rotate trend if ended
    if (now >= state.trend.until){
      rotateTrend();
    }

    ui.update();
    save();
  }

  // ------- Features
  function doPrestige(){
    const req = prestigeRequirement();
    if (state.total < req){ toast("Jeszcze za wcześnie na Prestige."); return; }
    if (!confirm("Resetować progres za stały bonus?")){
      return;
    }
    // Reset economy but keep prestige + avatars + cards
    state.followers = 0; state.total = 0; state.level = 1;
    state.sources.forEach(s=>{ s.level=0; s.cost=s.baseCost; s.rate=0; });
    Object.values(state.upgrades).flat().forEach(u=>{ u.level=0; u.cost=u.baseCost; });
    state.prestige.level += 1;
    recalc();
    toast("Prestige zrobiony! Premia zwiększona.");
  }

  function prestigeRequirement(){
    return 1e6 * (state.prestige.level + 1);
  }

  // Trend rotates every 3 hours
  function rotateTrend(){
    const ids = state.sources.map(s=>s.id);
    const choice = ids[Math.floor(Math.random()*ids.length)];
    state.trend.channel = choice;
    state.trend.until = Date.now() + 3*60*60*1000;
  }

  function extendTrend(){
    showMonetagReward(()=>{
      state.trend.until += 10*60*1000;
      toast("Trend przedłużony o 10 minut!");
    });
  }

  function openChest(){
    const left = state.chest.next - Date.now();
    if (left>0){ toast("Skrzynia jeszcze w cooldownie!"); return; }
    showMonetagReward(()=>{
      // Loot: 1-2 cards, rarity weighted
      const drops = rollCards();
      drops.forEach(id=>{
        state.cards.inv[id] = (state.cards.inv[id]||0) + 1;
      });
      // cooldown 4h
      state.chest.next = Date.now() + 4*60*60*1000;
      recalc();
      ui.renderCollection();
      toast("Zdobyto karty: " + drops.join(", "));
    });
  }

  function rollCards(){
    // weights by rarity
    const weights = { common:60, rare:28, epic:10, legendary:2 };
    function pick(){
      let poolWeighted = [];
      state.cards.pool.forEach(c=>{
        for (let i=0; i<weights[c.rar]; i++) poolWeighted.push(c);
      });
      const idx = Math.floor(Math.random()*poolWeighted.length);
      return poolWeighted[idx].id;
    }
    const count = 1 + (Math.random()<0.35 ? 1 : 0);
    const arr = [];
    for (let i=0;i<count;i++) arr.push(pick());
    return arr;
  }

  function afkBoost(){
    applyDailyResets();
    if (state.offline.extraToday >= 2){ toast("Limit dzienny wyczerpany."); return; }
    showMonetagReward(()=>{
      state.offline.extraToday += 1;
      toast("+1h limitu offline dodane na dziś.");
    });
  }

  // ------- UI Helpers
  const ui = {
    update(){
      // header
      el("#avatarImg").src = "./assets/" + state.avatar;
      el("#followersLabel").textContent = String(Math.floor(state.followers));
      el("#perClickLabel").textContent = `+${String(Math.max(1, Math.floor(state.perClick)))} za klik`;
      el("#levelLabel").textContent = `Poziom ${state.level}`;
      el("#badgeLabel").textContent = `Odznaki: ${state.badges}`;
      el("#nickLabel").textContent = `@${state.nick}`;
      el("#prestigeLvl").textContent = state.prestige.level;
      el("#prestigeMult").textContent = (state.prestige.mult).toFixed(2) + "×";
      el("#prestigeReq").textContent = fmt(prestigeRequirement());

      // boost badge
      if (state.boost.active){
        el("#boostBadge").classList.remove("hidden");
        const left = Math.max(0, state.boost.until - Date.now());
        el("#boostTime").textContent = secs(left/1000);
      } else {
        el("#boostBadge").classList.add("hidden");
      }

      // trend
      const tn = {youtube:"YouTube", tiktok:"TikTok", instagram:"Instagram", twitch:"Twitch"}[state.trend.channel];
      el("#trendName").textContent = tn || "—";
      const tl = Math.max(0, state.trend.until - Date.now());
      el("#trendTime").textContent = secs(tl/1000);

      // AFK booster
      el("#afkUsed").textContent = state.offline.extraToday;

      renderSources();
      renderShop(); // keep active tab indication internally
    },
    renderAvatars(){
      const grid = el("#avatarsGrid"); if (!grid) return;
      const files = ["avatar1.svg","avatar2.svg","avatar3.svg","avatar4.svg","avatar5.svg","avatar6.svg"];
      grid.innerHTML = "";
      files.forEach(fn=>{
        const img = document.createElement("img");
        img.src = "./assets/"+fn;
        img.alt = fn;
        if (state.avatar===fn) img.classList.add("active");
        img.addEventListener("click", ()=>{
          state.avatar = fn;
          ui.renderAvatars();
          ui.update();
          save();
        });
        grid.appendChild(img);
      });
    },
    renderCollection(){
      const grid = el("#collectionGrid"); if (!grid) return;
      grid.innerHTML = "";
      const stats = el("#collectionStats");
      const setCounts = {};
      Object.keys(state.cards.sets).forEach(k=> setCounts[k]=0);
      Object.entries(state.cards.inv).forEach(([id,count])=>{
        if (!count) return;
        const card = state.cards.pool.find(c=> c.id===id);
        if (!card) return;
        const div = document.createElement("div");
        div.className = "cardtile";
        div.innerHTML = `<div class="nm">${card.name}</div><div class="rar">${card.rar}</div><div class="muted">x${count}</div>`;
        grid.appendChild(div);
        setCounts[card.set] += 1;
      });
      let totalBonus = 0, lines=[];
      Object.entries(state.cards.sets).forEach(([k,info])=>{
        const ok = setCounts[k] >= info.need;
        if (ok) totalBonus += info.bonus;
        lines.push(`${info.name}: ${setCounts[k]}/${info.need} ${ok?"✓":""}`);
      });
      stats.textContent = "Bonus zestawów: +" + Math.round(totalBonus*100) + "% • " + lines.join(" • ");
    }
  };

  function secs(s){ s=Math.round(s); const m=Math.floor(s/60), ss=s%60; return `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`; }

  function renderSources(){
    const box = el("#sourcesList"); if(!box) return;
    box.innerHTML = "";
    state.sources.forEach((s, idx)=>{
      const div = document.createElement("div"); div.className="source";
      const title = document.createElement("div"); title.className="title"; title.textContent = s.name;
      const rate = document.createElement("div"); rate.className="rate"; rate.textContent = `${fmt(s.rate)}/min`;
      const grow = document.createElement("div"); grow.className="grow";
      const btn = document.createElement("button"); btn.className="btn primary"; btn.type="button";
      btn.textContent = `Ulepsz (${fmt(s.cost)})`;
      btn.addEventListener("click", ()=> buySourceLevel(idx));
      div.append(title, rate, grow, btn);
      box.appendChild(div);
    });
  }

  let currentShopTab = "sprzet";
  function renderShop(tab){
    if (tab) currentShopTab = tab;
    els(".tab").forEach(t=>{
      t.classList.toggle("active", t.dataset.tab===currentShopTab);
      t.setAttribute("aria-selected", t.dataset.tab===currentShopTab ? "true":"false");
      t.onclick = ()=> renderShop(t.dataset.tab);
    });
    const grid = el("#shopGrid"); if(!grid) return;
    grid.innerHTML = "";
    state.upgrades[currentShopTab].forEach((u, idx)=>{
      const card = document.createElement("div"); card.className="card-shop";
      card.innerHTML = `<div><div class="title">${u.name}</div><div class="muted">${u.desc}</div></div>`;
      const actions = document.createElement("div"); actions.className="row between";
      if (u.type.startsWith("ad_")){
        const b = document.createElement("button"); b.className="btn primary"; b.type="button";
        b.textContent = u.type === "ad_boost" ? "Aktywuj (reklama)" : "Zbierz 1h (reklama)";
        b.onclick = ()=>{
          if (u.type === "ad_boost") showAd(5, ()=> activateBoost(2, 5*60));
          if (u.type === "ad_collect") showAd(5, ()=> instantCollect(60*60));
        };
        actions.appendChild(b);
      }else{
        const b = document.createElement("button"); b.className="btn"; b.type="button";
        b.textContent = `Kup (${fmt(u.cost)}) [lvl ${u.level}]`;
        b.onclick = ()=> buyUpgrade(currentShopTab, idx);
        const price = document.createElement("div"); price.className="price"; price.textContent = `Cena: ${fmt(u.cost)}`;
        actions.append(b, price);
      }
      card.appendChild(actions); grid.appendChild(card);
    });
  }

  // ----- Economy actions
  function buySourceLevel(i){
    const s = state.sources[i];
    if (state.followers >= s.cost){
      state.followers -= s.cost; s.level++; s.cost = Math.ceil(s.baseCost * Math.pow(1.15, s.level));
      levelProgress(); recalc(); ui.update(); save();
    } else { toast("Za mało followersów!"); }
  }
  function buyUpgrade(tab, idx){
    const u = state.upgrades[tab][idx];
    if (state.followers >= u.cost){
      state.followers -= u.cost; u.level++; u.cost = Math.ceil(u.baseCost * Math.pow(1.25, u.level));
      recalc(); ui.update(); save(); toast("Kupiono!");
    } else { toast("Brakuje followersów!"); }
  }
  function levelProgress(){ const target = Math.pow(state.level, 2) * 100; if (state.total >= target){ state.level++; toast(`Awans! Poziom ${state.level}`);} }
  function clickGain(){ const gain = state.perClick; state.followers += gain; state.total += gain; ui.update(); }

  function activateBoost(mult, seconds){ state.boost.active = true; state.boost.mult = mult; state.boost.until = Date.now()+seconds*1000; recalc(); ui.update(); }
  function instantCollect(seconds){ const perSec = state.sources.reduce((a,s)=> a + s.rate/60, 0); const gain = perSec * seconds; state.followers += gain; state.total += gain; ui.update(); }

  // ----- Ad simulation modal
  function showAd(seconds, onDone){
    const modal = el("#modal"); if (!modal) return;
    modal.classList.remove("hidden");
    let t = seconds; el("#adCountdown").textContent = t;
    const iv = setInterval(()=>{
      t--; el("#adCountdown").textContent = t;
      if (t<=0){ clearInterval(iv); onDone && onDone(); toast("Reklama obejrzana ✓"); }
    },1000);
    const close = el("#modalClose");
    const handler = ()=>{ modal.classList.add("hidden"); close.removeEventListener("click", handler); };
    close.addEventListener("click", handler, {once:true});
  }

  function toast(msg){ if (tg && tg.showPopup){ tg.showPopup({title:"Info", message: msg, buttons:[{type:"ok"}]}); } else { console.log("[INFO]", msg); } }

  // ----- Missions
  function dailyMissions(){
    const today = new Date().toDateString();
    const key = "missions_day_v3", last = localStorage.getItem(key);
    if (last !== today){
      const m=[
        { id:"click500", name:"Kliknij 500 razy", goal:500, progress:0, reward: 500 },
        { id:"earn10k", name:"Zdobądź 10k offline", goal:10000, progress:0, reward: 800 },
        { id:"buy3", name:"Kup 3 ulepszenia", goal:3, progress:0, reward: 700 },
      ];
      localStorage.setItem("missions_v3", JSON.stringify(m));
      localStorage.setItem(key, today);
    }
  }
  function renderMissions(){
    const list = JSON.parse(localStorage.getItem("missions_v3")||"[]");
    const ul = el("#missionsList"); if(!ul) return; ul.innerHTML="";
    list.forEach((m, idx)=>{
      const li = document.createElement("li");
      const done = m.progress>=m.goal;
      li.innerHTML = `<strong>${m.name}</strong> — ${Math.min(m.progress,m.goal)}/${m.goal} (${done?"gotowe":"w trakcie"}) <span class="muted">• nagroda: ${fmt(m.reward)}</span> ${done?'<button class="btn primary" data-claim="'+idx+'">Odbierz</button>':''}`;
      ul.appendChild(li);
    });
    ul.querySelectorAll("button[data-claim]").forEach(b=>{
      b.onclick = ()=>{
        const i = parseInt(b.dataset.claim);
        const arr = JSON.parse(localStorage.getItem("missions_v3")||"[]");
        const mm = arr[i];
        if (mm && mm.progress>=mm.goal && !mm.claimed){
          state.followers += mm.reward; state.total += mm.reward; mm.claimed = true;
          localStorage.setItem("missions_v3", JSON.stringify(arr));
          renderMissions(); ui.update(); toast("Nagroda odebrana!");
        }
      };
    });
  }
  function incMission(id, amount){
    const arr = JSON.parse(localStorage.getItem("missions_v3")||"[]");
    const m = arr.find(x=>x.id===id);
    if (m && !m.claimed){ m.progress += amount; localStorage.setItem("missions_v3", JSON.stringify(arr)); renderMissions(); }
  }

  // ----- Navigation & Init
  function show(view){
    if (!view) return;
    const target = el("#view-"+view);
    if (!target){ console.warn("view not found:", view); return; }
    els(".view").forEach(v=> v.classList.add("hidden"));
    target.classList.remove("hidden");
    els(".nav").forEach(n=> n.classList.toggle("active", n.dataset.view===view));
    if (view==="shop") renderShop();
    if (view==="events"){ dailyMissions(); renderMissions(); }
    if (view==="profile"){ ui.renderAvatars(); ui.renderCollection(); }
  }

  function bind(){
    el("#btnClick").addEventListener("click", ()=>{ clickGain(); incMission("click500",1); });
    el("#btnAdCollect").addEventListener("click", ()=> showMonetagReward(()=> instantCollect(60*60)));
    el("#btnAdBoost").addEventListener("click", ()=> showMonetagReward(()=> activateBoost(2,5*60)));
    el("#btnAdChest").addEventListener("click", openChest);
    el("#btnAfkBoost").addEventListener("click", afkBoost);
    el("#btnTrendExtend").addEventListener("click", extendTrend);
    el("#btnPrestige").addEventListener("click", doPrestige);

    els(".nav").forEach(n=>{
      const targetView = n.dataset.view;
      n.addEventListener("click", ()=> show(targetView));
    });
    el("#settingsBtn").addEventListener("click", ()=> show("profile"));

    el("#saveNick").addEventListener("click", ()=>{
      const v = (el("#nickInput").value||"").trim().replace(/\s+/g,"_");
      if (v){ state.nick = v; save(); ui.update(); toast("Zapisano nick"); }
    });
    el("#resetBtn").addEventListener("click", ()=>{
      if (confirm("Na pewno zresetować postęp?")){ localStorage.removeItem(SAVE_KEY); location.reload(); }
    });
  }

  function seedRanking(){
    const names = ["@liva","@karo","@mike","@tomek","@nina","@arek","@zoe","@max","@dex","@lola"];
    const arr = names.map(n=>({nick:n, score: Math.floor(100000*Math.random())})).sort((a,b)=> b.score-a.score).slice(0,10);
    const ol = el("#rankingList"); if(!ol) return; ol.innerHTML="";
    arr.forEach((r,i)=>{ const li = document.createElement("li"); li.textContent = `${i+1}. ${r.nick} — ${fmt(r.score)}`; ol.appendChild(li); });
  }

  function init(){
    load(); applyDailyResets();
    if (!state.trend.until) rotateTrend();
    recalc(); offlineEarnings();
    bind(); seedRanking(); show("start"); ui.update();
    el("#nickInput").value = state.nick;
    setInterval(()=>{ recalc(); tick(); }, 1000);
  }

  window.addEventListener("load", init);
})();