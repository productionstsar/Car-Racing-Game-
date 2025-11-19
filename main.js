/* main.js — Fixed production script for "Doge — The Car Game" */

/* ---------------------- Helpers ---------------------- */
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

/* ---------------------- DOM refs (match index.html) ---------------------- */
const loader = $('loader');
const loaderProgress = $('loader-progress');

const topStatsHigh = $('uiHigh');
const topStatsCoins = $('uiCoins');

const btnPlay = $('btnPlay');
const btnGarage = $('btnGarage');
const btnMusic = $('btnMusic');
const btnTheme = $('btnTheme');

const btnBackMode = $('btnBackMode');
const btnAdventure = $('btnAdventure');
const btnEndless = $('btnEndless');

const btnBackEndless = $('btnBackEndless');
const btnEasy = $('btnEasy');
const btnMedium = $('btnMedium');
const btnHard = $('btnHard');
const btnExtreme = $('btnExtreme');

const btnBackSeasons = $('btnBackSeasons');
const btnSummer = $('btnSummer');
const btnWinter = $('btnWinter');
const btnAutumn = $('btnAutumn');
const btnRainy = $('btnRainy');

const btnBackLevels = $('btnBackLevels');
const levelList = $('levelList');

const btnBackGarage = $('btnBackGarage');
const garageList = $('garageList');
const garageCoins = $('garageCoins');

const gameScreen = $('gameScreen');
const canvas = $('gameCanvas');
const gameScoreEl = $('gameScore');
const gameCoinsEl = $('gameCoins');
const btnPause = $('btnPause');

const pauseOverlay = $('pauseOverlay');
const popupMessage = $('popupMessage');
const popupBtn1 = $('popupBtn1');
const popupBtn2 = $('popupBtn2');

/* Defensive checks */
if(!canvas){ console.error('Missing #gameCanvas element'); }
if(!levelList){ console.error('Missing #levelList element'); }

/* --- Step 1: Early Poki SDK fallback + global error handlers --- */
// Early PokiSDK fallback so any early references are safe
if (!window.PokiSDK) {
  window.PokiSDK = {
    init: async function(){ return; },
    gameLoadingStart() {},
    gameLoadingFinished() {},
    gameplayStart() {},
    gameplayStop() {},
    commercialBreak: async () => {},
    rewardedBreak: async () => ({ success: false })
  };
}

// Global error handlers to avoid uncaught errors in QA console
window.addEventListener('error', function(e){
  console.error('Global error caught:', e && e.message, 'at', e && e.filename + ':' + e && e.lineno);
});
window.addEventListener('unhandledrejection', function(e){
  console.warn('Unhandled promise rejection:', e && e.reason);
});

/* ---------------------- Storage keys & state ---------------------- */
const STORAGE = {
  coins: 'doge_coins_v_final2',
  high: 'doge_high_v_final2',
  owned: 'doge_owned_v_final2',
  selected: 'doge_selected_v_final2',
  progress: 'doge_progress_v_final2',
  theme: 'doge_theme_v1'
};

const state = {
  coins: Number(localStorage.getItem(STORAGE.coins) || 0),
  high: Number(localStorage.getItem(STORAGE.high) || 0),
  owned: (()=>{ try { return JSON.parse(localStorage.getItem(STORAGE.owned) || '[]'); } catch(e){ return []; } })(),
  selected: localStorage.getItem(STORAGE.selected) || null,
  progress: (()=>{ try { return JSON.parse(localStorage.getItem(STORAGE.progress) || '{}'); } catch(e){ return {}; } })(),
  theme: localStorage.getItem(STORAGE.theme) || 'light' // 'light' or 'dark'
};
// -------- Step 2: rewarded-ad progress tracking --------
// load ad-watching progress (how many rewarded ads watched per car)
state.adProgress = (() => {
  try {
    return JSON.parse(localStorage.getItem('doge_ads_progress') || '{}');
  } catch(e) {
    return {};
  }
})();

// helper to save ad progress
function saveAdProgress() {
  try {
    localStorage.setItem('doge_ads_progress', JSON.stringify(state.adProgress || {}));
  } catch(e) {
    console.warn('Failed to save ad progress', e);
  }
}

// defaults
if(!Array.isArray(state.owned) || state.owned.length === 0){
  state.owned = ['red'];
  localStorage.setItem(STORAGE.owned, JSON.stringify(state.owned));
}
if(!state.selected){ state.selected = 'red'; localStorage.setItem(STORAGE.selected, state.selected); }

/* ---------------------- Catalogs & assets ---------------------- */
const CAR_CATALOG = [
  {id:'red', name:'Red Racer', price:0, ads:0, src:'assets/cars/red.webp'},
  {id:'yellow', name:'Yellow Comet', price:200, ads:3, src:'assets/cars/yellow.webp'},
  {id:'blue', name:'Blue Bullet', price:500, ads:6, src:'assets/cars/blue.webp'},
  {id:'green', name:'Green Flash', price:1000, ads:8, src:'assets/cars/green.webp'},
  {id:'purple', name:'Violet Vroom', price:2000, ads:10, src:'assets/cars/purple.webp'}
];

