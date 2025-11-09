// game.js - updated engine with coins, new play menu and endless mode
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // UI elements
  const mainMenu = document.getElementById('mainMenu');
  const seasonSelect = document.getElementById('seasonSelect');
  const levelPanel = document.getElementById('levelPanel');
  const gameScreen = document.getElementById('gameScreen');
  const modalRoot = document.getElementById('modalRoot');
  const playBtn = document.getElementById('playBtn');
  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const exitBtn = document.getElementById('exitBtn');
  const backFromSeason = document.getElementById('backFromSeason');
  const progressPanel = document.getElementById('progressPanel');
  const pauseBtn = document.getElementById('pauseBtn');
  const bgMusic = document.getElementById('bgMusic');
  const floatingShapes = document.getElementById('floatingShapes');

  // assets list (must match folder)
  const ASSETS = {
    obstacles: ['cone.png','barrel.png','oil.png','car1.png','car2.png','car3.png','car4.png'],
    plants: {
      summer: ['assets/plants/summer1.png','assets/plants/summer2.png','assets/plants/summer3.png'],
      winter: ['assets/plants/winter1.png','assets/plants/winter2.png','assets/plants/winter3.png'],
      autumn: ['assets/plants/autumn1.png','assets/plants/autumn2.png','assets/plants/autumn3.png']
    },
    tracks: {
      summer: 'assets/tracks/summer.png',
      winter: 'assets/tracks/winter.png',
      autumn: 'assets/tracks/autumn.png'
    },
    coin: 'assets/coin.png'
  };

  // load persisted game/shop state
  const S = window.EGS ? window.EGS.getState() : {
    coins:500, high:0, selectedCar:'red', owned:['red'], unlocked:{"0":[1],"1":[],"2":[]}, musicOn:false
  };

  // HUD binding
  const coinsChip = document.getElementById('coinsChip');
  const highChip = document.getElementById('highScoreChip');
  function updateHUD(){ coinsChip.innerText = `💰 ${S.coins}`; highChip.innerText = `🏆 High: ${S.high}`; }

  // floating shapes decoration initialization (galaxy theme)
  function initShapes() {
    // create 12 shapes of various types & positions
    const types = ['circle','square','star'];
    const w = window.innerWidth, h = window.innerHeight;
    for (let i=0;i<12;i++){
      const el = document.createElement('div');
      el.className = 'shape ' + types[i%3];
      const size = 30 + Math.random()*80;
      el.style.width = size + 'px';
      el.style.height = (types[i%3] === 'star' ? '0px' : size + 'px');
      el.style.left = Math.random() * 100 + '%';
      el.style.top = Math.random() * 100 + '%';
      el.style.background = types[i%3] === 'star' ? 'transparent' : (i%2? 'rgba(150,120,255,0.08)' : 'rgba(30,200,255,0.06)');
      el.style.transform = 'translate(-50%,-50%)';
      el.style.zIndex = 1;
      floatingShapes.appendChild(el);
      // animate position slowly
      animateShape(el);
    }
  }
  function animateShape(el){
    const dur = 8000 + Math.random()*14000;
    const dx = (Math.random()-0.5) * 20; // percent
    const dy = (Math.random()-0.5) * 20;
    el.animate([
      { transform: el.style.transform + ` translate(0px,0px)` },
      { transform: el.style.transform + ` translate(${dx}px,${dy}px)` }
    ], { duration: dur, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  }
  initShapes();

  // show/hide screens
  function showMainMenu(){
    mainMenu.classList.remove('hidden');
    seasonSelect.classList.add('hidden');
    gameScreen.classList.add('hidden');
    modalRoot.innerHTML = '';
    updateHUD();
    // ensure music is paused in menu
    if (bgMusic && !bgMusic.paused) { bgMusic.pause(); bgMusic.currentTime = 0; }
  }

  // New: Play button now opens a small mode selector (Challenges / Endless)
  playBtn.addEventListener('click', ()=> {
    // show modal with two choices
    modalRoot.innerHTML = `
      <div class="modal">
        <div class="modal-card">
          <h3>Choose Mode</h3>
          <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
            <button id="modeChallenges" class="btn small">Challenges</button>
            <button id="modeEndless" class="btn small">Endless</button>
          </div>
          <div style="margin-top:12px"><button id="cancelMode" class="btn small">Cancel</button></div>
        </div>
      </div>`;
    document.getElementById('cancelMode').onclick = ()=> modalRoot.innerHTML = '';
    document.getElementById('modeChallenges').onclick = ()=> {
      modalRoot.innerHTML = '';
      mainMenu.classList.add('hidden');
      seasonSelect.classList.remove('hidden');
      loadLevelGrid(0);
    };
    document.getElementById('modeEndless').onclick = ()=> {
      modalRoot.innerHTML = '';
      showEndlessMenu();
    };
  });

  function showEndlessMenu(){
    modalRoot.innerHTML = `
      <div class="modal">
        <div class="modal-card">
          <h3>Endless — Choose Difficulty</h3>
          <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
            <button id="endEasy" class="btn small">Easy</button>
            <button id="endMed" class="btn small">Medium</button>
            <button id="endHard" class="btn small">Hard</button>
          </div>
          <div style="margin-top:12px"><button id="cancelEnd" class="btn small">Cancel</button></div>
        </div>
      </div>`;
    document.getElementById('cancelEnd').onclick = ()=> modalRoot.innerHTML = '';
    document.getElementById('endEasy').onclick = ()=> { modalRoot.innerHTML=''; startEndless('easy'); };
    document.getElementById('endMed').onclick = ()=> { modalRoot.innerHTML=''; startEndless('medium'); };
    document.getElementById('endHard').onclick = ()=> { modalRoot.innerHTML=''; startEndless('hard'); };
  }

  backFromSeason.addEventListener('click', ()=> {
    seasonSelect.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });

  // music toggle: only toggles preference. playback only occurs during gameplay.
  musicToggleBtn.addEventListener('click', ()=> {
    S.musicOn = !S.musicOn;
    localStorage.setItem('egs_music', S.musicOn ? 'true' : 'false');
    musicToggleBtn.innerText = S.musicOn ? 'Music: On' : 'Music: Off';
    if(!S.musicOn && !bgMusic.paused){ bgMusic.pause(); bgMusic.currentTime = 0; }
  });
  // Exit behavior
  exitBtn.addEventListener('click', ()=> {
    try { window.open('','_self').close(); } catch(e) { window.location.href = 'about:blank'; }
  });

  // load level grid for a season
  function seasonLabel(i){ return i===0 ? 'Summer' : (i===1 ? 'Winter' : 'Autumn'); }

  function loadLevelGrid(seasonIndex) {
    levelPanel.innerHTML = `<div style="margin-bottom:8px"><strong>Season: ${seasonLabel(seasonIndex)}</strong></div>`;
    const grid = document.createElement('div'); grid.className = 'level-grid';
    const unlockedArr = S.unlocked[String(seasonIndex)] || [];
    for (let i=1;i<=20;i++){
      const btn = document.createElement('div'); btn.className = 'level-btn' + (unlockedArr.includes(i) ? '' : ' locked');
      btn.innerText = `Level ${i}` + (unlockedArr.includes(i) ? '' : ' 🔒');
      btn.onclick = () => {
        if (!unlockedArr.includes(i)) { shortToast('Level locked. Complete previous levels to unlock.'); return; }
        startGame(seasonIndex,i);
      };
      grid.appendChild(btn);
    }
    levelPanel.appendChild(grid);
  }
  document.querySelectorAll('.seasonBtn').forEach(b => b.addEventListener('click',(e)=> {
    const si = parseInt(e.currentTarget.dataset.season);
    loadLevelGrid(si);
  }));

  // Game class - handles both challenge and endless
  class Game {
    constructor(opts = {}) {
      // opts: { seasonIndex, level, mode: 'challenge'|'endless', difficulty: 'easy'|'medium'|'hard' }
      this.seasonIndex = typeof opts.seasonIndex === 'number' ? opts.seasonIndex : 0;
      this.level = typeof opts.level === 'number' ? opts.level : 1;
      this.mode = opts.mode || 'challenge';
      this.difficulty = opts.difficulty || 'medium';
      this.running = false;
      this.paused = false;
      this.canvas = canvas;
      this.ctx = ctx;
      this.updateSize();
      this.player = { w: Math.round(this.w * 0.12), h: Math.round(this.h * 0.12), x: Math.round(this.w/2 - (this.w * 0.12)/2), y: Math.round(this.h - (this.h * 0.2)) };
      this.carImg = new Image(); this.carImg.src = `assets/cars/${S.selectedCar}.png`;
      this.trackImg = new Image(); this.trackImg.src = ASSETS.tracks[ seasonLabel(this.seasonIndex).toLowerCase() ];
      this.plantImgs = ASSETS.plants[ seasonLabel(this.seasonIndex).toLowerCase() ];
      this.obNames = ASSETS.obstacles;
      this.obstacles = [];
      this.plants = [];
      this.coins = []; // coin objects in world
      // MUCH longer goal: ensure each challenge level is at least 1 minute
      this.baseSpeed = 1.6 + this.level * 0.12;
      // difficulty modifiers for endless
      this.diffMultiplier = (this.difficulty === 'easy') ? 0.65 : (this.difficulty === 'hard' ? 1.45 : 1);
      this.spawnRate = Math.max(900 - this.level * 10, 260); // base spawnRate
      // adjust spawnRate for difficulty (lower spawnRate -> more frequent)
      this.spawnRate = Math.round(this.spawnRate / this.diffMultiplier);
      this.baseSpeed = this.baseSpeed * this.diffMultiplier;
      // For challenge mode we calculate a goal so level lasts at least 60s
      // Per-second distance increment (approx) = 720 * (baseSpeed + level*0.08)
      // So to make targetSeconds = 60, goal = perSecond * targetSeconds
      const targetSeconds = Math.max(60, 60); // at least 60 seconds
      this.goal = Math.floor(720 * (this.baseSpeed + this.level * 0.08) * targetSeconds);
      if (this.mode === 'endless') this.goal = Infinity; // endless has no goal
      this.distance = 0;
      this.lastSpawn = performance.now();
      this.lastPlant = performance.now();
      this.lastCoinSpawn = performance.now();
      this.keys = {};
      this.coinsReward = Math.floor(20 + this.level * 4);
      this.progressPanel = progressPanel;
      this._frame = null;
      this.bindKeys();
      window.addEventListener('resize', ()=> this.onResize());
    }

    updateSize(){ 
      // keep canvas element size attributes synced with CSS scaling for crispness
      // clientWidth/clientHeight come from CSS; we set canvas width/height to those for proper resolution
      this.w = canvas.width = canvas.clientWidth || canvas.width || 900;
      this.h = canvas.height = canvas.clientHeight || canvas.height || 680;
    }

    onResize(){
      this.updateSize();
      // scale player sizes and positions proportionally
      this.player.w = Math.round(this.w * 0.12);
      this.player.h = Math.round(this.h * 0.12);
      this.player.y = Math.round(this.h - (this.h * 0.2));
      this.player.x = Math.max(60, Math.min(this.player.x, this.w - this.player.w - 60));
    }

    bindKeys(){
      this._keydown = (e)=> { this.keys[e.key] = true; if (e.key === 'Escape') this.togglePause(); };
      this._keyup = (e)=> { this.keys[e.key] = false; };
      window.addEventListener('keydown', this._keydown);
      window.addEventListener('keyup', this._keyup);
    }
    unbindKeys(){ window.removeEventListener('keydown', this._keydown); window.removeEventListener('keyup', this._keyup); }

    start(){
      this.running = true; this.paused = false; this.distance = 0; this.obstacles = []; this.plants = []; this.coins = [];
      // play music only when gameplay starts if enabled
      if (S.musicOn) { bgMusic.currentTime = 0; bgMusic.play().catch(()=>{}); }
      this.lastFrame = performance.now();
      this.loop(this.lastFrame);
    }

    loop(now){
      if (!this.running) return;
      const dt = Math.min(40, now - this.lastFrame) / 16.666;
      this.lastFrame = now;
      if (!this.paused) this.update(dt);
      this.draw();
      this._frame = requestAnimationFrame(t => this.loop(t));
    }

    update(dt){
      const moveSpeed = Math.max(6, this.w * 0.01) + (this.level*0.05);
      if (this.keys['ArrowLeft'] || this.keys['a']) this.player.x -= moveSpeed * dt;
      if (this.keys['ArrowRight'] || this.keys['d']) this.player.x += moveSpeed * dt;
      this.player.x = Math.max(60, Math.min(this.player.x, this.w - this.player.w - 60));

      const now = performance.now();
      if (now - this.lastSpawn > this.spawnRate) { this.spawnObstacle(); this.lastSpawn = now; }
      if (now - this.lastPlant > 420 + Math.random() * 900) { this.spawnPlant(); this.lastPlant = now; }
      // independent coin spawns sometimes with obstacles and sometimes standalone
      if (now - this.lastCoinSpawn > 700 + Math.random()*1200) { 
        // small chance to spawn a standalone coin
        if (Math.random() < 0.4) this.spawnCoinStandalone(); 
        this.lastCoinSpawn = now; 
      }

      // update obstacles
      for (let i=this.obstacles.length-1;i>=0;i--){
        const ob = this.obstacles[i];
        ob.y += (this.baseSpeed + this.level*0.06) * dt * (this.w/800);
        if (ob.y > this.h + 200) this.obstacles.splice(i,1);
        else if (this.hit(this.player, ob)) {
          this.running = false;
          this.onLose();
          return;
        }
      }

      // update plants
      for (let i=this.plants.length-1;i>=0;i--){
        const p = this.plants[i];
        p.y += (this.baseSpeed * 0.6) * dt * (this.w/800);
        if (p.y > this.h + 200) this.plants.splice(i,1);
      }

      // update coins
      for (let i=this.coins.length-1;i>=0;i--){
        const c = this.coins[i];
        c.y += (this.baseSpeed * 0.9) * dt * (this.w/800);
        if (c.y > this.h + 120) this.coins.splice(i,1);
        else if (this.hit(this.player, c)) {
          // collect coin
          S.coins = (typeof S.coins === 'number' ? S.coins : 0) + 1; // 1 coin = 1 rupee
          // persist via shop module
          if (window.EGS && window.EGS.updateFromGame) window.EGS.updateFromGame({ coins: S.coins, high: S.high, unlocked: S.unlocked });
          updateHUD();
          this.coins.splice(i,1);
          // small feedback - short toast (non-intrusive)
          shortPulse('+1');
        }
      }

      // distance progress (scaled strongly so levels are much longer)
      if (this.goal !== Infinity) {
        this.distance += (this.baseSpeed + this.level*0.08) * dt * 12;
        const pct = Math.min(100, Math.floor(this.distance / this.goal * 100));
        this.progressPanel.innerText = `Level ${this.level} / 20 — ${pct}%`;
        if (this.distance >= this.goal) {
          this.running = false;
          this.onWin();
        }
      } else {
        // endless mode: show time elapsed instead of percentage
        this.distance += (this.baseSpeed + this.level*0.08) * dt * 12;
        const seconds = Math.floor(this.distance / (720 * (this.baseSpeed + this.level*0.08))); // invert earlier per-second approx
        this.progressPanel.innerText = `Endless • ${this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1)} — ${seconds}s`;
      }
    }

    draw(){
      // clear
      this.ctx.clearRect(0,0,this.w,this.h);

      // draw track background scaled to cover whole canvas but keep aspect ratio
      if (this.trackImg.complete) {
        // draw image covering canvas while preserving aspect ratio (cover)
        const imgW = this.trackImg.width, imgH = this.trackImg.height;
        if (imgW && imgH) {
          const scale = Math.max(this.w / imgW, this.h / imgH);
          const dw = imgW * scale, dh = imgH * scale;
          const ox = (this.w - dw) / 2, oy = (this.h - dh) / 2;
          this.ctx.drawImage(this.trackImg, ox, oy, dw, dh);
        } else {
          this.ctx.drawImage(this.trackImg, 0, 0, this.w, this.h);
        }
      } else {
        this.ctx.fillStyle = '#0b1220'; this.ctx.fillRect(0,0,this.w,this.h);
      }

      // draw plants
      this.plants.forEach(p=>{
        if (p.img.complete) this.ctx.drawImage(p.img, p.x, p.y, p.w, p.h);
      });

      // draw obstacles
      this.obstacles.forEach(ob=>{
        if (ob.img.complete) this.ctx.drawImage(ob.img, ob.x, ob.y, ob.w, ob.h);
        else { this.ctx.fillStyle='red'; this.ctx.fillRect(ob.x,ob.y,ob.w,ob.h); }
      });

      // draw coins
      this.coins.forEach(c=>{
        if (c.img.complete) this.ctx.drawImage(c.img, c.x, c.y, c.w, c.h);
        else { 
          this.ctx.fillStyle='yellow';
          this.ctx.beginPath();
          this.ctx.arc(c.x + c.w/2, c.y + c.h/2, Math.max(6, c.w/2), 0, Math.PI*2);
          this.ctx.fill();
        }
      });

      // draw player car
      if (this.carImg.complete) this.ctx.drawImage(this.carImg, this.player.x, this.player.y, this.player.w, this.player.h);
      else { this.ctx.fillStyle='white'; this.ctx.fillRect(this.player.x,this.player.y,this.player.w,this.player.h); }

      // bottom HUD
      this.ctx.fillStyle='rgba(0,0,0,0.35)'; this.ctx.fillRect(12,this.h - 52,420,38);
      this.ctx.fillStyle='#fff'; this.ctx.font='14px sans-serif';
      if (this.goal !== Infinity) {
        this.ctx.fillText(`Distance: ${Math.floor(this.distance)} / ${this.goal}`,22,this.h - 26);
      } else {
        const seconds = Math.floor(this.distance / (720 * (this.baseSpeed + this.level*0.08)));
        this.ctx.fillText(`Time: ${seconds}s • Coins: ${S.coins}`,22,this.h - 26);
      }
    }

    spawnObstacle(){
      const idx = Math.floor(Math.random() * this.obNames.length);
      const file = this.obNames[idx];
      const img = new Image(); img.src = 'assets/obstacles/' + file;
      const w = Math.round((50 + Math.random()*110) * (this.w / 1000));
      const h = Math.round(w * (0.45 + Math.random()*0.6));
      const x = 80 + Math.random() * (this.w - 160 - w);
      const y = -120 - Math.random()*200;
      const ob = { img, x, y, w, h };
      this.obstacles.push(ob);

      // chance to spawn a coin near the obstacle (30% chance)
      if (Math.random() < 0.3) {
        // coin near obstacle (above it)
        const cw = Math.round(w * 0.45);
        const ch = Math.round(cw * 0.9);
        const cx = Math.max(20, Math.min(this.w - cw - 20, x + (w/2) - cw/2 + (Math.random()-0.5)*w));
        const cy = y - 40 - Math.random()*60;
        const cimg = new Image(); cimg.src = ASSETS.coin;
        this.coins.push({ img: cimg, x: cx, y: cy, w: cw, h: ch });
      }
    }

    spawnPlant(){
      const src = this.plantImgs[Math.floor(Math.random() * this.plantImgs.length)];
      const img = new Image(); img.src = src;
      const w = Math.round(60 * (this.w / 1000)) + Math.round(Math.random()*40);
      const h = Math.round(w * 0.7);
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const x = side === 'left' ? 12 + Math.random()*30 : this.w - w - 12 - Math.random()*30;
      const y = -60 - Math.random()*120;
      this.plants.push({ img, x, y, w, h });
    }

    spawnCoinStandalone(){
      const cw = Math.round(36 * (this.w / 1000)) + Math.round(Math.random()*22);
      const ch = Math.round(cw * 0.9);
      const x = 80 + Math.random() * (this.w - 160 - cw);
      const y = -40 - Math.random()*80;
      const cimg = new Image(); cimg.src = ASSETS.coin;
      this.coins.push({ img: cimg, x, y, w: cw, h: ch });
    }

    hit(a,b){
      return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
    }

    togglePause(){
      if (!this.running) return;
      this.paused = !this.paused;
      pauseBtn.innerText = this.paused ? '▶ Resume' : '⏸ Pause';
      if (this.paused) this.showPauseModal();
      else modalRoot.innerHTML = '';
      // pause music while paused (but only if S.musicOn)
      if (S.musicOn) {
        if (this.paused) { bgMusic.pause(); } else { bgMusic.play().catch(()=>{}); }
      }
    }

    showPauseModal(){
      modalRoot.innerHTML = `
        <div class="modal">
          <div class="modal-card">
            <h3>Paused</h3>
            <div style="margin-top:12px">
              <button id="resumeBtn" class="btn small">Resume</button>
              <button id="tryBtn" class="btn small">Try Again</button>
              <button id="mainBtn" class="btn small">Main Menu</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('resumeBtn').onclick = ()=> { this.paused = false; pauseBtn.innerText='⏸ Pause'; modalRoot.innerHTML=''; if (S.musicOn) bgMusic.play().catch(()=>{}); };
      document.getElementById('tryBtn').onclick = ()=> { modalRoot.innerHTML=''; this.restartLevel(); };
      document.getElementById('mainBtn').onclick = ()=> { modalRoot.innerHTML=''; this.cleanup(); showMainMenu(); };
    }

    restartLevel(){
      this.obstacles = []; this.plants = []; this.coins = []; this.distance = 0; this.running = true; this.paused = false;
      this.lastSpawn = performance.now(); this.lastPlant = performance.now(); this.lastCoinSpawn = performance.now();
      this.start();
    }

    onLose(){
      // stop music
      if (S.musicOn) { bgMusic.pause(); bgMusic.currentTime = 0; }
      modalRoot.innerHTML = `
        <div class="modal">
          <div class="modal-card">
            <h2>YOU LOST</h2>
            <div style="margin-top:10px">You crashed!</div>
            <div style="margin-top:12px">
              <button id="tryAgainBtn" class="btn small">Try Again</button>
              <button id="mainMenuBtn" class="btn small">Main Menu</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('tryAgainBtn').onclick = ()=> { modalRoot.innerHTML=''; this.restartLevel(); };
      document.getElementById('mainMenuBtn').onclick = ()=> { modalRoot.innerHTML=''; this.cleanup(); showMainMenu(); };
    }

    onWin(){
      // if mode is endless, never win
      if (this.mode === 'endless') return;
      // stop music
      if (S.musicOn) { bgMusic.pause(); bgMusic.currentTime = 0; }
      // award coins & unlock next level
      S.coins += this.coinsReward;

      // unlock next level and possibly next season
      const sk = String(this.seasonIndex);
      const unlocked = S.unlocked[sk] || [];
      const nextL = this.level + 1;
      if (nextL <= 20 && !unlocked.includes(nextL)) { unlocked.push(nextL); unlocked.sort((a,b)=>a-b); S.unlocked[sk] = unlocked; }

      // if completed all levels of season -> unlock first level of next season & if last season -> loop
      const completedAll = S.unlocked[sk] && S.unlocked[sk].length >= 20;
      if (completedAll) {
        const nextSeason = (this.seasonIndex + 1) % 3;
        const nextSk = String(nextSeason);
        // ensure next season has level 1 unlocked
        const arr = S.unlocked[nextSk] || [];
        if (!arr.includes(1)) { arr.push(1); S.unlocked[nextSk] = arr.sort((a,b)=>a-b); }
      }

      // update high score if distance larger
      if (Math.floor(this.distance) > S.high) S.high = Math.floor(this.distance);

      // persist via shop module
      if (window.EGS && window.EGS.updateFromGame) window.EGS.updateFromGame({ coins: S.coins, high: S.high, unlocked: S.unlocked });

      modalRoot.innerHTML = `
        <div class="modal">
          <div class="modal-card">
            <h2>YOU WON 🎉</h2>
            <div style="margin-top:8px">Coins earned: ${this.coinsReward}</div>
            <div style="margin-top:12px">
              <button id="nextBtn" class="btn small">Next Level</button>
              <button id="mainBtn" class="btn small">Main Menu</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('nextBtn').onclick = ()=> {
        modalRoot.innerHTML = '';
        if (this.level < 20) {
          startGame(this.seasonIndex, this.level + 1);
        } else {
          // if finished season, automatically start next season level 1
          const nextSeason = (this.seasonIndex + 1) % 3;
          // ensure unlocked state set
          const nextSk = String(nextSeason);
          const arr = S.unlocked[nextSk] || [];
          if (!arr.includes(1)) { arr.push(1); S.unlocked[nextSk] = arr.sort((a,b)=>a-b); if (window.EGS && window.EGS.saveState) window.EGS.saveState(); }
          startGame(nextSeason, 1);
        }
      };
      document.getElementById('mainBtn').onclick = ()=> { modalRoot.innerHTML=''; this.cleanup(); showMainMenu(); };
    }

    cleanup(){
      this.unbindKeys();
      this.running = false;
      cancelAnimationFrame(this._frame);
      gameScreen.classList.add('hidden');
      updateHUD();
      if (window.EGS && window.EGS.saveState) window.EGS.saveState();
    }
  }

  // small visual +1 pulse (non-blocking)
  function shortPulse(text) {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.top = '18%';
    el.style.transform = 'translateX(-50%)';
    el.style.background = 'rgba(0,0,0,0.6)';
    el.style.color = '#fff';
    el.style.padding = '8px 12px';
    el.style.borderRadius = '8px';
    el.style.zIndex = 70;
    el.style.fontWeight = '800';
    el.innerText = text;
    document.body.appendChild(el);
    setTimeout(()=> { el.style.transition = 'all 350ms'; el.style.opacity = '0'; el.style.top = '15%'; }, 200);
    setTimeout(()=> { if (el && el.parentNode) el.parentNode.removeChild(el); }, 650);
  }

  // global control
  let currentGame = null;

  // startGame function for challenge mode
  window.startGame = function(seasonIndex, levelNum) {
    // hide screens
    mainMenu.classList.add('hidden');
    seasonSelect.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    modalRoot.innerHTML = '';

    // ensure selected car from shop state
    const st = window.EGS ? window.EGS.getState() : S;
    if (st.selectedCar) S.selectedCar = st.selectedCar;

    currentGame = new Game({ seasonIndex: seasonIndex, level: levelNum, mode: 'challenge', difficulty: 'medium' });
    pauseBtn.onclick = ()=> currentGame.togglePause();
    currentGame.start();
  };

  // start endless with difficulty
  function startEndless(difficulty) {
    mainMenu.classList.add('hidden');
    seasonSelect.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    modalRoot.innerHTML = '';
    const st = window.EGS ? window.EGS.getState() : S;
    if (st.selectedCar) S.selectedCar = st.selectedCar;
    currentGame = new Game({ seasonIndex: 0, level: 1, mode: 'endless', difficulty: difficulty });
    pauseBtn.onclick = ()=> currentGame.togglePause();
    currentGame.start();
  }

  // helper short toast
  function shortToast(msg) {
    modalRoot.innerHTML = `<div class="modal"><div class="modal-card">${msg}<div style="margin-top:8px"><button class="btn small" onclick="document.getElementById('modalRoot').innerHTML=''">OK</button></div></div></div>`;
    setTimeout(()=> { if (modalRoot) modalRoot.innerHTML = ''; }, 1100);
  }

  // initial UI setup
  updateHUD();
  // initial music UI state
  if ((localStorage.getItem('egs_music') || 'false') === 'true') { S.musicOn = true; musicToggleBtn.innerText = 'Music: On'; } else { S.musicOn = false; musicToggleBtn.innerText = 'Music: Off'; }

  // Make sure first season level unlocked if nothing exists
  if (!S.unlocked || Object.keys(S.unlocked).length === 0) { S.unlocked = {"0":[1],"1":[],"2":[]} ; if (window.EGS && window.EGS.saveState) window.EGS.saveState(); }

  // show main menu at start
  showMainMenu();

})();
