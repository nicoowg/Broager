/* Headless logik-test: kører den RIGTIGE game.js i en let DOM-stub. */
const fs = require("fs");
const vm = require("vm");

// ---- Minimal DOM/browser-stub ----
const noop = () => {};
function fakeEl() {
  return {
    style: {}, dataset: {}, textContent: "", innerHTML: "",
    classList: { add: noop, remove: noop, toggle: noop },
    addEventListener: noop, removeEventListener: noop,
    getBoundingClientRect: () => ({ width: 360, height: 360, top: 0, left: 0 }),
    querySelectorAll: () => [],
    getContext: () => new Proxy({}, { get: () => noop }),
    width: 0, height: 0,
  };
}
const elements = {};
const document = {
  getElementById: (id) => (elements[id] ||= fakeEl()),
  querySelectorAll: () => [],
  addEventListener: noop,
  get hidden() { return false; },
};
const store = {};
const window = {
  addEventListener: noop, removeEventListener: noop,
  devicePixelRatio: 2,
  localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
  navigator: { vibrate: noop },
  requestAnimationFrame: noop,
  AudioContext: function () { return new Proxy({}, { get: () => noop }); },
};
const ctx = {
  window, document,
  localStorage: window.localStorage,
  navigator: window.navigator,
  requestAnimationFrame: noop,
  Math, Date, JSON, console, parseInt, parseFloat, Object, Array, isNaN,
};
ctx.globalThis = ctx;
ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../game.js", "utf8"), ctx);

const api = ctx.window.__snake;
let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name); }
}

// ---- Start spillet ----
api.startGame();
ok("starter i spil-tilstand", api.state === "playing");
ok("slange har 3 led ved start", api.snake.length === 3);
ok("der er mad på brættet", !!api.food);

// ---- Bevægelse til højre ----
const head0 = { ...api.snake[0] };
api.step();
ok("hovedet rykker én celle mod højre", api.snake[0].x === head0.x + 1 && api.snake[0].y === head0.y);
ok("længden er uændret uden mad", api.snake.length === 3);

// ---- Spis mad: læg æble lige foran hovedet ----
const h = api.snake[0];
api.setFood(h.x + 1, h.y);
const before = api.snake.length;
const score0 = api.score;
api.step();
ok("slange vokser når den spiser", api.snake.length === before + 1);
ok("score stiger med 1", api.score === score0 + 1);
ok("nyt æble er ikke oven i slangen",
   !api.snake.some((s) => api.food && s.x === api.food.x && s.y === api.food.y));

// ---- Kan ikke vende 180° ----
api.setDir(0, 1); // ned, lovligt
api.step();
api.setDir(0, -1); // forsøg straks tilbage = ulovligt
const hy = api.snake[0].y;
api.step();
ok("kan ikke vende direkte 180°", api.snake[0].y === hy + 1);

// ---- Væg-kollision => game over ----
api.startGame();
api.setDir(0, -1); // op mod toppen
let guard = 0;
while (api.state === "playing" && guard++ < 100) api.step();
ok("rammer væggen og taber", api.state === "over");

// ---- Selv-kollision => game over ----
api.startGame();
// gør slangen lang nok til at kunne bide sig selv (fodr den lige frem)
for (let i = 0; i < 6; i++) {
  const hh = api.snake[0];
  api.setFood(hh.x + 1, hh.y);
  api.step();
}
ok("slangen er vokset", api.snake.length >= 8);
// lav en tæt løkke: ned, venstre, op => rammer egen krop
api.setDir(0, 1); api.step();
api.setDir(-1, 0); api.step();
api.setDir(0, -1); api.step();
ok("rammer sig selv og taber", api.state === "over");

console.log(`\n${pass} bestået, ${fail} fejlet`);
process.exit(fail ? 1 : 0);