const OBSTACLES = [
  'assets/obstacles/barrel.png',
  'assets/obstacles/car1.png',
  'assets/obstacles/car2.png',
  'assets/obstacles/car3.png',
  'assets/obstacles/car4.png',
  'assets/obstacles/cone.png',
  'assets/obstacles/oil.png'
];

const AUDIO_MUSIC = 'assets/highway-to-hell.mp3'; // optional mp3

/* ---------------------- Preload images ---------------------- */
const Images = {};

// --- FIXED STEP 4: Correct Asset Loader ---
// --- FIXED: preloadAssets stores Image objects into Images[src]
async function preloadAssets() {
  return new Promise((resolve) => {
    const assetList = [
      // car images (must match CAR_CATALOG src values)
      "assets/cars/blue.webp",
      "assets/cars/green.webp",
      "assets/cars/purple.webp",
      "assets/cars/red.webp",
      "assets/cars/yellow.webp",

      // obstacle images (must match OBSTACLES entries)
      "assets/obstacles/barrel.png",
      "assets/obstacles/car1.png",
      "assets/obstacles/car2.png",
      "assets/obstacles/car3.png",
      "assets/obstacles/car4.png",
      "assets/obstacles/cone.png",
      "assets/obstacles/oil.png",

      // optional audio
      "assets/highway-to-hell.mp3"
    ];

    let loaded = 0;
    const total = assetList.length;

    function updateLoader() {
      preloadLoaded = loaded; // update debug var if you use it
      const percent = Math.round((loaded / total) * 100);
      const bar = document.getElementById("loader-progress");
      if (bar) bar.style.width = percent + "%";
      // resolve when all done
      if (loaded >= total) {
        console.log("All assets loaded (" + total + ")");
        resolve();
      }
    }

    assetList.forEach(src => {
      if (src.endsWith(".mp3") || src.endsWith(".wav") || src.endsWith(".ogg")) {
        // load audio file (don't keep a reference here; initBackgroundMusic will create Audio)
        const a = new Audio();
        a.onloadeddata = () => { loaded++; updateLoader(); };
        a.onerror = () => { console.warn("Audio load failed:", src); loaded++; updateLoader(); };
        a.src = src;
        return;
      }

      // image: create Image object and store in Images map using full path as key
      const img = new Image();
      img.onload = () => {
        Images[src] = img;    // <-- CRITICAL: store the loaded Image object
        loaded++;
        updateLoader();
      };
      img.onerror = () => {
        console.warn("Image failed:", src);
        Images[src] = null;  // still set a key so lookup won't be undefined
        loaded++;
        updateLoader();
      };
      img.src = src;
    });

    // Safety: if assetList is empty or something, resolve after a short delay
    if (assetList.length === 0) {
      setTimeout(() => { resolve(); }, 20);
    }
  });
}

/* ---------------------- Poki SDK integration (safe) ---------------------- */
let poki = null;
let pokiReady = false;
async function tryInitPoki(){
  if(window.PokiSDK && typeof window.PokiSDK.init === 'function'){
    try {
      await window.PokiSDK.init();
      poki = window.PokiSDK;
      pokiReady = true;
      console.log('Poki SDK initialized');
    } catch(e){ console.warn('Poki init error', e); }
  } else {
    // Not available, continue silently
    console.log('Poki SDK not available');
  }
}
async function tryShowPokiAd(){
  if(pokiReady && poki && typeof poki.commercialBreak === 'function'){
    try { await poki.commercialBreak(); } catch(e){ console.warn('Poki ad failed', e); }
  } else {
    // fallback: small delay so UX feels like an ad break
    await new Promise(r => setTimeout(r, 300));
  }
}

/* ---------------------- Canvas & scaling ---------------------- */
const ctx = canvas ? canvas.getContext('2d') : null;
let DPR = window.devicePixelRatio || 1;
function resizeCanvas(){
  DPR = window.devicePixelRatio || 1;
  const cssW = Math.min(window.innerWidth * 0.94, 1200);
  const cssH = Math.min(window.innerHeight * 0.86, 820);
  if(!canvas) return;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * DPR);
  canvas.height = Math.round(cssH * DPR);
  if(ctx) ctx.setTransform(DPR,0,0,DPR,0,0);
  if(Game && typeof Game.computeLanes === 'function') Game.computeLanes();
}
window.addEventListener('resize', ()=>{ resizeCanvas(); });

/* ---------------------- Audio (WebAudio) ---------------------- */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let bgAudio = null;
let musicOn = true;

