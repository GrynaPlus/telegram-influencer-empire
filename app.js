// Influencer Empire — Dark MVP with ad simulation
(function(){
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    tg.ready();
    tg.expand && tg.expand();
    const themeBtn = (tg.themeParams && tg.themeParams.button_color) || null;
    if (themeBtn) document.documentElement.style.setProperty('--accent', themeBtn);
  }

  const state = {
    nick: "gość",
    followers: 0,
    total: 0,
    perClick: 1,
    level: 1,
    badges: 0,
    lastTs: Date.now(),
    boost: { active:false, mult:1, until:0 },
    chest: { next: 0 },
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
    multipliers: { all:1, click:1, passive:1 }
  };

  const SAVE_KEY = "influencer_empire_dark_v1";
  const el = s => document.querySelector(s);
  const els = s => document.querySelectorAll(s);

  function fmt(n){
    if (n < 1000) return Math.floor(n).toString();
    const units = ["K","M","B","T","q"];
    let i = -1;
    while (n >= 1000 && i < units.length-1){
      n /= 1000; i++;
    }
    return n.toFixed(1).replace(/\.0$/,"") + units[i];
  }

  function load(){
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw){
        const saved = JSON.parse(raw);
        Object.assign(state, saved);
      }
    }catch(e){console.warn("load fail", e)}
  }
  function save(){
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function recalc(){
    state.multipliers = { all:1, click:1, passive:1 };
    Object.values(state.upgrades).flat().forEach(u => {
      if (u.level>0){
        if (u.type==="mult_all") state.multipliers.all *= (1 + u.value * u.level);
        if (u.type==="mult_click") state.multipliers.click *= (1 + u.value * u.level);
        if (u.type==="mult_passive") state.multipliers.passive *= (1 + u.value * u.level);
      }
    });
    const boostMult = state.boost.active ? state.boost.mult : 1;
    const baseClick = 1 + Math.log10(1 + state.total/100 + 1);
    state.perClick = Math.max(1, baseClick) * state.multipliers.click * state.multipliers.all * boostMult;

    state.sources.forEach(s => {
      const base = s.baseRate * s.level;
      s.rate = base * state.multipliers.passive * state.multipliers.all * boostMult;
    });
  }

  function offlineEarnings(){
    const now = Date.now();
    const diff = Math.max(0, now - state.lastTs);
    const maxMs = 8*60*60*1000;
    const dt = Math.min(diff, maxMs) / 1000;
    const perSec = state.sources.reduce((acc,s)=> acc + s.rate/60, 0);
    const gain = perSec * dt;
    state.followers += gain;
    state.total += gain;
    state.lastTs = now;
  }

  function tick(){
    const now = Date.now();
    const perSec = state.sources.reduce((acc,s)=> acc + s.rate/60, 0);
    state.followers += perSec;
    state.total += perSec;

    if (state.boost.active && now >= state.boost.until){
      state.boost.active = false;
      state.boost.mult = 1;
      ui.boost(false);
      recalc();
    }

    ui.update();
    save();
  }

  const ui = {
    update(){
      el("#followersLabel").textContent = fmt(state.followers);
      el("#perClickLabel").textContent = `+${fmt(state.perClick)} za klik`;
      el("#levelLabel").textContent = `Poziom ${state.level}`;
      el("#badgeLabel").textContent = `Odznaki: ${state.badges}`;
      el("#nickLabel").textContent = `@${state.nick}`;
      if (state.boost.active){
        el("#boostBadge").classList.remove("hidden");
        const left = Math.max(0, state.boost.until - Date.now());
        el("#boostTime").textContent = secs(left/1000);
      }else{
        el("#boostBadge").classList.add("hidden");
      }
      renderSources();
    },
    boost(active){}
  };

  function secs(s){
    s = Math.round(s);
    const m = Math.floor(s/60);
    const ss = s%60;
    return `${m.toString().padStart(2,"0")}:${ss.toString().padStart(2,"0")}`;
  }

  function renderSources(){
    const box = el("#sourcesList");
    box.innerHTML = "";
    state.sources.forEach((s, idx)=>{
      const div = document.createElement("div");
      div.className = "source";
      const title = document.createElement("div");
      title.className="title"; title.textContent = s.name;
      const rate = document.createElement("div");
      rate.className="rate"; rate.textContent = `${fmt(s.rate)}/min`;
      const grow = document.createElement("div");
      grow.className="grow";
      const btn = document.createElement("button");
      btn.className="btn primary";
      btn.textContent = `Ulepsz (${fmt(s.cost)})`;
      btn.onclick = ()=> buySourceLevel(idx);
      div.append(title, rate, grow, btn);
      box.appendChild(div);
    });
  }

  function renderShop(tab="sprzet"){
    els(".tab").forEach(t => {
      t.classList.toggle("active", t.dataset.tab===tab);
      t.onclick = ()=> renderShop(t.dataset.tab);
    });

    const grid = el("#shopGrid");
    grid.innerHTML = "";
    state.upgrades[tab].forEach((u, idx)=>{
      const card = document.createElement("div");
      card.className="card-shop";
      card.innerHTML = `<div><div class="title">${u.name}</div><div class="muted">${u.desc}</div></div>`;

      const actions = document.createElement("div");
      actions.className="row between";

      if (u.type.startsWith("ad_")){
        const b = document.createElement("button");
        b.className="btn primary";
        b.textContent = u.type === "ad_boost" ? "Aktywuj (reklama)" : "Zbierz 1h (reklama)";
        b.onclick = ()=>{
          if (u.type === "ad_boost") showAd(5, ()=> activateBoost(2, 5*60));
          if (u.type === "ad_collect") showAd(5, ()=> instantCollect(60*60));
        };
        actions.appendChild(b);
      }else{
        const b = document.createElement("button");
        b.className="btn";
        b.textContent = `Kup (${fmt(u.cost)}) [lvl ${u.level}]`;
        b.onclick = ()=> buyUpgrade(tab, idx);
        const price = document.createElement("div");
        price.className="price";
        price.textContent = `Cena: ${fmt(u.cost)}`;
        actions.append(b, price);
      }

      card.appendChild(actions);
      grid.appendChild(card);
    });
  }

  function buySourceLevel(i){
    const s = state.sources[i];
    if (state.followers >= s.cost){
      state.followers -= s.cost;
      s.level++;
      s.cost = Math.ceil(s.baseCost * Math.pow(1.15, s.level));
      levelProgress();
      recalc();
      ui.update();
      save();
    }else{
      toast("Za mało followersów!");
    }
  }

  function buyUpgrade(tab, idx){
    const u = state.upgrades[tab][idx];
    if (state.followers >= u.cost){
      state.followers -= u.cost;
      u.level++;
      u.cost = Math.ceil(u.baseCost * Math.pow(1.25, u.level));
      recalc();
      ui.update();
      save();
      toast("Kupiono!");
    }else{
      toast("Brakuje followersów!");
    }
  }

  function levelProgress(){
    const target = Math.pow(state.level, 2) * 100;
    if (state.total >= target){
      state.level++;
      toast(`Awans! Poziom ${state.level}`);
    }
  }

  function clickGain(){
    const gain = state.perClick;
    state.followers += gain;
    state.total += gain;
    ui.update();
  }

  function activateBoost(mult, seconds){
    state.boost.active = true;
    state.boost.mult = mult;
    state.boost.until = Date.now() + seconds*1000;
    recalc();
    ui.update();
  }

  function instantCollect(seconds){
    const perSec = state.sources.reduce((acc,s)=> acc + s.rate/60, 0);
    const gain = perSec * seconds;
    state.followers += gain;
    state.total += gain;
    ui.update();
  }

  function showAd(seconds, onDone){
    const modal = el("#modal");
    modal.classList.remove("hidden");
    el("#modalTitle").textContent = "Reklama (symulacja)";
    let t = seconds;
    el("#adCountdown").textContent = t;
    const iv = setInterval(()=>{
      t--; el("#adCountdown").textContent = t;
      if (t<=0){
        clearInterval(iv);
        onDone && onDone();
        toast("Reklama obejrzana ✓");
      }
    },1000);
    const close = el("#modalClose");
    const handler = ()=>{ modal.classList.add("hidden"); close.removeEventListener("click", handler); };
    close.addEventListener("click", handler);
  }

  function toast(msg){
    if (tg && tg.showPopup){
      tg.showPopup({title:"Info", message: msg, buttons:[{type:"ok"}]});
    }else{
      console.log("[INFO]", msg);
    }
  }

  function dailyMissions(){
    const today = new Date().toDateString();
    const key = "missions_day";
    const last = localStorage.getItem(key);
    if (last !== today){
      const m = [
        { id:"click500", name:"Kliknij 500 razy", goal:500, progress:0, reward: 200 },
        { id:"earn10k", name:"Zdobądź 10k offline", goal:10000, progress:0, reward: 300 },
        { id:"buy3", name:"Kup 3 ulepszenia", goal:3, progress:0, reward: 250 },
      ];
      localStorage.setItem("missions", JSON.stringify(m));
      localStorage.setItem(key, today);
    }
  }

  function renderMissions(){
    const list = JSON.parse(localStorage.getItem("missions")||"[]");
    const ul = el("#missionsList");
    ul.innerHTML = "";
    list.forEach((m, idx)=>{
      const li = document.createElement("li");
      const done = m.progress>=m.goal;
      li.innerHTML = `<strong>${m.name}</strong> — ${Math.min(m.progress,m.goal)}/${m.goal} (${done?"gotowe":"w trakcie"}) <span class="muted">• nagroda: ${fmt(m.reward)}</span> ${done?'<button class="btn primary" data-claim="'+idx+'">Odbierz</button>':''}`;
      ul.appendChild(li);
    });
    ul.querySelectorAll("button[data-claim]").forEach(b=>{
      b.onclick = ()=>{
        const i = parseInt(b.dataset.claim);
        const arr = JSON.parse(localStorage.getItem("missions")||"[]");
        const mm = arr[i];
        if (mm && mm.progress>=mm.goal && !mm.claimed){
          state.followers += mm.reward;
          state.total += mm.reward;
          mm.claimed = true;
          localStorage.setItem("missions", JSON.stringify(arr));
          renderMissions();
          ui.update();
          toast("Nagroda odebrana!");
        }
      };
    });
  }

  function incMission(id, amount){
    const arr = JSON.parse(localStorage.getItem("missions")||"[]");
    const m = arr.find(x=>x.id===id);
    if (m && !m.claimed){
      m.progress += amount;
      localStorage.setItem("missions", JSON.stringify(arr));
      renderMissions();
    }
  }

  function setupChest(){
    const now = Date.now();
    if (!state.chest.next) state.chest.next = now;
    const cdEl = el("#chestCooldown");
    function update(){
      const left = state.chest.next - Date.now();
      if (left>0){
        cdEl.textContent = "Następna skrzynia za " + secs(left/1000);
      }else{
        cdEl.textContent = "Skrzynia dostępna!";
      }
    }
    setInterval(update, 1000);
    update();
  }

  function show(view){
    els(".view").forEach(v=> v.classList.add("hidden"));
    el("#view-"+view).classList.remove("hidden");
    els(".nav").forEach(n=> n.classList.toggle("active", n.dataset.view===view));
    if (view==="shop") renderShop("sprzet");
    if (view==="events") { dailyMissions(); renderMissions(); }
  }

  function bind(){
    el("#btnClick").addEventListener("click", ()=>{
      clickGain();
      incMission("click500", 1);
    });
    el("#btnAdCollect").addEventListener("click", ()=>{
      showAd(5, ()=> instantCollect(60*60));
    });
    el("#btnAdBoost").addEventListener("click", ()=>{
      showAd(5, ()=> activateBoost(2, 5*60));
    });
    el("#btnAdChest").addEventListener("click", ()=>{
      const left = state.chest.next - Date.now();
      if (left>0) { toast("Jeszcze w cooldownie!"); return; }
      showAd(5, ()=>{
        const isStars = Math.random() < 0.15;
        const amount = isStars ? 5 : 1000 + Math.random()*4000;
        state.followers += isStars ? 0 : amount;
        state.total += isStars ? 0 : amount;
        state.chest.next = Date.now() + 4*60*60*1000;
        toast(isStars ? "Zdobyłeś 5 Gwiazd (placeholder)!" : `Zdobyłeś ${fmt(amount)} followersów!`);
      });
    });

    els(".nav").forEach(n=> n.addEventListener("click", ()=> show(n.dataset.view)));
    el("#settingsBtn").addEventListener("click", ()=> show("profile"));

    el("#saveNick").addEventListener("click", ()=>{
      const v = (el("#nickInput").value||"").trim().replace(/\s+/g,"_");
      if (v){
        state.nick = v;
        ui.update();
        save();
        toast("Zapisano nick");
      }
    });
    el("#resetBtn").addEventListener("click", ()=>{
      if (confirm("Na pewno zresetować postęp?")){
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      }
    });
  }

  function seedRanking(){
    const names = ["@liva","@karo","@mike","@tomek","@nina","@arek","@zoe","@max","@dex","@lola"];
    const arr = names.map((n,i)=>({nick:n, score: Math.floor(100000*Math.random())}))
      .sort((a,b)=> b.score-a.score)
      .slice(0,10);
    const ol = el("#rankingList");
    ol.innerHTML = "";
    arr.forEach((r,i)=>{
      const li = document.createElement("li");
      li.textContent = `${i+1}. ${r.nick} — ${fmt(r.score)}`;
      ol.appendChild(li);
    });
  }

  function init(){
    load();
    recalc();
    offlineEarnings();
    bind();
    setupChest();
    ui.update();
    seedRanking();
    show("start");
    setInterval(tick, 1000);
    el("#nickInput").value = state.nick;
    renderShop("sprzet");
  }

  window.addEventListener("load", init);
})();