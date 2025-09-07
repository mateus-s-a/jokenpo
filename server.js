const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3000;

app.use(express.static(__dirname));



let rooms = {};


io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('findGame', () => {
    let roomId = findAvailableRoom();

    if (roomId) {
      socket.join(roomId);                // joining existing room
      socket.roomId = roomId;
      rooms[roomId].players[socket.id] = { choice: null };
      
      console.log(`Player ${socket.id} joined room ${roomId}`);
      io.to(roomId).emit('gameStart');    // notify game started
    } else {
      roomId = `room_${socket.id}`;       // create new room
      socket.join(roomId);
      rooms[roomId] = { players: { [socket.id]: { choice: null } } };
      
      console.log(`Player ${socket.id} created and joined room ${roomId}`);
      socket.emit('waitingForPlayer');
    }
  });

  socket.on('playerChoice', (choice) => {
    const roomId = Array.from(socket.rooms).find(r => r.startsWith('room_'));
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId].players[socket.id].choice = choice;
    console.log(`Player ${socket.id} in room ${roomId} chose ${choice}`);

    const room = rooms[roomId];
    const players = Object.values(room.players);

    if (players.length === 2 && players.every(p => p.choice !== null)) {
      console.log(`Room ${roomId}: Both players chose. Determining winner.`);
      determineWinner(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
    
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      delete rooms[roomId];
      io.to(roomId).emit('opponentDisconnected');
      console.log(`Room ${roomId} was closed`);
    }
  });
});


function findAvailableRoom() {
  return Object.keys(rooms).find(roomId =>
    Object.keys(rooms[roomId].players).length === 1
  );
}

function determineWinner(roomId) {
  const room = rooms[roomId];
  const playerIds = Object.keys(room.players);
  const player1Id = playerIds[0];
  const player2Id = playerIds[1];
  const player1 = room.players[playerIds[0]];
  const player2 = room.players[playerIds[1]];
  
  let result1, result2;

  if (player1.choice === player2.choice) {
    const message = `Empate. Ambos escolheram ${player1.choice}`;
    result1 = { message: message, opponentChoice: player2.choice };
    result2 = { message: message, opponentChoice: player1.choice };

  } else if (
    (player1.choice === "Pedra" && player2.choice === "Tesoura") ||
    (player1.choice === "Tesoura" && player2.choice === "Papel") ||
    (player1.choice === "Papel" && player2.choice === "Pedra")
  ) {
    // --- P1 WINS ---
    result1 = { message: `Vitória! ${player1.choice} vence de ${player2.choice}`, opponentChoice: player2.choice };
    result2 = { message: `Derrota! ${player2.choice} perde de ${player1.choice}`, opponentChoice: player1.choice };
  } else {
    // --- P2 WINS ---
    result1 = { message: `Derrota! ${player1.choice} perde de ${player2.choice}`, opponentChoice: player2.choice };
    result2 = { message: `Vitória! ${player2.choice} vence de ${player1.choice}`, opponentChoice: player1.choice };
  }

  io.to(player1Id).emit('gameResult', result1);
  io.to(player2Id).emit('gameResult', result2);

  console.log(`Room ${roomId} result sent`);

  player1.choice = null;
  player2.choice = null;
}



server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});