function ensureAudio(){
  if(!audioCtx){
    try { audioCtx = new AudioCtx(); } catch(e){ audioCtx = null; }
  }
}
function initBackgroundMusic(){
  if(!AUDIO_MUSIC) return;
  try { bgAudio = new Audio(AUDIO_MUSIC); bgAudio.loop = true; bgAudio.volume = 0.45; } catch(e){ bgAudio = null; }
}
function toggleMusic(){
  musicOn = !musicOn;
  if(btnMusic) btnMusic.textContent = 'Music: ' + (musicOn ? 'ON' : 'OFF');
  if(bgAudio){
    if(musicOn) bgAudio.play().catch(()=>{});
    else bgAudio.pause();
  }
}
function playSfx(name){
  if(!musicOn) return;
  ensureAudio();
  if(!audioCtx) return;
  const t = audioCtx.currentTime;
  if(name === 'coin'){
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type='triangle'; o.frequency.setValueAtTime(1100,t);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.18,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.36);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.38);
  } else if(name === 'crash'){
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type='sawtooth'; o.frequency.setValueAtTime(140,t); g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.9);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.9);
  } else if(name === 'move'){
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type='square'; o.frequency.setValueAtTime(440,t); g.gain.setValueAtTime(0.08,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.14);
  }
}

/* ---------------------- Game Core ---------------------- */
const Game = {
  // lane & player defaults
  playerLane: 1,          // current logical lane (0..laneCount-1)
  laneCount: 3,           // number of lanes
  laneWidth: 150,         // will be recomputed by computeLanes()

  // runtime flags & gameplay state
  running: false,
  paused: false,
  mode: 'endless', // 'endless' | 'adventure'
  difficulty: 1,   // 1..4
  season: null,    // 'summer'|'winter'|'autumn'|'rainy'
  level: 1,
  frame: 0,
  score: 0,
  coinsRun: 0, // unified name
  obstacles: [],
  coins: [],
  lanes: [],

  // player object (keeps lane index in sync with playerLane)
  player: { lane:1, x:0, y:0, w:56, h:110 },

  speed: 3,
  spawnRate: 140,
  levelTargetFrames: Infinity, // for adventure: frames to reach finish
  finishSpawned: false,
  finishY: -999,

  // compute lanes method
  computeLanes(){
    const cssW = canvas ? canvas.clientWidth : (window.innerWidth || 900);
    const roadX = Math.round(cssW * 0.14);
    const roadW = Math.round(cssW * 0.72);
    const laneW = Math.floor(roadW / this.laneCount);
    this.lanes = [];
    for(let i = 0; i < this.laneCount; i++){
      this.lanes.push(roadX + Math.round(laneW * (i + 0.5)));
    }
    this.laneWidth = laneW;
    if(typeof this.playerLane !== 'number') this.playerLane = 1;
    this.playerLane = Math.max(0, Math.min(this.laneCount - 1, this.playerLane));
    if(this.player) {
      this.player.lane = this.playerLane;
      this.player.x = this.lanes[this.player.lane];
      this.player.y = (canvas ? canvas.clientHeight : 600) - 140;
    }
  }
};

/* ---------------------- Spawning ---------------------- */
function spawnObstacle(){
  if(!Game.lanes.length) Game.computeLanes();
  const lane = Math.floor(Math.random()*Game.laneCount);
  const src = OBSTACLES[Math.floor(Math.random()*OBSTACLES.length)];
  const x = Game.lanes[lane] - 28;
  Game.obstacles.push({ x, y:-150, w:56, h:120, lane, src });
}
function spawnCoin(){
  if(!Game.lanes.length) Game.computeLanes();
  const lane = Math.floor(Math.random()*Game.laneCount);
  Game.coins.push({ x: Game.lanes[lane] - 18, y:-80, w:36, h:36, lane });
}

