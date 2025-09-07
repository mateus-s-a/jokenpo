const socket = io();

// UI elements
const matchmakingDiv = document.querySelector('.matchmaking');
const findGameBtn = document.querySelector('.find-game-btn');
const gameDiv = document.querySelector('.caixa');
const mensagemTexto = document.querySelector('.mensagem');
const resultadoTexto = document.querySelector('.resultado');

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
  socket.emit('findGame');
  mensagemTexto.textContent = 'Buscando jogo...';
  findGameBtn.disabled = true;
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
socket.on('waitingForPlayer', () => {
  mensagemTexto.textContent = 'Aguardando conexão com outro adversário...';
})

socket.on('gameStart', () => {
  mensagemTexto.textContent = 'Adversário encontrado. Faça sua escolha.';
  matchmakingDiv.style.display = 'none';  // hide matchmaking button
  gameDiv.style.display = 'flex';         // show game controls when players connected
});

// gameResult
socket.on('gameResult', (result) => {             // listening to gameResult
  mensagemTexto.textContent = result;
  resultadoTexto.textContent = '';                // new round
});

socket.on('opponentDisconnected', () => {
  mensagemTexto.textContent = 'Adversário saiu. Encontre um novo jogo.';
  gameDiv.style.display = 'none';               // hide game
  matchmakingDiv.style.display = 'block';       // show again matchmaking
  findGameBtn.disabled = false;
});