// shop.js (updated - small tweaks)
// Handles garage/shop UI, buying, selecting cars, persistence.

(() => {
  const CARS = [
    { id: 'red', label: 'Red', price: 0 },
    { id: 'blue', label: 'Blue', price: 200 },
    { id: 'yellow', label: 'Yellow', price: 400 },
    { id: 'green', label: 'Green', price: 600 },
    { id: 'purple', label: 'Purple', price: 900 }
  ];

  const modalRoot = document.getElementById('modalRoot');
  const carList = document.getElementById('carList');
  const coinsChip = document.getElementById('coinsChip');
  const highChip = document.getElementById('highScoreChip');

  // persisted state
  const state = {
    coins: parseInt(localStorage.getItem('egs_coins') || '500'),
    high: parseInt(localStorage.getItem('egs_high') || '0'),
    selectedCar: localStorage.getItem('egs_car') || 'red',
    owned: JSON.parse(localStorage.getItem('egs_owned') || JSON.stringify(['red'])),
    unlocked: JSON.parse(localStorage.getItem('egs_unlocked') || '{"0":[1],"1":[],"2":[]}'),
    musicOn: (localStorage.getItem('egs_music') || 'false') === 'true'
  };

  function updateHUD() {
    coinsChip.innerText = `💰 ${state.coins}`;
    highChip.innerText = `🏆 High: ${state.high}`;
  }

  function renderCars() {
    carList.innerHTML = '';
    CARS.forEach(car => {
      const el = document.createElement('div');
      el.className = 'car-item';
      el.innerHTML = `
        <div style="font-weight:800;text-transform:capitalize">${car.label}</div>
        <img src="assets/cars/${car.id}.png" alt="${car.label}" onerror="this.style.opacity=0.25">
        <div style="margin-top:6px;color:#9fb3c7">Price: ${car.price} coins</div>
        <div style="margin-top:8px"></div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn small';
      if (state.owned.includes(car.id)) {
        btn.textContent = state.selectedCar === car.id ? 'Selected' : 'Select';
        btn.onclick = () => {
          state.selectedCar = car.id;
          localStorage.setItem('egs_car', state.selectedCar);
          renderCars();
        };
      } else {
        btn.textContent = 'Buy';
        btn.onclick = () => {
          showConfirm(`Buy ${car.label} for ${car.price} coins?`, confirmed => {
            if (!confirmed) return;
            if (state.coins >= car.price) {
              state.coins -= car.price;
              state.owned.push(car.id);
              state.selectedCar = car.id;
              persist();
              updateHUD();
              renderCars();
              showToast(`${car.label} purchased!`);
            } else {
              showToast('You have not enough coins.');
            }
          });
        };
      }
      el.querySelector('div:last-child').appendChild(btn);
      carList.appendChild(el);
    });
  }

  function showConfirm(message, cb) {
    modalRoot.innerHTML = `
      <div class="modal">
        <div class="modal-card">
          <h3>${message}</h3>
          <div style="margin-top:12px">
            <button id="confirmYes" class="btn small">Buy</button>
            <button id="confirmNo" class="btn small">Cancel</button>
          </div>
        </div>
      </div>`;
    document.getElementById('confirmYes').onclick = () => { modalRoot.innerHTML = ''; cb(true); };
    document.getElementById('confirmNo').onclick = () => { modalRoot.innerHTML = ''; cb(false); };
  }

  function showToast(msg) {
    modalRoot.innerHTML = `
      <div class="modal" onclick="document.getElementById('modalRoot').innerHTML=''">
        <div class="modal-card"><div>${msg}</div><div style="margin-top:10px"><button class="btn small">OK</button></div></div>
      </div>`;
  }

  function persist() {
    localStorage.setItem('egs_coins', state.coins);
    localStorage.setItem('egs_high', state.high);
    localStorage.setItem('egs_car', state.selectedCar);
    localStorage.setItem('egs_owned', JSON.stringify(state.owned));
    localStorage.setItem('egs_unlocked', JSON.stringify(state.unlocked));
    localStorage.setItem('egs_music', state.musicOn ? 'true' : 'false');
  }

  // hooks for other files
  window.EGS = window.EGS || {};
  window.EGS.getState = () => state;
  window.EGS.saveState = persist;
  window.EGS.updateFromGame = (updates) => {
    if (typeof updates.coins === 'number') state.coins = updates.coins;
    if (typeof updates.high === 'number') state.high = updates.high;
    if (updates.unlocked) state.unlocked = updates.unlocked;
    persist();
    updateHUD();
  };

  document.getElementById('garageBtn').addEventListener('click', ()=> {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('seasonSelect').classList.add('hidden');
    document.getElementById('garage').classList.remove('hidden');
    renderCars();
  });

  document.getElementById('backFromGarage').addEventListener('click', ()=> {
    document.getElementById('garage').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
  });

  // initialize
  updateHUD();
  renderCars();

})();