/* ---------------------- Collision helpers ---------------------- */
function rectOverlap(a,b){
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

/* ---------------------- Adventure level setup ---------------------- */
function setupAdventureLevel(){
  const L = Game.level;
  Game.levelFramesTarget = 1800 + (L * 90); // 30s at 60fps + growth
  Game.finishSpawned = false;
  Game.finishY = -999;
  Game.speed = 3 + L * 0.02;
  Game.spawnRate = Math.max(40, 140 - Math.floor(L * 0.6));
}

// STEP 5A: Safe commercial break wrapper
async function showAd() {
    // Stop gameplay before ad
    try { 
        console.log("Poki: gameplayStop() for ad");
        PokiSDK.gameplayStop(); 
    } catch(e){}

    if (window.Game && Game.pause) Game.pause();

    // Show ad
    await PokiSDK.commercialBreak();

    // Resume gameplay after ad
    if (window.Game && Game.resume) Game.resume();

    try { 
        console.log("Poki: gameplayStart() after ad");
        PokiSDK.gameplayStart(); 
    } catch(e){}
}

/* ---------------------- Start Game wrappers with ads ---------------------- */
async function startGameWithAd(opts){
  await showAd();
  if(opts) {
    if(opts.mode) Game.mode = opts.mode;
    if(opts.difficulty) Game.difficulty = opts.difficulty;
    if(opts.season) Game.season = opts.season;
    if(opts.level) Game.level = opts.level;
  }
  startGame();
}

async function startEndlessWithAd(difficulty){
  await showAd();
  Game.mode = 'endless';
  Game.difficulty = difficulty;
  startGame();
}

/* ---------------------- Start / End / Pause ---------------------- */
function startGame(){
  // STEP 3A: Poki gameplay start
try {
    console.log("Poki: gameplayStart()");
    PokiSDK.gameplayStart();
} catch (e) {
    console.warn("Poki gameplayStart error:", e);
}
  if (pokiReady && poki?.gameplayStart) {
      try { poki.gameplayStart(); } catch(e){}
  }
  hideAllScreens();
  if(gameScreen) gameScreen.style.display = 'flex';

  // reset
  Game.running = true;
  Game.paused = false;
  Game.frame = 0;
  Game.score = 0;
  Game.coinsRun = 0;
  Game.obstacles = [];
  Game.coins = [];
  Game.computeLanes();

  if(Game.mode === 'adventure') setupAdventureLevel();
  else {
    const map = {1:{speed:3,spawn:140},2:{speed:4.2,spawn:100},3:{speed:5.2,spawn:74},4:{speed:6.5,spawn:55}};
    const cfg = map[Game.difficulty] || map[1];
    Game.speed = cfg.speed; Game.spawnRate = cfg.spawn;
    Game.levelFramesTarget = Infinity;
  }

  if(bgAudio && musicOn) { bgAudio.currentTime = 0; bgAudio.play().catch(()=>{}); }
  requestAnimationFrame(gameLoop);
}

function pauseGame(){
  // STEP 3B: Poki gameplay stop
try {
    console.log("Poki: gameplayStop()");
    PokiSDK.gameplayStop();
} catch (e) {
    console.warn("Poki gameplayStop error:", e);
}
  if(!Game.running) return;
  Game.paused = true;
  if(pauseOverlay) pauseOverlay.classList.remove('hidden');
}
function resumeGame(){
  if(!Game.running) return;
  Game.paused = false;
  if(pauseOverlay) pauseOverlay.classList.add('hidden');
  requestAnimationFrame(gameLoop);
}

async function handleWin(){
  Game.running = false;
  if (pokiReady && poki?.gameplayStop) {
      try { poki.gameplayStop(); } catch(e){}
  }
  const reward = Math.max(10, Math.floor(Game.score/10));
  state.coins += reward;
  persistState();
  updateTopStats();

  if(Game.mode === 'adventure'){
    unlockNextLevel(Game.season, Game.level);
    showPopup(`YOU WON!\nReward: ${reward} coins`, 'Next Level', 'Main Menu', ()=>{
      Game.level++;
      startGameWithAd({mode:'adventure', season: Game.season, level: Game.level});
    }, ()=>{ goMainMenu(); });
  } else {
    showPopup(`Run ended\nCoins: ${reward}`, 'Main Menu', 'Close', ()=>{ goMainMenu(); }, ()=>{});
  }
}

async function handleLose(){
  Game.running = false;
  playSfx('crash');
  if (pokiReady && poki?.gameplayStop) {
      try { poki.gameplayStop(); } catch(e){}
  }
  try { PokiSDK.gameplayStop(); } catch(e){}
  await showAd();
  try { PokiSDK.gameplayStart(); } catch(e){}
  showPopup(`YOU LOST!\nScore: ${Game.score}`, 'Try Again', 'Main Menu', ()=>{
    if(Game.mode === 'adventure') startGameWithAd({mode:'adventure', season: Game.season, level: Game.level});
    else startEndlessWithAd(Game.difficulty);
  }, ()=>{ goMainMenu(); });
}

/* ---------------------- Unlock logic ---------------------- */
function ensureSeason(season){ if(!state.progress[season]) state.progress[season] = { unlocked: 1 }; }
function unlockNextLevel(season, L){ ensureSeason(season); if(state.progress[season].unlocked < L+1){ state.progress[season].unlocked = L+1; localStorage.setItem(STORAGE.progress, JSON.stringify(state.progress)); } }

/* ---------------------- Game update/draw ---------------------- */
function updateGame(){
  Game.frame++;

  if(Game.frame % Math.max(8, Math.round(Game.spawnRate - Math.random()*20)) === 0) spawnObstacle();
  if(Game.frame % Math.max(12, Math.round(900 - Math.random()*200)) === 0) spawnCoin();

  const spd = Game.speed + (Game.difficulty * 0.4);

  for(let o of Game.obstacles) o.y += spd;
  for(let c of Game.coins) c.y += spd;

  Game.obstacles = Game.obstacles.filter(o => o.y < canvas.height + 200);
  Game.coins = Game.coins.filter(c => c.y < canvas.height + 80);

  if(Game.mode === 'adventure' && !Game.finishSpawned && Game.frame >= Game.levelFramesTarget){
    Game.finishSpawned = true;
    Game.finishY = -250;
  }
  if(Game.finishSpawned){
    Game.finishY += spd;
    if(Game.finishY > canvas.height - 200){ handleWin(); return; }
  }

  const pBox = { x: Game.player.x - Game.player.w/2, y: Game.player.y, w: Game.player.w, h: Game.player.h };
  for(let o of Game.obstacles){
    const oBox = { x:o.x, y:o.y, w:o.w, h:o.h };
    if(rectOverlap(pBox, oBox)){ handleLose(); return; }
  }

  for(let i = Game.coins.length - 1; i >= 0; i--){
    const c = Game.coins[i];
    const cBox = { x:c.x, y:c.y, w:c.w, h:c.h };
    if(rectOverlap(pBox, cBox)){
      Game.coinsRun += 5; state.coins += 5; localStorage.setItem(STORAGE.coins, state.coins);
      Game.coins.splice(i,1);
      playSfx('coin');
      updateTopStats();
    }
  }

  if(Game.mode === 'endless' && Game.frame % 12 === 0){
    Game.score++;
    if(Game.score > state.high){ state.high = Game.score; localStorage.setItem(STORAGE.high, state.high); }
  }

  if(gameScoreEl) gameScoreEl.textContent = Game.score;
  if(gameCoinsEl) gameCoinsEl.textContent = Game.coinsRun;
}

function drawGame(){
  if(!ctx || !canvas) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const cssW = canvas.clientWidth, cssH = canvas.clientHeight;

  ctx.fillStyle = '#6fb46f';
  ctx.fillRect(0,0, cssW, cssH);

  const roadX = Math.round(cssW * 0.14), roadW = Math.round(cssW * 0.72);
  roundRect(ctx, roadX, 0, roadW, cssH, 16, true, false, '#2f2f2f');

  const laneW = roadW / Game.laneCount;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4;
  for(let i=1;i<Game.laneCount;i++){
    const sx = roadX + i*laneW;
    ctx.setLineDash([16,18]);
    ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx, cssH); ctx.stroke();
  }
  ctx.setLineDash([]);

  const dashH = 34;
  const offset = (Game.frame * Game.speed) % (dashH*2);
  const centerX = roadX + Math.round(roadW/2);
  for(let y = -offset; y < cssH; y += dashH*2){
    roundRect(ctx, centerX - 6, y+40, 12, dashH, 4, true, false, '#fff');
  }

  for(let o of Game.obstacles){
    const img = Images[o.src];
    if(img) ctx.drawImage(img, o.x, o.y, o.w, o.h);
    else { ctx.fillStyle='#8d6e63'; ctx.fillRect(o.x,o.y,o.w,o.h); }
  }

  ctx.fillStyle = '#ffd54f';
  for(let c of Game.coins) { ctx.beginPath(); ctx.arc(c.x + c.w/2, c.y + c.h/2, c.w/2, 0, Math.PI*2); ctx.fill(); }

  if(Game.finishSpawned){ ctx.fillStyle = '#fff'; ctx.fillRect(roadX, Game.finishY, roadW, 30); ctx.fillStyle = '#000'; ctx.fillRect(roadX, Game.finishY+15, roadW, 15); }

  const car = CAR_CATALOG.find(cc => cc.id === state.selected);
  const carImg = car ? Images[car.src] : null;
  if(carImg) ctx.drawImage(carImg, Game.player.x - Game.player.w/2, Game.player.y, Game.player.w, Game.player.h);
  else { ctx.fillStyle = '#ff3d00'; ctx.fillRect(Game.player.x - Game.player.w/2, Game.player.y, Game.player.w, Game.player.h); }
}

