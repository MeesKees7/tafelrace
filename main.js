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
  },
  game: {
    questions: [],
    currentQuestion: 0,
    correctAnswers: 0,
    gameTimer: null,
    timeRemaining: 60,
    gameStarted: false,
    wrongAttempts: 0, // Teller voor foute pogingen per vraag
    selectedTables: [] // Geselecteerde tafels voor de wedstrijd
  }
};

// UI flows
function goHome(){
  Object.assign(state, { 
    role:null, 
    name:null, 
    roomCode:null,
    game: {
      questions: [],
      currentQuestion: 0,
      correctAnswers: 0,
      gameTimer: null,
      timeRemaining: 60,
      gameStarted: false,
      wrongAttempts: 0,
      selectedTables: []
    }
  });
  hide('#host-setup');
  hide('#host-lobby');
  hide('#join-screen');
  hide('#player-wait');
  hide('#game-started');
  hide('#scoreboard');
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

// Tafel selectie helpers
function getSelectedTables(){
  const checkboxes = document.querySelectorAll('input[name="table"]:checked');
  return Array.from(checkboxes).map(cb => parseInt(cb.value)).sort((a,b) => a-b);
}

function selectPresetTables(preset){
  // Reset alle checkboxes
  document.querySelectorAll('input[name="table"]').forEach(cb => cb.checked = false);
  
  // Reset preset buttons
  document.querySelectorAll('.btn.preset').forEach(btn => btn.classList.remove('active'));
  
  let tables = [];
  switch(preset){
    case 'basic':
      tables = [1, 2, 5, 10];
      break;
    case 'all':
      tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      break;
    case 'advanced':
      tables = [6, 7, 8, 9];
      break;
  }
  
  // Selecteer de tafels
  tables.forEach(table => {
    const checkbox = document.querySelector(`input[name="table"][value="${table}"]`);
    if(checkbox) checkbox.checked = true;
  });
  
  // Markeer preset button als actief
  const presetBtn = document.querySelector(`[data-preset="${preset}"]`);
  if(presetBtn) presetBtn.classList.add('active');
}

// Host: maak kamer
async function onHostCreate(e){
  e.preventDefault();
  const name = $('#host-name').value.trim();
  const selectedTables = getSelectedTables();
  
  if(!name){ 
    $('#host-status').textContent = 'Naam is vereist';
    return; 
  }
  
  if(selectedTables.length === 0){
    $('#host-status').textContent = 'Selecteer ten minste één tafel';
    return;
  }
  
  $('#host-status').textContent = 'Spel wordt aangemaakt...';
  
  try{
    const resp = await api('create_room.php', { 
      name, 
      tableConfig: JSON.stringify(selectedTables) 
    });
    
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
  
  if(!name){ 
    $('#join-status').textContent = 'Naam is vereist';
    return; 
  }
  
  if(!code){ 
    $('#join-status').textContent = 'Wedstrijdcode is vereist';
    return; 
  }
  
  $('#join-status').textContent = 'Bezig met deelnemen...';
  
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
    $('#join-status').textContent = err.message;
  }
}

function startPlayerPolling(){
  // Haal room info op om tafels te tonen
  loadRoomInfo();
  
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

async function loadRoomInfo(){
  try{
    const resp = await api('get_room_info.php', { code: state.roomCode });
    if(resp.ok && resp.selectedTables.length > 0) {
      const tablesText = resp.selectedTables.length === 1 ? 
        `Tafel van ${resp.selectedTables[0]}` : 
        `Tafels van ${resp.selectedTables.join(', ')}`;
      
      // Update lobby titels - alleen voor deelnemers
      $('#player-lobby-title').textContent = `${tablesText} Wedstrijd`;
      $('#player-wait-title').textContent = `${tablesText} Wedstrijd`;
    }
  }catch(err){
    console.error('Error loading room info:', err);
  }
}

async function goGameStarted(){
  stopPolling();
  hide('#host-lobby');
  hide('#player-wait');
  hide('#game-end'); // Verberg game-end sectie bij nieuwe wedstrijd
  show('#game-started');
  
  // Voor spelers: laad altijd de nieuwste vragen (ook bij nieuwe wedstrijd)
  if(state.role === 'player'){
    try{
      const resp = await api('get_questions.php', { code: state.roomCode });
      state.game.questions = resp.questions;
      // Sla geselecteerde tafels op voor deelnemers
      state.game.selectedTables = resp.selectedTables || [];
      // Reset game state voor nieuwe wedstrijd
      state.game.currentQuestion = 0;
      state.game.correctAnswers = 0;
      state.game.wrongAttempts = 0;
      state.game.gameStarted = false;
    }catch(err){
      console.error('Error loading questions:', err);
    }
  }
  
  // Start het spel voor alle spelers (host en deelnemers)
  if(state.game.questions.length > 0){
    setTimeout(startGame, 1000); // Start na 1 seconde
  }
}

// Host start spel
async function onStartGame(){
  if(!state.roomCode) return;
  try{
    const resp = await api('start_game.php', { code: state.roomCode });
    state.game.questions = resp.questions;
    // Reset game state voor nieuwe wedstrijd
    state.game.currentQuestion = 0;
    state.game.correctAnswers = 0;
    state.game.wrongAttempts = 0;
    state.game.gameStarted = false;
    // Sla geselecteerde tafels op
    state.game.selectedTables = resp.selectedTables || [];
    
    // Update host lobby titel
    if(state.game.selectedTables.length > 0) {
      const tablesText = state.game.selectedTables.length === 1 ? 
        `Tafel van ${state.game.selectedTables[0]}` : 
        `Tafels van ${state.game.selectedTables.join(', ')}`;
      $('#host-lobby-title').textContent = `${tablesText} Wedstrijd`;
    }
    
    goGameStarted();
  }catch(err){
    $('#host-status').textContent = err.message;
  }
}

// Game logica
function startGame(){
  if(state.game.gameStarted) return;
  
  // Zorg ervoor dat we vragen hebben voordat we starten
  if(state.game.questions.length === 0) {
    console.error('Geen vragen beschikbaar om te starten');
    return;
  }
  
  // Update game title met geselecteerde tafels
  updateGameTitle();
  
  // Verberg game-end sectie en toon question display
  hide('#game-end');
  show('#question-display');
  
  state.game.gameStarted = true;
  state.game.currentQuestion = 0;
  state.game.correctAnswers = 0;
  state.game.wrongAttempts = 0;
  state.game.timeRemaining = 60;
  
  // Sla starttijd op voor deze speler
  api('set_game_start.php', {
    code: state.roomCode,
    playerName: state.name
  }).catch(err => console.error('Error setting game start:', err));
  
  // Start timer
  state.game.gameTimer = setInterval(() => {
    state.game.timeRemaining--;
    updateGameDisplay();
    
    if(state.game.timeRemaining <= 0){
      endGame();
    }
  }, 1000);
  
  showCurrentQuestion();
  updateGameDisplay();
}

function showCurrentQuestion(){
  if(state.game.currentQuestion >= state.game.questions.length){
    // Speler heeft alle 30 sommen gehaald, maar wacht tot minuut voorbij is
    show('#question-display');
    $('#question-text').innerHTML = 'Alle sommen voltooid! Wacht tot de tijd voorbij is...';
    return;
  }
  
  // Reset foute pogingen voor nieuwe vraag
  state.game.wrongAttempts = 0;
  
  const question = state.game.questions[state.game.currentQuestion];
  $('#question-text').innerHTML = question.question + ' = <input id="answer-input" type="number" />';
  $('#answer-input').value = '';
  $('#answer-input').style.backgroundColor = '';
  $('#answer-input').style.color = '';
  $('#answer-input').focus();
  
  // Herstel event listeners voor het nieuwe input veld
  $('#answer-input').addEventListener('keypress', (e) => {
    if(e.key === 'Enter'){
      submitAnswer();
    }
  });
  
  show('#question-display');
}

function updateGameDisplay(){
  const minutes = Math.floor(state.game.timeRemaining / 60);
  const seconds = state.game.timeRemaining % 60;
  $('#game-timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  $('#question-counter').textContent = state.game.currentQuestion + 1;
  $('#correct-counter').textContent = state.game.correctAnswers;
}

function updateGameTitle(){
  // Gebruik de opgeslagen geselecteerde tafels
  if(state.game.selectedTables.length > 0) {
    const tablesText = state.game.selectedTables.length === 1 ? 
      `Tafel van ${state.game.selectedTables[0]}` : 
      `Tafels van ${state.game.selectedTables.join(', ')}`;
    $('#game-title').textContent = `${tablesText} Wedstrijd`;
  } else {
    $('#game-title').textContent = 'Tafelsommen Wedstrijd';
  }
}


async function submitAnswer(){
  const answer = parseInt($('#answer-input').value);
  if(isNaN(answer)) return;
  
  // Als alle sommen voltooid zijn, negeer input
  if(state.game.currentQuestion >= state.game.questions.length) return;
  
  const question = state.game.questions[state.game.currentQuestion];
  
  try{
    const resp = await api('submit_answer.php', {
      code: state.roomCode,
      playerName: state.name,
      questionNumber: question.question_number,
      answer: answer
    });
    
    if(resp.isCorrect){
      state.game.correctAnswers++;
      // Toon groene feedback en ga naar volgende vraag
      showCorrectFeedback();
    } else {
      state.game.wrongAttempts++;
      if(state.game.wrongAttempts >= 3){
        // Na 3 foute pogingen automatisch naar volgende vraag
        showIncorrectFeedback();
        setTimeout(() => {
          nextQuestion();
        }, 1000);
      } else {
        // Toon fout feedback en blijf bij dezelfde vraag
        showIncorrectFeedback();
      }
    }
  }catch(err){
    console.error('Error submitting answer:', err);
  }
}

function showCorrectFeedback(){
  // Toon groene feedback voor goed antwoord
  const answerInput = $('#answer-input');
  
  // Maak input groen
  answerInput.style.backgroundColor = '#22c55e';
  answerInput.style.color = 'white';
  
  // Na 0.5 seconde naar volgende vraag (korter)
  setTimeout(() => {
    nextQuestion();
  }, 500);
}

function showIncorrectFeedback(){
  // Toon fout feedback maar blijf bij dezelfde vraag
  const answerInput = $('#answer-input');
  
  // Maak input rood
  answerInput.style.backgroundColor = '#ef4444';
  answerInput.style.color = 'white';
  answerInput.value = '';
  
  // Na 1 seconde terug naar normaal
  setTimeout(() => {
    answerInput.style.backgroundColor = '';
    answerInput.style.color = '';
    answerInput.value = '';
    $('#answer-input').focus();
  }, 1000);
}

function nextQuestion(){
  state.game.currentQuestion++;
  showCurrentQuestion();
}

function endGame(){
  if(state.game.gameTimer){
    clearInterval(state.game.gameTimer);
    state.game.gameTimer = null;
  }
  
  state.game.gameStarted = false;
  
  hide('#question-display');
  show('#game-end');
  
  $('#final-score').textContent = `Je hebt ${state.game.correctAnswers} vragen goed beantwoord!`;
  
  // Na 3 seconden toon scoreboard
  setTimeout(() => {
    showScoreboard();
  }, 3000);
}

async function showScoreboard(){
  try{
    const resp = await api('get_scores.php', { code: state.roomCode });
    
    if(resp.ok && resp.scores !== undefined) {
      // Update scoreboard titel met tafels
      if(state.game.selectedTables.length > 0) {
        const tablesText = state.game.selectedTables.length === 1 ? 
          `Tafel van ${state.game.selectedTables[0]}` : 
          `Tafels van ${state.game.selectedTables.join(', ')}`;
        $('#scoreboard-title').textContent = `${tablesText} - Top 3`;
      } else {
        $('#scoreboard-title').textContent = 'Top 3';
      }
      
      displayLeaderboard(resp.scores);
    } else {
      throw new Error(resp.error || 'Unknown error');
    }
    
    hide('#game-started');
    hide('#game-end');
    show('#scoreboard');
  }catch(err){
    console.error('Error loading scores:', err);
    // Toon een fallback bericht als scores niet kunnen worden geladen
    hide('#game-started');
    hide('#game-end');
    show('#scoreboard');
    $('#leaderboard').innerHTML = '<p>Kon scores niet laden. Probeer opnieuw.</p>';
  }
}

function displayLeaderboard(scores){
  const leaderboard = $('#leaderboard');
  leaderboard.innerHTML = '';
  
  if(scores.length === 0) {
    leaderboard.innerHTML = '<p>Geen scores beschikbaar.</p>';
    return;
  }
  
  // Groepeer spelers per score en tijd (voor exacte gedeelde plaatsen)
  const scoreTimeGroups = {};
  scores.forEach(player => {
    const key = `${player.correct_answers}_${player.total_time_seconds || 'null'}`;
    if(!scoreTimeGroups[key]) {
      scoreTimeGroups[key] = [];
    }
    scoreTimeGroups[key].push(player);
  });
  
  // Sorteer scores (hoog naar laag)
  const sortedKeys = Object.keys(scoreTimeGroups).sort((a, b) => {
    const [scoreA, timeA] = a.split('_');
    const [scoreB, timeB] = b.split('_');
    
    // Eerst op score
    if(scoreA !== scoreB) return scoreB - scoreA;
    
    // Dan op tijd (snelste eerst, alleen voor 30+ scores)
    if(scoreA >= 30 && timeA !== 'null' && timeB !== 'null') {
      return timeA - timeB;
    }
    
    return 0;
  });
  
  let currentPosition = 1;
  let displayedCount = 0;
  const maxDisplay = 3; // Maximaal 3 posities tonen
  
  for(const key of sortedKeys) {
    if(displayedCount >= maxDisplay) break;
    
    const players = scoreTimeGroups[key];
    const isFirstPlace = currentPosition === 1;
    const isSecondPlace = currentPosition === 2;
    const isThirdPlace = currentPosition === 3;
    
    players.forEach(player => {
      const item = document.createElement('div');
      
      // Bepaal CSS klasse op basis van positie
      let cssClass = 'leaderboard-item';
      if(isFirstPlace) cssClass += ' first';
      else if(isSecondPlace) cssClass += ' second';
      else if(isThirdPlace) cssClass += ' third';
      
      item.className = cssClass;
      
      // Toon positie (alleen gedeeld als exact dezelfde score EN tijd)
      const positionText = players.length > 1 ? 
                          (isFirstPlace ? '1e' : isSecondPlace ? '2e' : isThirdPlace ? '3e' : currentPosition) :
                          currentPosition;
      
      // Format tijd voor weergave
      let timeDisplay = '';
      if (player.total_time_seconds && player.correct_answers >= 30) {
        const minutes = Math.floor(player.total_time_seconds / 60);
        const seconds = player.total_time_seconds % 60;
        timeDisplay = ` (${minutes}:${seconds.toString().padStart(2, '0')})`;
      }
      
      item.innerHTML = `
        <div class="leaderboard-position">${positionText}</div>
        <div class="leaderboard-name">${player.name}</div>
        <div class="leaderboard-score">${player.correct_answers} goed${timeDisplay}</div>
      `;
      
      leaderboard.appendChild(item);
      displayedCount++;
    });
    
    currentPosition += players.length;
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
  
  // Tafel selectie event listeners
  document.querySelectorAll('.btn.preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      selectPresetTables(preset);
    });
  });
  
  // Reset preset buttons wanneer individuele checkboxes worden gebruikt
  document.querySelectorAll('input[name="table"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      document.querySelectorAll('.btn.preset').forEach(btn => {
        btn.classList.remove('active');
      });
    });
  });
  
  // Game event listeners - Enter key wordt afgehandeld in showCurrentQuestion
  
  $('#btn-back-home-from-scores').addEventListener('click', goHome);
  
});


