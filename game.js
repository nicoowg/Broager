/* ============================================================
   🌭 PØLSE TOWER DEFENSE
   Et fjollet idle/tower defense-spil.
   Forsvar pølsevognen mod måger, vikinger, cykelbude og Skattefar.
   Ingen dependencies — bare åbn index.html.
   ============================================================ */

(() => {
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

/* ---------- Banen (waypoints fjenderne følger) ---------- */
const PATH = [
  { x: -40, y: 80 },
  { x: 850, y: 80 },
  { x: 850, y: 220 },
  { x: 110, y: 220 },
  { x: 110, y: 360 },
  { x: 850, y: 360 },
  { x: 850, y: 480 },
  { x: 1000, y: 480 },
];
// Kumulative afstande langs stien
const SEG = [];
let PATH_LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const a = PATH[i], b = PATH[i + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  SEG.push({ a, b, len, start: PATH_LEN });
  PATH_LEN += len;
}
function pointAt(dist) {
  if (dist <= 0) return { x: PATH[0].x, y: PATH[0].y };
  for (const s of SEG) {
    if (dist <= s.start + s.len) {
      const t = (dist - s.start) / s.len;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
    }
  }
  const last = PATH[PATH.length - 1];
  return { x: last.x, y: last.y };
}

/* ---------- Byggepladser ---------- */
const SLOTS = [
  { x: 200, y: 150 }, { x: 360, y: 150 }, { x: 520, y: 150 }, { x: 680, y: 150 },
  { x: 240, y: 290 }, { x: 400, y: 290 }, { x: 560, y: 290 }, { x: 720, y: 290 },
  { x: 200, y: 430 }, { x: 360, y: 430 }, { x: 520, y: 430 }, { x: 680, y: 430 },
];

/* ---------- Tårntyper ---------- */
const TOWER_TYPES = {
  ketchup: {
    name: "Ketchup-Kanon", emoji: "🍅", cost: 50,
    range: 110, rate: 0.5, dmg: 8, projColor: "#e74c3c",
    desc: "Skyder klatter af diskount-ketchup. Hurtig, men klistret.",
  },
  sennep: {
    name: "Sennep-Sniper", emoji: "🌶️", cost: 120,
    range: 210, rate: 1.6, dmg: 45, projColor: "#f1c40f",
    desc: "Stærk sennep, lang rækkevidde. Rammer lige i næseborene.",
  },
  grill: {
    name: "Grillmesteren", emoji: "🔥", cost: 200,
    range: 95, rate: 0.6, dmg: 14, aoe: true,
    desc: "Svitser ALT i nærheden. Spørg ikke om hans hygiejnebevis.",
  },
  bedste: {
    name: "Bedstemor Betty", emoji: "👵", cost: 150,
    range: 105, rate: 0, dmg: 0, slow: 0.45,
    desc: "Slår ingen ihjel, men tvinger fjender til at høre om gamle dage (45% langsommere).",
  },
};

/* ---------- Fjendetyper ---------- */
const ENEMY_TYPES = {
  maage:   { name: "Måge",        emoji: "🐦", hp: 22,  speed: 70,  reward: 8,  dmg: 1,  size: 14 },
  cykel:   { name: "Cykelbud",    emoji: "🚴", hp: 35,  speed: 115, reward: 12, dmg: 1,  size: 15 },
  viking:  { name: "Viking",      emoji: "🪓", hp: 70,  speed: 45,  reward: 16, dmg: 2,  size: 16 },
  skat:    { name: "Skattefar",   emoji: "🕴️", hp: 230, speed: 32,  reward: 45, dmg: 4,  size: 17, steals: 25 },
  chef:    { name: "CHEF-MÅGEN",  emoji: "🐦", hp: 900, speed: 34,  reward: 300, dmg: 10, size: 26, boss: true },
};

/* ---------- Idle-opgraderinger ---------- */
const UPGRADES = [
  { id: "tang",    name: "Større Grilltang",  emoji: "🥢", baseCost: 25,  mult: 1.6,
    desc: "+1 pølse pr. klik" },
  { id: "prakt",   name: "Pølse-Praktikant",  emoji: "🧑‍🍳", baseCost: 50,  mult: 1.7,
    desc: "+1 pølse/sek (ulønnet, selvfølgelig)" },
  { id: "fabrik",  name: "Pølsefabrik",       emoji: "🏭", baseCost: 400, mult: 1.8,
    desc: "+8 pølser/sek (lugter i hele byen)" },
];

/* ---------- Sjove beskeder ---------- */
const QUIPS = {
  kill: [
    "En måge mindre. Naturen finder en balance.",
    "Direkte hit! Ketchuppen var ikke engang økologisk.",
    "Vikingens sidste ord: 'ØV.'",
    "Cykelbuddet nåede aldrig frem med din pizza.",
    "Skattefar er væk — fradraget består.",
    "Sennep i øjnene. Klassisk.",
  ],
  leak: [
    "AV! En fjende nåede pølsevognen og stjal en hotdog!",
    "Pølsevognen vakler! Remouladen flyder!",
    "Nogen spiste en pølse UDEN at betale. Barbarisk.",
    "Skattefar tog både pølser OG moms!",
  ],
  wave: [
    "Ny bølge! Mågerne har holdt krisemøde.",
    "De kommer igen. De kan lugte ristede løg.",
    "Bølgen ruller! Hold på grilltangen!",
    "Fjenderne har fået forstærkning fra Sønderborg.",
  ],
  boss: [
    "👑 CHEF-MÅGEN ER HER! Den har taget hele familien med!",
  ],
};

/* ---------- Spiltilstand ---------- */
const state = {
  cash: 30,
  lives: 20,
  wave: 0,
  kills: 0,
  clickPower: 1,
  upgrades: { tang: 0, prakt: 0, fabrik: 0 },
  towers: [],        // { slot, type, level, cooldown, invested }
  enemies: [],
  projectiles: [],
  floaters: [],
  spawnQueue: [],
  spawnTimer: 0,
  waveActive: false,
  selectedShop: null,   // tårntype valgt i butikken
  selectedTower: null,  // indeks i state.towers
  hoverSlot: -1,
  muted: false,
  gameOver: false,
};

function income() {
  return state.upgrades.prakt * 1 + state.upgrades.fabrik * 8;
}
function upgradeCost(u) {
  return Math.floor(u.baseCost * Math.pow(u.mult, state.upgrades[u.id]));
}
function towerDmg(t) {
  const base = TOWER_TYPES[t.type].dmg;
  return Math.round(base * Math.pow(1.35, t.level - 1));
}
function towerRange(t) {
  return TOWER_TYPES[t.type].range * (1 + 0.08 * (t.level - 1));
}
function towerUpCost(t) {
  return Math.floor(TOWER_TYPES[t.type].cost * 0.8 * t.level);
}

/* ---------- Lyd (bittesmå WebAudio-blip) ---------- */
let audioCtx = null;
function blip(freq, dur, type = "square", vol = 0.04) {
  if (state.muted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* lyd er ikke livsvigtigt */ }
}

/* ---------- UI-referencer ---------- */
const ui = {
  cash: document.getElementById("ui-cash"),
  income: document.getElementById("ui-income"),
  lives: document.getElementById("ui-lives"),
  wave: document.getElementById("ui-wave"),
  kills: document.getElementById("ui-kills"),
  click: document.getElementById("ui-click"),
  ticker: document.getElementById("ticker"),
  wavebtn: document.getElementById("wavebtn"),
  shopTowers: document.getElementById("shop-towers"),
  shopUpgrades: document.getElementById("shop-upgrades"),
  towerinfoBox: document.getElementById("towerinfo-box"),
  towerinfo: document.getElementById("towerinfo"),
  gameover: document.getElementById("gameover"),
  gameoverText: document.getElementById("gameover-text"),
};

function say(msg) {
  ui.ticker.textContent = msg;
}
function sayRandom(list) {
  say(list[Math.floor(Math.random() * list.length)]);
}

/* ---------- Butik (tårne) ---------- */
function buildShop() {
  ui.shopTowers.innerHTML = "";
  for (const key of Object.keys(TOWER_TYPES)) {
    const t = TOWER_TYPES[key];
    const btn = document.createElement("button");
    btn.className = "shopbtn";
    btn.id = "shop-" + key;
    btn.innerHTML = `${t.emoji} ${t.name} <span class="cost">${t.cost} 🌭</span><small>${t.desc}</small>`;
    btn.addEventListener("click", () => {
      state.selectedShop = state.selectedShop === key ? null : key;
      state.selectedTower = null;
      refreshShop();
    });
    ui.shopTowers.appendChild(btn);
  }

  ui.shopUpgrades.innerHTML = "";
  for (const u of UPGRADES) {
    const btn = document.createElement("button");
    btn.className = "shopbtn";
    btn.id = "upg-" + u.id;
    btn.addEventListener("click", () => {
      const cost = upgradeCost(u);
      if (state.cash < cost) return;
      state.cash -= cost;
      state.upgrades[u.id]++;
      if (u.id === "tang") state.clickPower++;
      blip(660, 0.08, "triangle");
      refreshShop();
    });
    ui.shopUpgrades.appendChild(btn);
  }
  refreshShop();
}

function refreshShop() {
  for (const key of Object.keys(TOWER_TYPES)) {
    const btn = document.getElementById("shop-" + key);
    btn.disabled = state.cash < TOWER_TYPES[key].cost;
    btn.classList.toggle("selected", state.selectedShop === key);
  }
  for (const u of UPGRADES) {
    const btn = document.getElementById("upg-" + u.id);
    const lvl = state.upgrades[u.id];
    const cost = upgradeCost(u);
    btn.innerHTML = `${u.emoji} ${u.name} <b>lv${lvl}</b> <span class="cost">${cost} 🌭</span><small>${u.desc}</small>`;
    btn.disabled = state.cash < cost;
  }
  refreshTowerInfo();
}

function refreshTowerInfo() {
  if (state.selectedTower === null || !state.towers[state.selectedTower]) {
    ui.towerinfoBox.style.display = "none";
    return;
  }
  const t = state.towers[state.selectedTower];
  const tt = TOWER_TYPES[t.type];
  ui.towerinfoBox.style.display = "block";
  const upCost = towerUpCost(t);
  const sellVal = Math.floor(t.invested * 0.6);
  const maxed = t.level >= 5;
  ui.towerinfo.innerHTML = `
    <div>${tt.emoji} <b>${tt.name}</b> — niveau ${t.level}/5</div>
    <div style="color:var(--muted)">${tt.slow ? "Sløver " + Math.round(tt.slow * 100) + "%" : "Skade: " + towerDmg(t)} · Rækkevidde: ${Math.round(towerRange(t))}</div>
    <div class="row">
      <button id="btn-upgrade" ${maxed || state.cash < upCost ? "disabled" : ""}>⬆️ ${maxed ? "MAX" : "Opgradér (" + upCost + " 🌭)"}</button>
      <button id="btn-sell">💰 Sælg (${sellVal} 🌭)</button>
    </div>`;
  document.getElementById("btn-upgrade").addEventListener("click", () => {
    if (t.level >= 5 || state.cash < upCost) return;
    state.cash -= upCost;
    t.invested += upCost;
    t.level++;
    blip(880, 0.1, "triangle");
    refreshShop();
  });
  document.getElementById("btn-sell").addEventListener("click", () => {
    state.cash += sellVal;
    state.towers.splice(state.selectedTower, 1);
    state.selectedTower = null;
    say("Tårnet er solgt. Håber ikke du fortryder det.");
    blip(220, 0.15, "sawtooth");
    refreshShop();
  });
}

/* ---------- Bølger ---------- */
function waveHpMult(wave) {
  return Math.pow(1.14, wave - 1);
}
function buildWave(wave) {
  const q = [];
  const count = 6 + wave * 2;
  for (let i = 0; i < count; i++) {
    let type = "maage";
    if (wave >= 3 && i % 4 === 1) type = "cykel";
    if (wave >= 5 && i % 5 === 2) type = "viking";
    if (wave >= 8 && i % 7 === 3) type = "skat";
    q.push(type);
  }
  if (wave % 10 === 0) q.push("chef");
  return q;
}

function startWave() {
  if (state.waveActive || state.gameOver) return;
  state.wave++;
  state.spawnQueue = buildWave(state.wave);
  state.spawnTimer = 0;
  state.waveActive = true;
  if (state.wave % 10 === 0) sayRandom(QUIPS.boss);
  else sayRandom(QUIPS.wave);
  blip(440, 0.15, "square");
  updateWaveBtn();
}

function endWave() {
  state.waveActive = false;
  const bonus = 30 + state.wave * 10;
  state.cash += bonus;
  say(`Bølge ${state.wave} klaret! Bonus: ${bonus} 🌭. Fjenderne skriver en dårlig anmeldelse.`);
  blip(660, 0.12, "triangle");
  setTimeout(() => blip(990, 0.15, "triangle"), 120);
  updateWaveBtn();
  save();
}

function updateWaveBtn() {
  if (state.waveActive) {
    ui.wavebtn.textContent = `🌊 BØLGE ${state.wave} I GANG...`;
    ui.wavebtn.disabled = true;
  } else {
    const next = state.wave + 1;
    ui.wavebtn.textContent = (next % 10 === 0 ? "👑 BOSS-BØLGE " : "▶ START BØLGE ") + next;
    ui.wavebtn.disabled = false;
  }
}

function spawnEnemy(typeKey) {
  const et = ENEMY_TYPES[typeKey];
  const mult = waveHpMult(state.wave);
  state.enemies.push({
    type: typeKey,
    hp: et.hp * mult,
    maxHp: et.hp * mult,
    dist: 0,
    slowUntil: 0,
    wobble: Math.random() * Math.PI * 2,
  });
}

/* ---------- Skade og død ---------- */
function damageEnemy(e, dmg) {
  e.hp -= dmg;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    const et = ENEMY_TYPES[e.type];
    state.cash += et.reward;
    state.kills++;
    const p = pointAt(e.dist);
    addFloater(p.x, p.y, "+" + et.reward + " 🌭", "#7bed9f");
    if (Math.random() < 0.25) sayRandom(QUIPS.kill);
    blip(et.boss ? 110 : 330 + Math.random() * 120, 0.08, "square");
    if (et.boss) say("👑 CHEF-MÅGEN ER NEDE! Byen er reddet... indtil videre.");
  }
}

function leak(e) {
  const et = ENEMY_TYPES[e.type];
  state.lives -= et.dmg;
  if (et.steals) {
    const stolen = Math.min(state.cash, et.steals);
    state.cash -= stolen;
    say(`🕴️ Skattefar nåede frem og inddrev ${stolen} pølser i restskat!`);
  } else {
    sayRandom(QUIPS.leak);
  }
  blip(120, 0.25, "sawtooth", 0.06);
  if (state.lives <= 0 && !state.gameOver) {
    gameOver();
  }
}

function gameOver() {
  state.gameOver = true;
  state.lives = 0;
  ui.gameover.style.display = "flex";
  ui.gameoverText.textContent =
    `Pølsevognen er plyndret! Du nåede bølge ${state.wave} og fældede ${state.kills} fjender. ` +
    `Chef-mågen har nu åbnet sin egen pølsevogn på din grund. Den sælger KYLLING.`;
  blip(80, 0.6, "sawtooth", 0.08);
  localStorage.removeItem(SAVE_KEY);
}

/* ---------- Svævende tekst ---------- */
function addFloater(x, y, text, color) {
  state.floaters.push({ x, y, text, color, life: 1 });
}

/* ---------- Opdatering ---------- */
let last = performance.now();
function update(dt) {
  if (state.gameOver) return;

  // Idle-indkomst
  state.cash += income() * dt;

  // Spawn
  if (state.waveActive && state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy(state.spawnQueue.shift());
      state.spawnTimer = Math.max(0.25, 0.9 - state.wave * 0.03);
    }
  }

  // Fjender bevæger sig
  const now = performance.now() / 1000;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const et = ENEMY_TYPES[e.type];
    let speed = et.speed;
    if (e.slowUntil > now) speed *= (1 - e.slowAmount);
    e.dist += speed * dt;
    e.wobble += dt * 6;
    if (e.dist >= PATH_LEN) {
      e.dead = true;
      leak(e);
    }
  }

  // Bedstemor-auraer (sløvning)
  for (const t of state.towers) {
    const tt = TOWER_TYPES[t.type];
    if (!tt.slow) continue;
    const slot = SLOTS[t.slot];
    const range = towerRange(t);
    const slow = Math.min(0.8, tt.slow + 0.05 * (t.level - 1));
    for (const e of state.enemies) {
      if (e.dead) continue;
      const p = pointAt(e.dist);
      if (Math.hypot(p.x - slot.x, p.y - slot.y) <= range) {
        e.slowUntil = now + 0.15;
        e.slowAmount = slow;
      }
    }
  }

  // Tårne skyder
  for (const t of state.towers) {
    const tt = TOWER_TYPES[t.type];
    if (tt.slow) continue;
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    const slot = SLOTS[t.slot];
    const range = towerRange(t);
    // Find fjenden længst fremme inden for rækkevidde
    let target = null;
    for (const e of state.enemies) {
      if (e.dead) continue;
      const p = pointAt(e.dist);
      if (Math.hypot(p.x - slot.x, p.y - slot.y) <= range) {
        if (!target || e.dist > target.dist) target = e;
      }
    }
    if (!target) continue;
    const rate = tt.rate / (1 + 0.1 * (t.level - 1));
    t.cooldown = rate;
    if (tt.aoe) {
      // Grillmesteren svitser alt i rækkevidde
      t.flash = 0.2;
      for (const e of state.enemies) {
        if (e.dead) continue;
        const p = pointAt(e.dist);
        if (Math.hypot(p.x - slot.x, p.y - slot.y) <= range) {
          damageEnemy(e, towerDmg(t));
        }
      }
    } else {
      state.projectiles.push({
        x: slot.x, y: slot.y - 14,
        target, dmg: towerDmg(t), color: tt.projColor,
      });
    }
  }
  for (const t of state.towers) {
    if (t.flash) t.flash = Math.max(0, t.flash - dt);
  }

  // Projektiler
  for (const pr of state.projectiles) {
    if (pr.done) continue;
    if (pr.target.dead) { pr.done = true; continue; }
    const p = pointAt(pr.target.dist);
    const dx = p.x - pr.x, dy = p.y - pr.y;
    const d = Math.hypot(dx, dy);
    const step = 460 * dt;
    if (d <= step + 6) {
      damageEnemy(pr.target, pr.dmg);
      pr.done = true;
    } else {
      pr.x += (dx / d) * step;
      pr.y += (dy / d) * step;
    }
  }
  state.projectiles = state.projectiles.filter(p => !p.done);

  // Ryd døde fjender op
  state.enemies = state.enemies.filter(e => !e.dead);

  // Bølge slut?
  if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
    endWave();
  }

  // Svævende tekst
  for (const f of state.floaters) {
    f.y -= 30 * dt;
    f.life -= dt * 0.8;
  }
  state.floaters = state.floaters.filter(f => f.life > 0);
}