/* roundRect helper */
function roundRect(ctx,x,y,w,h,r,fill,stroke,color){
  if(color) ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
  if(fill) ctx.fill();
  if(stroke) ctx.stroke();
}

/* main loop */
function gameLoop(){
  if(!Game.running) return;
  if(!Game.paused){ updateGame(); drawGame(); }
  requestAnimationFrame(gameLoop);
}

/* ---------------------- Input: keyboard & touch ---------------------- */
window.addEventListener('keydown', e => {
  if(!Game.running || Game.paused) return;
  const key = e.key;
  if(key === 'ArrowLeft' || key.toLowerCase() === 'a'){
    if(Game.player.lane > 0){ Game.player.lane--; Game.player.x = Game.lanes[Game.player.lane]; playSfx('move'); }
  } else if(key === 'ArrowRight' || key.toLowerCase() === 'd'){
    if(Game.player.lane < Game.laneCount - 1){ Game.player.lane++; Game.player.x = Game.lanes[Game.player.lane]; playSfx('move'); }
  } else if(key === 'Escape') pauseGame();
});

if(canvas){
  canvas.addEventListener('touchstart', e => {
    if(!Game.running || Game.paused) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    if(x < rect.width / 2){
      if(Game.player.lane > 0){ Game.player.lane--; Game.player.x = Game.lanes[Game.player.lane]; playSfx('move'); }
    } else {
      if(Game.player.lane < Game.laneCount-1){ Game.player.lane++; Game.player.x = Game.lanes[Game.player.lane]; playSfx('move'); }
    }
  }, {passive:true});
}

