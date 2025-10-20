// Element helpers
function $(sel){ return document.querySelector(sel); }
function show(id){ $(id).classList.remove('hidden'); }
function hide(id){ $(id).classList.add('hidden'); }
function setText(id, text){ $(id).textContent = text; }

// App state (in-memory; kan later vervangen door echte sessies)
const state = {
  role: null, // 'host' | 'player'
  name: null,
  roomCode: null,
  polling: {
    statusIntervalId: null,
    playersIntervalId: null,
  }
};

// UI flows
function goHome(){
  Object.assign(state, { role:null, name:null, roomCode:null });
  hide('#host-setup');
  hide('#host-lobby');
  hide('#join-screen');
  hide('#player-wait');
  hide('#game-started');
  show('#start-screen');
  stopPolling();
}

function stopPolling(){
  if(state.polling.statusIntervalId){ clearInterval(state.polling.statusIntervalId); state.polling.statusIntervalId=null; }
  if(state.polling.playersIntervalId){ clearInterval(state.polling.playersIntervalId); state.polling.playersIntervalId=null; }
}

async function api(path, payload){
  const res = await fetch(`api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  const data = await res.json().catch(()=>({ ok:false, error:'Ongeldig antwoord' }));
  if(!res.ok || data.ok === false){
    throw new Error(data.error || `Fout (${res.status})`);
  }
  return data;
}

// Host: maak kamer
async function onHostCreate(e){
  e.preventDefault();
  const name = $('#host-name').value.trim();
  if(!name){ return; }
  try{
    const resp = await api('create_room.php', { name });
    state.role = 'host';
    state.name = name;
    state.roomCode = resp.code;
    setText('#host-room-code', resp.code);
    setText('#host-you-are', `Ingelogd als: ${name}`);
    hide('#host-setup');
    hide('#start-screen');
    show('#host-lobby');
    startHostPolling();
  }catch(err){
    $('#host-status').textContent = err.message;
  }
}

function startHostPolling(){
  // spelerslijst elke 3s
  state.polling.playersIntervalId = setInterval(async () => {
    try{
      const resp = await api('list_players.php', { code: state.roomCode });
      const ul = $('#host-player-list');
      ul.innerHTML = '';
      resp.players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = p.name;
        ul.appendChild(li);
      });
    }catch(_){ /* negeer */ }
  }, 3000);
  // status elke 3s
  state.polling.statusIntervalId = setInterval(async () => {
    try{
      const resp = await api('get_status.php', { code: state.roomCode });
      if(resp.status === 'gestart'){
        goGameStarted();
      }
    }catch(_){ /* negeer */ }
  }, 3000);
}

// Deelnemer: join kamer
async function onJoin(e){
  e.preventDefault();
  const name = $('#join-name').value.trim();
  const code = $('#join-code').value.trim().toUpperCase();
  if(!name || !code){ return; }
  try{
    const resp = await api('join_room.php', { name, code });
    state.role = 'player';
    state.name = name;
    state.roomCode = code;
    setText('#player-room-code', code);
    setText('#player-you-are', `Ingelogd als: ${name}`);
    hide('#join-screen');
    hide('#start-screen');
    show('#player-wait');
    startPlayerPolling();
  }catch(err){
    $('#player-status').textContent = err.message;
  }
}

function startPlayerPolling(){
  // status elke 3s
  state.polling.statusIntervalId = setInterval(async () => {
    try{
      const resp = await api('get_status.php', { code: state.roomCode });
      if(resp.status === 'gestart'){
        goGameStarted();
      } else {
        $('#player-wait-text').textContent = 'Wachten op start van de wedstrijd...';
      }
    }catch(_){ /* negeer */ }
  }, 3000);
}

function goGameStarted(){
  stopPolling();
  hide('#host-lobby');
  hide('#player-wait');
  show('#game-started');
}

// Host start spel
async function onStartGame(){
  if(!state.roomCode) return;
  try{
    await api('start_game.php', { code: state.roomCode });
    goGameStarted();
  }catch(err){
    $('#host-status').textContent = err.message;
  }
}

// Event listeners
window.addEventListener('DOMContentLoaded', () => {
  $('#btn-new-game').addEventListener('click', () => {
    hide('#start-screen');
    show('#host-setup');
    $('#host-name').focus();
  });
  $('#btn-join-game').addEventListener('click', () => {
    hide('#start-screen');
    show('#join-screen');
    $('#join-code').value='';
    $('#join-name').focus();
  });
  $('#host-cancel').addEventListener('click', goHome);
  $('#join-cancel').addEventListener('click', goHome);
  $('#btn-host-back').addEventListener('click', goHome);
  $('#btn-back-home').addEventListener('click', goHome);
  $('#btn-leave').addEventListener('click', goHome);
  $('#host-form').addEventListener('submit', onHostCreate);
  $('#join-form').addEventListener('submit', onJoin);
  $('#btn-start-game').addEventListener('click', onStartGame);
});


