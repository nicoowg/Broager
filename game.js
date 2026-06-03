/* Broager Snake — et lille iPhone-venligt slangespil (PWA).
   Ingen frameworks, bare canvas + touch. */
(() => {
  "use strict";

  // ---------- DOM ----------
  const canvas   = document.getElementById("board");
  const ctx      = canvas.getContext("2d");
  const scoreEl  = document.getElementById("score");
  const bestEl   = document.getElementById("best");
  const overlay  = document.getElementById("overlay");
  const oTitle   = document.getElementById("overlay-title");
  const oText    = document.getElementById("overlay-text");
  const playBtn  = document.getElementById("play-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const stage    = document.getElementById("stage");

  // ---------- Konfiguration ----------
  const GRID = 17;          // antal celler på den korte led (ca. kvadratisk bræt)
  const BASE_SPEED = 7;     // skridt pr. sekund ved start
  const MAX_SPEED  = 16;    // hurtigste tempo
  const BEST_KEY   = "broager-snake-best";

  // ---------- Tilstand ----------
  let cols = GRID, rows = GRID, cell = 20, dpr = 1;
  let snake, dir, nextDir, food, score, best, speed;
  let acc = 0, last = 0, running = false, state = "menu"; // menu | playing | paused | over
  let pulse = 0; // til mad-animation

  best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
  bestEl.textContent = best;

  // ---------- Layout / retina-skarp canvas ----------
  function layout() {
    const rect = stage.getBoundingClientRect();
    const pad = 0;
    const availW = Math.max(120, rect.width - pad);
    const availH = Math.max(120, rect.height - pad);

    // Hold cellerne kvadratiske; vælg gitter så det passer i den tilgængelige plads.
    const size = Math.min(availW, availH);
    cell = Math.floor(size / GRID);
    cols = Math.max(8, Math.floor(availW / cell));
    rows = Math.max(8, Math.floor(availH / cell));

    const boardW = cols * cell;
    const boardH = rows * cell;

    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width  = boardW + "px";
    canvas.style.height = boardH + "px";
    canvas.width  = Math.round(boardW * dpr);
    canvas.height = Math.round(boardH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    draw();
  }

  // ---------- Spil-logik ----------
  function reset() {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    snake = [
      { x: cx,     y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    speed = BASE_SPEED;
    acc = 0;
    placeFood();
    updateScore();
  }

  function placeFood() {
    const free = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
    }
    food = free.length ? free[(Math.random() * free.length) | 0] : null;
  }

  function setDir(nx, ny) {
    // forbyd at vende 180° direkte
    if (nx === -dir.x && ny === -dir.y) return;
    // undgå at lægge to ens svingninger i kø
    if (nx === nextDir.x && ny === nextDir.y) return;
    nextDir = { x: nx, y: ny };
  }

  function step() {
    dir = nextDir;
    const head = snake[0];
    const nx = head.x + dir.x;
    const ny = head.y + dir.y;

    // kollision med vægge eller egen krop = game over
    const hitWall = nx < 0 || ny < 0 || nx >= cols || ny >= rows;
    const hitSelf = snake.some((s, i) => i < snake.length - 1 && s.x === nx && s.y === ny);
    if (hitWall || hitSelf) {
      gameOver();
      return;
    }

    snake.unshift({ x: nx, y: ny });

    if (food && nx === food.x && ny === food.y) {
      score += 1;
      updateScore();
      buzz(12);
      blip(660 + Math.min(score, 20) * 18);
      speed = Math.min(MAX_SPEED, BASE_SPEED + score * 0.35);
      placeFood();
      if (!food) { win(); return; } // brættet fyldt = vundet!
    } else {
      snake.pop();
    }
  }

  function updateScore() {
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem(BEST_KEY, String(best));
    }
  }

  // ---------- Tegning ----------
  function draw() {
    const W = cols * cell, H = rows * cell;
    ctx.clearRect(0, 0, W, H);

    // svagt gitter
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < cols; x++) { ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, H); }
    for (let y = 1; y < rows; y++) { ctx.moveTo(0, y * cell); ctx.lineTo(W, y * cell); }
    ctx.stroke();

    // mad (pulserende æble)
    if (food) {
      const p = 1 + Math.sin(pulse) * 0.08;
      const r = (cell * 0.34) * p;
      const fx = food.x * cell + cell / 2;
      const fy = food.y * cell + cell / 2;
      ctx.save();
      ctx.shadowColor = "rgba(255,77,109,0.8)";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#ff4d6d";
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // lille blad
      ctx.fillStyle = "#34e36b";
      ctx.beginPath();
      ctx.ellipse(fx + r * 0.5, fy - r * 0.9, r * 0.35, r * 0.18, -0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // slange
    if (snake) {
      for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        const t = i / Math.max(1, snake.length - 1); // 0 = hoved
        const px = s.x * cell, py = s.y * cell;
        const inset = Math.max(1.5, cell * 0.08);
        const isHead = i === 0;

        ctx.fillStyle = isHead
          ? "#8effb0"
          : mix("#34e36b", "#1f9f4d", t);
        if (isHead) {
          ctx.save();
          ctx.shadowColor = "rgba(52,227,107,0.7)";
          ctx.shadowBlur = 14;
        }
        roundRect(px + inset, py + inset, cell - inset * 2, cell - inset * 2, cell * 0.28);
        ctx.fill();
        if (isHead) {
          ctx.restore();
          drawEyes(px, py);
        }
      }
    }
  }

  function drawEyes(px, py) {
    const e = cell * 0.13;
    const off = cell * 0.26;
    const cxp = px + cell / 2, cyp = py + cell / 2;
    // øjne peger i bevægelsesretningen
    const ex = dir.x * cell * 0.12;
    const ey = dir.y * cell * 0.12;
    const perpX = dir.y, perpY = dir.x;
    ctx.fillStyle = "#05210f";
    for (const sgn of [-1, 1]) {
      const x = cxp + ex + perpX * off * sgn;
      const y = cyp + ey + perpY * off * sgn;
      ctx.beginPath();
      ctx.arc(x, y, e, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function mix(a, b, t) {
    const ca = hex(a), cb = hex(b);
    const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
    const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
    const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---------- Spil-løkke ----------
  function loop(ts) {
    if (!running) return;
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.25) dt = 0.25; // efter at have været i baggrunden

    pulse += dt * 6;

    if (state === "playing") {
      acc += dt;
      const stepTime = 1 / speed;
      while (acc >= stepTime) {
        acc -= stepTime;
        step();
        if (state !== "playing") break;
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  function startLoop() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(loop);
  }

  // ---------- Tilstands-skift ----------
  function startGame() {
    layout();
    reset();
    state = "playing";
    hideOverlay();
    startLoop();
    buzz(10);
  }

  function gameOver() {
    state = "over";
    buzz([20, 40, 60]);
    showOverlay("Game Over", `Du fik <b>${score}</b> point.<br />` +
      (score >= best && score > 0 ? "🏆 Ny rekord!" : `Bedste: ${best}`) +
      "<br /><br />Tryk for at spille igen.", "Igen");
  }

  function win() {
    state = "over";
    showOverlay("Du vandt! 🎉", "Du fyldte hele brættet! Vildt.<br />Tryk for at spille igen.", "Igen");
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      showOverlay("Pause", "Tryk for at fortsætte.", "Fortsæt");
    } else if (state === "paused") {
      state = "playing";
      hideOverlay();
      last = 0;
    }
  }

  function showOverlay(title, text, btn) {
    oTitle.textContent = title;
    oText.innerHTML = text;
    playBtn.textContent = btn;
    overlay.classList.remove("hidden");
  }
  function hideOverlay() { overlay.classList.add("hidden"); }

  function onPlay() {
    if (state === "paused") { togglePause(); return; }
    startGame();
  }

  // ---------- Input: tastatur (desktop test) ----------
  const KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (state === "menu" || state === "over") onPlay();
      else togglePause();
      return;
    }
    const k = KEYS[e.key];
    if (k) { e.preventDefault(); setDir(k[0], k[1]); }
  });

  // ---------- Input: swipe på brættet ----------
  let touchStart = null;
  function onTouchStart(e) {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    touchStart = { x: t.clientX, y: t.clientY, t: Date.now() };
  }
  function onTouchEnd(e) {
    if (!touchStart) return;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const dist = Math.hypot(dx, dy);

    if (dist < 18) {
      // et tap (ikke et swipe): brug til at starte/pause
      if (state === "menu" || state === "over") onPlay();
      else togglePause();
    } else if (adx > ady) {
      setDir(dx > 0 ? 1 : -1, 0);
    } else {
      setDir(0, dy > 0 ? 1 : -1);
    }
    touchStart = null;
  }
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd, { passive: true });
  canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // ---------- Input: D-pad ----------
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  document.querySelectorAll(".dpad[data-dir]").forEach((b) => {
    const fire = (e) => {
      e.preventDefault();
      const d = DIRS[b.dataset.dir];
      setDir(d[0], d[1]);
      buzz(6);
    };
    b.addEventListener("touchstart", fire, { passive: false });
    b.addEventListener("click", fire);
  });
  pauseBtn.addEventListener("click", (e) => { e.preventDefault(); if (state === "playing" || state === "paused") togglePause(); });

  playBtn.addEventListener("click", onPlay);

  // ---------- Pause når app går i baggrunden ----------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing") togglePause();
  });

  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", () => setTimeout(layout, 150));

  // ---------- Haptik + lyd (diskret) ----------
  function buzz(p) { if (navigator.vibrate) navigator.vibrate(p); }
  let audio = null;
  function blip(freq) {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.16);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.18);
    } catch (_) { /* lyd er valgfrit */ }
  }

  // ---------- Service worker (offline / installerbar) ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // ---------- Start ----------
  layout();
  draw();
  startLoop();
  // expose lidt til evt. test
  window.__snake = {
    setDir, step, startGame, placeFood,
    get state() { return state; },
    get score() { return score; },
    get snake() { return snake; },
    get food() { return food; },
    setFood(x, y) { food = { x, y }; },
    get grid() { return { cols, rows }; },
  };
})();