/* ---------------------- UI Navigation & rendering ---------------------- */
function hideAllScreens(){
  const ids = ['mainMenu','modeSelect','endlessMenu','adventureSeasons','adventureLevels','garage','gameScreen'];
  ids.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
}
function goMainMenu(){ hideAllScreens(); const mm = document.getElementById('mainMenu'); if(mm) mm.style.display='flex'; updateTopStats(); }

function updateTopStats(){
  if(topStatsHigh) topStatsHigh.textContent = state.high;
  if(topStatsCoins) topStatsCoins.textContent = state.coins;
  if(garageCoins) garageCoins.textContent = state.coins;
}

/* render garage */
function renderGarage(){
  if(!garageList) return;
  garageList.innerHTML = '';

  CAR_CATALOG.forEach(car => {

    const div = document.createElement('div');
    div.className = 'carItem';

    const img = document.createElement('img');
    img.src = car.src;
    img.className = 'carImg';

    const name = document.createElement('div');
    name.className = 'carName';
    name.textContent = car.name;

    const owned = state.owned.includes(car.id);
    const adsDone = state.adProgress[car.id] || 0;

    // PRICE TEXT
    const price = document.createElement('div');
    price.className = 'carPrice';

    // OWNED CARS
    if (owned) {

      price.textContent = "Unlocked";

      const btn = document.createElement('button');
      btn.className = 'carBtn';

      if (state.selected === car.id) {
        btn.textContent = 'SELECTED';
        btn.disabled = true;
      } else {
        btn.textContent = 'SELECT';
        btn.onclick = () => {
          state.selected = car.id;
          localStorage.setItem(STORAGE.selected, state.selected);
          renderGarage();
        };
      }

      div.appendChild(img);
      div.appendChild(name);
      div.appendChild(price);
      div.appendChild(btn);
      garageList.appendChild(div);
      return;
    }

    // NOT OWNED (SHOW COINS + ADS)
    price.innerHTML =
      `${car.price} coins<br>OR<br>Watch ads: ${adsDone}/${car.ads}`;

    // --- Buy with Coins Button ---
    const buyCoinsBtn = document.createElement('button');
    buyCoinsBtn.className = 'carBtn';
    buyCoinsBtn.textContent = 'Buy with Coins';

    buyCoinsBtn.onclick = () => {
      showPopup(
        `Buy ${car.name} for ${car.price} coins?`,
        'Buy',
        'Cancel',
        () => {
          if (state.coins >= car.price) {
            state.coins -= car.price;
            state.owned.push(car.id);
            persistState();
            renderGarage();
            updateTopStats();
            showPopup('Purchased!', 'OK', 'Close', ()=>{}, ()=>{});
          } else {
            showPopup('Not enough coins', 'OK', 'Close', ()=>{}, ()=>{});
          }
        },
        ()=>{}
      );
    };

    // --- Buy with Ads Button ---
    const adBtn = document.createElement('button');
    adBtn.className = 'carBtn';
    adBtn.textContent = 'Watch Ad';

    adBtn.onclick = async () => {

      // Safe rewarded ad call
      try { PokiSDK.gameplayStop(); } catch(e){}
      if (window.Game && Game.pause) Game.pause();

      const result = await PokiSDK.rewardedBreak();

      // Resume gameplay
      if (window.Game && Game.resume) Game.resume();
      try { PokiSDK.gameplayStart(); } catch(e){}

      if (result.success) {
        // increase ad count
        state.adProgress[car.id] = adsDone + 1;
        saveAdProgress();

        // check unlock
        if (state.adProgress[car.id] >= car.ads) {
          state.owned.push(car.id);
          persistState();
          showPopup(`${car.name} unlocked!`, 'OK', 'Close', ()=>{}, ()=>{});
        }

        renderGarage();
      } else {
        showPopup('Ad not completed!', 'OK', 'Close', ()=>{}, ()=>{});
      }
    };

    // Add everything to item
    div.appendChild(img);
    div.appendChild(name);
    div.appendChild(price);
    div.appendChild(buyCoinsBtn);
    div.appendChild(adBtn);

    garageList.appendChild(div);
  });
}

/* render levels */
function renderLevelsForSeason(season){
  if(!levelList) return;
  levelList.innerHTML = '';
  const unlocked = (state.progress[season] && state.progress[season].unlocked) ? state.progress[season].unlocked : 1;
  for(let i=1;i<=100;i++){
    const b = document.createElement('button'); b.className = 'levelBtn';
    b.textContent = i;
    if(i <= unlocked){
      b.classList.add('unlocked');
      b.onclick = async ()=> {
       await showAd();
        Game.mode = 'adventure'; Game.season = season; Game.level = i;
        startGame();
      };
    } else {
      b.classList.add('locked'); b.disabled = true;
    }
    levelList.appendChild(b);
  }
}

