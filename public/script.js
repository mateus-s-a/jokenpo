const socket = io();

// UI elements
const matchmakingDiv = document.querySelector('.matchmaking');
const playerNameInput = document.querySelector('#playerNameInput');
const findGameBtn = document.querySelector('.find-game-btn');
const gameDiv = document.querySelector('.caixa');
const mensagemTexto = document.querySelector('.mensagem');
const resultadoTexto = document.querySelector('.resultado');
const opponentNameText = document.querySelector('#opponentNameText');
const exitBtnContainer = document.querySelector('.exit-btn-container');
const exitGameBtn = document.querySelector('#exitGameBtn');

// game btns
const btn_tesoura = document.querySelector('.tesoura');
const btn_pedra = document.querySelector('.pedra');
const btn_papel = document.querySelector('.papel');

// scoreboard elements
const n1 = document.querySelector('.n1');
const n2 = document.querySelector('.n2');
const n3 = document.querySelector('.n3');

let escolha;
let escolhaAdversario;

// INFORMAÇÕES
let cVitorias = 0,
    cDerrotas = 0,
    cEmpates = 0;



findGameBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    mensagemTexto.textContent = 'Por favor insire um nome';
    return;
  }

  const gameMode = document.querySelector('input[name="gameMode"]:checked').value;
  socket.emit('findGame', { playerName, gameMode });

  mensagemTexto.textContent = 'Buscando jogo...';
  findGameBtn.disabled = true;
  playerNameInput.disabled = true;
});

//tesoura
btn_tesoura.addEventListener('click', () => {
  socket.emit('playerChoice', 'Tesoura');
  mensagemTexto.textContent = "Você escolheu 'Tesoura'. Esperando adversário...";
});

//pedra
btn_pedra.addEventListener('click', () => {
  socket.emit('playerChoice', 'Pedra');
  mensagemTexto.textContent = "Você escolheu 'Pedra'. Esperando adversário...";
});

//papel
btn_papel.addEventListener('click', () => {
  socket.emit('playerChoice', 'Papel');
  mensagemTexto.textContent = "Você escolheu 'Papel'. Esperando adversário...";
});


// --- SERVER EVENTS LISTENERS ---
// waitingForPlayer
socket.on('waitingForPlayer', () => {
  mensagemTexto.textContent = 'Aguardando conexão com outro adversário...';
});


// gameStart
socket.on('gameStart', (data) => {
  const myName = playerNameInput.value.trim();
  const opponentName = data.playerNames.find(name => name !== myName);
  
  opponentNameText.textContent = `Adversário: ${opponentName}`;
  mensagemTexto.textContent = 'Adversário encontrado. Faça sua escolha.';
  matchmakingDiv.style.display = 'none';  // hide matchmaking button
  gameDiv.style.display = 'flex';         // show game controls when players connected
  exitBtnContainer.style.display = 'block';
});

exitGameBtn.addEventListener('click', () => {
  const confirmed = window.confirm("Você tem certeza que deseja sair? Isso contará como uma derrota.");
  if (confirmed) {
    socket.emit('playerForfeit');
    window.location.reload();
  }
});



// opponentHasChosen
socket.on('opponentHasChosen', () => {
  mensagemTexto.textContent = 'Adversário escolheu, você tem 5 segundos';
});


const choiceToEmoji = {
  "Tesoura": "✂️",
  "Pedra": "🪨",
  "Papel": "📃",
  "None": "⏰"
};

// gameResult
socket.on('gameResult', (result) => {             // listening to gameResult
  mensagemTexto.textContent = result.message;
  resultadoTexto.textContent = choiceToEmoji[result.opponentChoice] || '';                // new round

  
  resultadoTexto.classList.remove('reveal-anim'); // re-trigger the reveal animation
  void resultadoTexto.offsetWidth;                // small trick to force the browser restart the animation
  resultadoTexto.classList.add('reveal-anim');

  if (result.score) {                             // update the scoreboard UI
    n1.innerHTML = result.score.wins;
    n2.innerHTML = result.score.losses;
    n3.innerHTML = result.score.ties;
  }
});

// opponentForfeited: when a player leaves the match by clicking the exit button
socket.on('opponentForfeited', (data) => {
  mensagemTexto.textContent = 'Seu oponent saiu. Você venceu!';
  resultadoTexto.textContent = '🔌';

  btn_tesoura.disabled = true;
  btn_pedra.disabled = true;
  btn_papel.disabled = true;
  exitGameBtn.disabled = true;

  const backToMenuBtn = document.createElement('button');
  backToMenuBtn.textContent = 'Voltar ao Menu';
  backToMenuBtn.className = 'find-game-btn btn btn-success btn-lg mt-3';
  backToMenuBtn.onclick = () => window.location.reload();

  setTimeout(() => {
    mensagemTexto.appendChild(document.createElement('br'));
    mensagemTexto.appendChild(backToMenuBtn);
  }, 2000);
});


// matchOver
socket.on('matchOver', (data) => {
  mensagemTexto.textContent = `${data.winnerName} venceu a partida!`;     // display the final winner at 3-5 modes

  btn_tesoura.disabled = true;    // disable game buttons
  btn_pedra.disabled = true;
  btn_papel.disabled = true;
  exitGameBtn.disabled = true;
  

  const backToMenuBtn = document.createElement('button');
  backToMenuBtn.textContent = 'Sair';
  backToMenuBtn.className = 'find-game-btn btn btn-success btn-lg mt-3' ;   // reuse the same style
  backToMenuBtn.onclick = () => window.location.reload();

  setTimeout(() => {    // brief delay to show the play again button
    mensagemTexto.appendChild(document.createElement('br'));
    mensagemTexto.appendChild(backToMenuBtn);
  }, 2000);
});

// opponentDisconnected
socket.on('opponentDisconnected', () => {
  mensagemTexto.textContent = 'Adversário saiu. Encontre um novo jogo.';
  gameDiv.style.display = 'none';               // hide game
  matchmakingDiv.style.display = 'flex';       // show again matchmaking
  findGameBtn.disabled = false;
  playerNameInput.disabled = false;
});