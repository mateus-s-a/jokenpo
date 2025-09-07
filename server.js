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

  socket.on('findGame', (data) => {           // handler type
    const { playerName, gameMode } = data;
    let roomId = findAvailableRoom(gameMode);

    if (roomId) {
      socket.join(roomId);                // joining existing room
      socket.roomId = roomId;
      rooms[roomId].players[socket.id] = {
        name: playerName,
        choice: null,
        score: { wins: 0, losses: 0, ties: 0 }
      };
      
      console.log(`Player ${playerName} (${socket.id}) joined room ${roomId}`);
      
      const playerNames = Object.values(rooms[roomId].players).map(p => p.name);
      io.to(roomId).emit('gameStart', { playerNames });                         // notify game started & show player names for each other
    } else {
      roomId = `room_${socket.id}`;       // create new room
      socket.join(roomId);
      socket.roomId = roomId;

      let winCondition = Infinity;
      if (gameMode === 'bo3') winCondition = 3;
      if (gameMode === 'bo5') winCondition = 5;

      rooms[roomId] = {                   // create the room with player and score
        mode: gameMode,                   // store the game mode
        winCondition: winCondition,
        players: {
          [socket.id]: {
            name: playerName,             // store player's name
            choice: null,
            score: { wins: 0, losses: 0, ties: 0 }
          }
        }
      };
      
      console.log(`Player ${playerName} (${socket.id}) created and joined room ${roomId}`);
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
      console.log(`Room ${roomId}: Both players chose. Determining winner...`);
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


function findAvailableRoom(gameMode) {
  return Object.keys(rooms).find(roomId =>
    rooms[roomId].mode === gameMode && 
    Object.keys(rooms[roomId].players).length === 1
  );
}

function determineWinner(roomId) {
  const room = rooms[roomId];
  if (!room) return;                // when room been deleted on 'disconnect' handler

  const playerIds = Object.keys(room.players);
  const player1Id = playerIds[0];
  const player2Id = playerIds[1];
  const player1 = room.players[player1Id];
  const player2 = room.players[player2Id];
  let matchWinner = null;
  
  // main logic of the game
  if (player1.choice === player2.choice) {
    player1.score.ties++;
    player2.score.ties++;
  } else if (
    (player1.choice === "Pedra" && player2.choice === "Tesoura") ||
    (player1.choice === "Tesoura" && player2.choice === "Papel") ||
    (player1.choice === "Papel" && player2.choice === "Pedra")
  ) {
    player1.score.wins++;
    player2.score.losses++;
  } else {
    player2.score.wins++;
    player1.score.losses++;
  }

  if (player1.score.wins >= room.winCondition) {
    matchWinner = player1.name;
  } else if (player2.score.wins >= room.winCondition) {
    matchWinner = player2.name;
  }


  // RESULT OBJECTS
  const result1 = {
    message: getResultMessage(player1, player2, 'You'),
    opponentChoice: player2.choice,
    score: player1.score
  };
  const result2 = {
    message: getResultMessage(player2, player1, 'You'),
    opponentChoice: player1.choice,
    score: player2.score
  };

  // send result information to players
  io.to(player1Id).emit('gameResult', result1);
  io.to(player2Id).emit('gameResult', result2);
  console.log(`Room ${roomId} round result sent...`);


  if (matchWinner) {
    io.to(roomId).emit('matchOver', { winnerName: matchWinner });
    console.log(`Match over in room ${roomId}. Winner: ${matchWinner}`);

    delete rooms[roomId];       // clean room
  } else {
    player1.choice = null;      // reset
    player2.choice = null;
  }
}

// HELPER function to generate the result matches messages
function getResultMessage(player, opponent, selfRef) {
  if (player.choice === opponent.choice) {
    return `Empate! Ambos escolheram ${player.choice}`;
  } else if (player.score.wins > opponent.score.losses) {
    return `${selfRef} venceu! ${player.choice} derrotou ${opponent.choice} de ${opponent.name}`;
  } else {
    return `${selfRef} perdeu! ${player.choice} foi derrotado por ${opponent.choice} de ${opponent.name}`;
  }
}




server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});