/* ---------------------- Popup helper ---------------------- */
function showPopup(msg, a='OK', b='Cancel', aCb=null, bCb=null){
  if(!pauseOverlay || !popupMessage || !popupBtn1 || !popupBtn2) return;
  popupMessage.textContent = msg;
  popupBtn1.textContent = a;
  popupBtn2.textContent = b;
  pauseOverlay.classList.remove('hidden');
  popupBtn1.onclick = ()=>{ pauseOverlay.classList.add('hidden'); if(aCb) aCb(); };
  popupBtn2.onclick = ()=>{ pauseOverlay.classList.add('hidden'); if(bCb) bCb(); };
}

/* ---------------------- Persistence ---------------------- */
function persistState(){
  localStorage.setItem(STORAGE.coins, state.coins);
  localStorage.setItem(STORAGE.high, state.high);
  localStorage.setItem(STORAGE.owned, JSON.stringify(state.owned));
  localStorage.setItem(STORAGE.selected, state.selected);
  localStorage.setItem(STORAGE.progress, JSON.stringify(state.progress));
  localStorage.setItem(STORAGE.theme, state.theme);
}

/* ---------------------- Theme handling ---------------------- */
function applyTheme(){
  const t = state.theme || 'light';
  document.body.classList.toggle('theme-dark', t === 'dark');
  document.body.classList.toggle('theme-light', t === 'light');
  if(btnTheme) btnTheme.textContent = t === 'light' ? 'Light' : 'Dark';
}
function toggleTheme(){
  state.theme = (state.theme === 'light' ? 'dark' : 'light');
  applyTheme();
  persistState();
}

/* ---------------------- Button wiring (IDs from index.html) ---------------------- */
// Main menu
if(btnPlay) btnPlay.onclick = ()=> { hideAllScreens(); const el = document.getElementById('modeSelect'); if(el) el.style.display='flex'; };
if(btnGarage) btnGarage.onclick = ()=> { renderGarage(); hideAllScreens(); const el = document.getElementById('garage'); if(el) el.style.display='flex'; };
if(btnMusic) btnMusic.onclick = ()=> toggleMusic();
if(btnTheme) btnTheme.onclick = ()=> toggleTheme();

// Mode select
if(btnBackMode) btnBackMode.onclick = ()=> goMainMenu();
if(btnAdventure) btnAdventure.onclick = ()=> { hideAllScreens(); const el=document.getElementById('adventureSeasons'); if(el) el.style.display='flex'; };
if(btnEndless) btnEndless.onclick = ()=> { hideAllScreens(); const el=document.getElementById('endlessMenu'); if(el) el.style.display='flex'; };

// Endless
if(btnBackEndless) btnBackEndless.onclick = ()=> { hideAllScreens(); const el=document.getElementById('modeSelect'); if(el) el.style.display='flex'; };
if(btnEasy) btnEasy.onclick = ()=> startEndlessWithAd(1);
if(btnMedium) btnMedium.onclick = ()=> startEndlessWithAd(2);
if(btnHard) btnHard.onclick = ()=> startEndlessWithAd(3);
if(btnExtreme) btnExtreme.onclick = ()=> startEndlessWithAd(4);

// Seasons
if(btnBackSeasons) btnBackSeasons.onclick = ()=> { hideAllScreens(); const el=document.getElementById('modeSelect'); if(el) el.style.display='flex'; };
if(btnSummer) btnSummer.onclick = ()=> { renderLevelsForSeason('summer'); hideAllScreens(); const el=document.getElementById('adventureLevels'); if(el) el.style.display='flex'; };
if(btnWinter) btnWinter.onclick = ()=> {
  const can = (state.progress['summer'] && state.progress['summer'].unlocked >= 100);
  if(can) { renderLevelsForSeason('winter'); hideAllScreens(); const el=document.getElementById('adventureLevels'); if(el) el.style.display='flex'; }
  else showPopup('Complete all Summer levels to unlock Winter', 'OK','Close');
};
if(btnAutumn) btnAutumn.onclick = ()=> {
  const can = (state.progress['winter'] && state.progress['winter'].unlocked >= 100);
  if(can) { renderLevelsForSeason('autumn'); hideAllScreens(); const el=document.getElementById('adventureLevels'); if(el) el.style.display='flex'; }
  else showPopup('Complete all Winter levels to unlock Autumn', 'OK','Close');
};
if(btnRainy) btnRainy.onclick = ()=> {
  const can = (state.progress['autumn'] && state.progress['autumn'].unlocked >= 100);
  if(can) { renderLevelsForSeason('rainy'); hideAllScreens(); const el=document.getElementById('adventureLevels'); if(el) el.style.display='flex'; }
  else showPopup('Complete all Autumn levels to unlock Rainy', 'OK','Close');
};