/* ---------- Tegning ---------- */
function draw() {
  // Græs
  ctx.fillStyle = "#2c4a22";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  for (let i = 0; i < 6; i++) ctx.fillRect(0, i * 90, W, 45);

  // Sti
  ctx.strokeStyle = "#b58e5a";
  ctx.lineWidth = 34;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
  ctx.stroke();
  ctx.strokeStyle = "#9c7847";
  ctx.lineWidth = 28;
  ctx.stroke();

  // Pølsevognen (målet)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(890, 440, 64, 40);           // vogn
  ctx.fillStyle = "#ecf0f1";
  ctx.fillRect(890, 452, 64, 8);            // hvid stribe
  ctx.fillStyle = "#7f5539";
  ctx.beginPath(); ctx.arc(905, 484, 7, 0, Math.PI * 2); ctx.fill();  // hjul
  ctx.beginPath(); ctx.arc(940, 484, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();                           // parasol
  ctx.moveTo(886, 440); ctx.lineTo(922, 418); ctx.lineTo(958, 440);
  ctx.closePath(); ctx.fill();
  ctx.font = "16px serif";
  ctx.fillText("🌭", 922, 432);
  ctx.font = "bold 9px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText("PØLSER", 922, 470);

  // Byggepladser
  for (let i = 0; i < SLOTS.length; i++) {
    const s = SLOTS[i];
    const occupied = state.towers.some(t => t.slot === i);
    if (!occupied) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = state.hoverSlot === i && state.selectedShop ? "rgba(255,179,71,0.35)" : "rgba(0,0,0,0.25)";
      ctx.fill();
      ctx.strokeStyle = state.hoverSlot === i ? "#ffb347" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Rækkevidde-cirkel (valgt tårn eller hover ved byggeri)
  if (state.selectedTower !== null && state.towers[state.selectedTower]) {
    const t = state.towers[state.selectedTower];
    drawRange(SLOTS[t.slot], towerRange(t));
  } else if (state.selectedShop && state.hoverSlot >= 0 &&
             !state.towers.some(t => t.slot === state.hoverSlot)) {
    drawRange(SLOTS[state.hoverSlot], TOWER_TYPES[state.selectedShop].range);
  }

  // Tårne
  for (let i = 0; i < state.towers.length; i++) {
    const t = state.towers[i];
    const tt = TOWER_TYPES[t.type];
    const s = SLOTS[t.slot];
    if (t.flash > 0) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, towerRange(t), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,120,30,0.12)";
      ctx.fill();
    }
    ctx.font = "30px serif";
    ctx.fillText(tt.emoji, s.x, s.y);
    // Niveau-prikker
    ctx.fillStyle = "#ffb347";
    for (let l = 0; l < t.level; l++) {
      ctx.beginPath();
      ctx.arc(s.x - 12 + l * 6, s.y + 20, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.selectedTower === i) {
      ctx.strokeStyle = "#ffb347";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Fjender
  const now = performance.now() / 1000;
  for (const e of state.enemies) {
    const et = ENEMY_TYPES[e.type];
    const p = pointAt(e.dist);
    const bob = Math.sin(e.wobble) * 3;
    ctx.font = (et.size * 2) + "px serif";
    if (et.boss) ctx.fillText("👑", p.x, p.y - et.size - 8 + bob);
    ctx.fillText(et.emoji, p.x, p.y + bob);
    if (e.slowUntil > now) {
      ctx.font = "11px serif";
      ctx.fillText("💤", p.x + et.size, p.y - et.size + bob);
    }
    // HP-bar
    const w = et.size * 2.2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(p.x - w / 2, p.y - et.size - 8 + bob, w, 4);
    ctx.fillStyle = e.hp / e.maxHp > 0.4 ? "#7bed9f" : "#ff6b6b";
    ctx.fillRect(p.x - w / 2, p.y - et.size - 8 + bob, w * Math.max(0, e.hp / e.maxHp), 4);
  }

  // Projektiler
  for (const pr of state.projectiles) {
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = pr.color;
    ctx.fill();
  }

  // Svævende tekst
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.fillStyle = f.color;
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

function drawRange(s, range) {
  ctx.beginPath();
  ctx.arc(s.x, s.y, range, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,179,71,0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,179,71,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/* ---------- Input ---------- */
function canvasPos(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * (W / r.width),
    y: (ev.clientY - r.top) * (H / r.height),
  };
}

canvas.addEventListener("mousemove", ev => {
  const p = canvasPos(ev);
  state.hoverSlot = -1;
  for (let i = 0; i < SLOTS.length; i++) {
    if (Math.hypot(SLOTS[i].x - p.x, SLOTS[i].y - p.y) < 22) state.hoverSlot = i;
  }
});

canvas.addEventListener("click", ev => {
  if (state.gameOver) return;
  const p = canvasPos(ev);
  // Klik på eksisterende tårn?
  for (let i = 0; i < state.towers.length; i++) {
    const s = SLOTS[state.towers[i].slot];
    if (Math.hypot(s.x - p.x, s.y - p.y) < 22) {
      state.selectedTower = state.selectedTower === i ? null : i;
      state.selectedShop = null;
      refreshShop();
      return;
    }
  }
  // Klik på tom byggeplads?
  for (let i = 0; i < SLOTS.length; i++) {
    const s = SLOTS[i];
    if (Math.hypot(s.x - p.x, s.y - p.y) < 22 &&
        !state.towers.some(t => t.slot === i)) {
      if (!state.selectedShop) {
        say("Vælg først et tårn i butikken → klik så på byggepladsen.");
        return;
      }
      const tt = TOWER_TYPES[state.selectedShop];
      if (state.cash < tt.cost) {
        say("Ikke nok pølser! Klik på den store pølse eller vent på indkomst.");
        return;
      }
      state.cash -= tt.cost;
      state.towers.push({
        slot: i, type: state.selectedShop, level: 1,
        cooldown: 0, invested: tt.cost, flash: 0,
      });
      addFloater(s.x, s.y - 24, tt.emoji + " bygget!", "#ffb347");
      blip(550, 0.1, "triangle");
      refreshShop();
      return;
    }
  }
  state.selectedTower = null;
  refreshShop();
});

document.getElementById("bigsausage").addEventListener("click", () => {
  if (state.gameOver) return;
  state.cash += state.clickPower;
  blip(880 + Math.random() * 200, 0.04, "sine", 0.03);
  refreshShop();
});

ui.wavebtn.addEventListener("click", startWave);

document.getElementById("restartbtn").addEventListener("click", () => {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
});
document.getElementById("resetbtn").addEventListener("click", () => {
  if (confirm("Nulstil ALT? Mågerne vil grine ad dig.")) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
});
document.getElementById("savebtn").addEventListener("click", () => {
  save();
  say("Spillet er gemt. Pølserne er i sikkerhed. 💾");
});
document.getElementById("mutebtn").addEventListener("click", () => {
  state.muted = !state.muted;
  document.getElementById("mutebtn").textContent = state.muted ? "🔇 Mute" : "🔊 Lyd";
  save();
});

/* ---------- Gem/hent ---------- */
const SAVE_KEY = "polse-td-save-v1";
function save() {
  if (state.gameOver) return;
  const data = {
    cash: Math.floor(state.cash),
    lives: state.lives,
    wave: state.wave,
    kills: state.kills,
    clickPower: state.clickPower,
    upgrades: state.upgrades,
    muted: state.muted,
    towers: state.towers.map(t => ({
      slot: t.slot, type: t.type, level: t.level, invested: t.invested,
    })),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
}
function load() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return; }
  if (!data) return;
  state.cash = data.cash ?? state.cash;
  state.lives = data.lives ?? state.lives;
  state.wave = data.wave ?? 0;
  state.kills = data.kills ?? 0;
  state.clickPower = data.clickPower ?? 1;
  state.muted = data.muted ?? false;
  Object.assign(state.upgrades, data.upgrades || {});
  state.towers = (data.towers || [])
    .filter(t => TOWER_TYPES[t.type] && t.slot >= 0 && t.slot < SLOTS.length)
    .map(t => ({ ...t, cooldown: 0, flash: 0 }));
  if (state.muted) document.getElementById("mutebtn").textContent = "🔇 Mute";
  say("Velkommen tilbage! Pølserne har savnet dig.");
}

/* ---------- UI-opdatering ---------- */
function refreshTopbar() {
  ui.cash.textContent = Math.floor(state.cash).toLocaleString("da-DK");
  ui.income.textContent = income().toLocaleString("da-DK");
  ui.lives.textContent = state.lives;
  ui.wave.textContent = state.wave;
  ui.kills.textContent = state.kills;
  ui.click.textContent = state.clickPower;
}

// Butiksknapper skal låses op når man får råd — tjek periodisk
setInterval(() => { if (!state.gameOver) refreshShop(); }, 500);
setInterval(save, 15000);

/* ---------- Hovedløkke ---------- */
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  update(dt);
  draw();
  refreshTopbar();
  requestAnimationFrame(loop);
}

buildShop();
load();
updateWaveBtn();
refreshTopbar();
requestAnimationFrame(loop);

})();
