const socket = io();

const btn_tesoura = document.querySelector('.tesoura');
const btn_pedra = document.querySelector('.pedra');
const btn_papel = document.querySelector('.papel');
let escolha;
let escolhaAdversario;
const resultadoTexto = document.querySelector('.resultado');
const mensagemTexto = document.querySelector('.mensagem');

// INFORMAÇÕES
let cVitorias = 0,
  cDerrotas = 0,
  cEmpates = 0

const n1 = document.querySelector('.n1');
const n2 = document.querySelector('.n2');
const n3 = document.querySelector('.n3');


//tesoura
btn_tesoura.addEventListener('click', () => {
  socket.emit('playerChoice', 'Tesoura');
});

//pedra
btn_pedra.addEventListener('click', () => {
  socket.emit('playerChoice', 'Pedra');
});

//papel
btn_papel.addEventListener('click', () => {
  socket.emit('playerChoice', 'Papel');
});