if(btnBackLevels) btnBackLevels.onclick = ()=> { hideAllScreens(); const el=document.getElementById('adventureSeasons'); if(el) el.style.display='flex'; };

// Garage
if(btnBackGarage) btnBackGarage.onclick = ()=> goMainMenu();

// Pause overlay popup buttons (these serve as defaults, showPopup will overwrite handlers temporarily)
if(popupBtn1) popupBtn1.onclick = ()=> { if(pauseOverlay) pauseOverlay.classList.add('hidden'); resumeGame(); };
if(popupBtn2) popupBtn2.onclick = ()=> { if(pauseOverlay) pauseOverlay.classList.add('hidden'); goMainMenu(); };

// Pause button
if(btnPause) btnPause.onclick = ()=> { if(Game.paused) resumeGame(); else pauseGame(); };

/* ---------------------- Init & start ---------------------- */
async function init() {

    // STEP 2: Required by Poki — loading start
    try {
        console.log('Poki: gameLoadingStart()');
        PokiSDK.gameLoadingStart();
    } catch (err) {
        console.warn('Poki loadingStart error:', err);
    }

    if (!state.theme) state.theme = 'light';
    applyTheme();

    if (btnMusic) btnMusic.textContent = 'Music: ' + (musicOn ? 'ON' : 'OFF');

    resizeCanvas();

    /* ---------------------- FIX: Proper await ---------------------- */
    await preloadAssets(); 
    console.log("Assets finished loading");

    // initialize Poki
    await tryInitPoki();

    // Now allow the loader click to start the game
    if (loader) {

        const startFlow = async function () {

            // Hide loader
            loader.classList.remove('visible');
            loader.classList.add('hidden');

            // Audio start
            ensureAudio();
            initBackgroundMusic();

            if (musicOn && bgAudio) {
                try { await bgAudio.play(); } catch (e) {}
            }

            // Poki finish
            if (pokiReady && PokiSDK.gameLoadingFinished) {
                try { PokiSDK.gameLoadingFinished(); } catch (e) {}
            }

            goMainMenu();
        };

        // Start after click (Poki requirement)
        loader.addEventListener('click', startFlow, { once: true });

    } else {
        // No loader element? Start instantly.
        if (pokiReady && PokiSDK.gameLoadingFinished) {
            try { PokiSDK.gameLoadingFinished(); } catch (e) {}
        }
        goMainMenu();
    }
}

window.addEventListener('load', init);

/* ---------------------- Utilities ---------------------- */
function updateTopStatsOnInterval(){ updateTopStats(); setTimeout(updateTopStatsOnInterval, 2000); }
updateTopStatsOnInterval();

function persistStateImmediate(){ persistState(); }

/* ---------------------- Debug helpers ---------------------- */
window.dumpState = ()=>({state, Game, ImagesLoaded: preloadLoaded});

/* ---------------------- End ---------------------- */


// --- Poki SDK Fallback (Required for QA) ---
if (!window.PokiSDK) {
    window.PokiSDK = {
        gameLoadingStart() {},
        gameLoadingFinished() {},
        gameplayStart() {},
        gameplayStop() {},
        commercialBreak: async () => {},
        rewardedBreak: async () => ({ success: false }),
    };
}

// --- Poki SDK Fallback (Required for QA) ---
if (!window.PokiSDK) {
    window.PokiSDK = {
        gameLoadingStart() { console.log("fallback: loading start"); },
        gameLoadingFinished() { console.log("fallback: loading finished"); },
        gameplayStart() { console.log("fallback: gameplay start"); },
        gameplayStop() { console.log("fallback: gameplay stop"); },

        // Normal ad break fallback
        commercialBreak: async () => {
            console.log("fallback: commercial break");
            return new Promise(res => setTimeout(res, 1000));
        },

        // Rewarded ad fallback (your game didn't have it — I added it)
        rewardedBreak: async () => {
            console.log("fallback: rewarded break");
            return { success: true };  // Always succeed during fallback
        }
    };
}

// --- Visibility Change Pause/Resume Handling (Required for Poki QA) ---
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {

        // When tab is hidden → gameplayStop
        try {
            console.log("Poki: gameplayStop() - tab hidden");
            PokiSDK.gameplayStop();
        } catch (e) {
            console.warn("Poki stop error:", e);
        }

        // Pause your own game
        if (window.Game && Game.pause) Game.pause();

    } else {

        // Resume your own game
        if (window.Game && Game.resume) Game.resume();

        // When tab becomes visible → gameplayStart
        try {
            console.log("Poki: gameplayStart() - tab visible again");
            PokiSDK.gameplayStart();
        } catch (e) {
            console.warn("Poki start error:", e);
        }
    }
});
