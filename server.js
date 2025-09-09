const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));    // pointing to 'public/' folder



let rooms = {};
let activeTimers = {};


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
      if (gameMode === 'bo3') winCondition = 2;
      if (gameMode === 'bo5') winCondition = 3;

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
    const room = rooms[roomId];
    if (!roomId || !rooms[roomId]) return;

    if (room.players[socket.id].choice) {
      return;
    }

    room.players[socket.id].choice = choice;
    console.log(`Player ${room.players[socket.id].name} in room ${roomId} chose ${choice}`);
    
    const playersWithChoice = Object.values(room.players).filter(p => p.choice !== null);
    
    if (playersWithChoice.length === 1) {
      const opponentId = Object.keys(room.players).find(id => id !== socket.id);
      
      if (opponentId) {
        io.to(opponentId).emit('opponentHasChosen');
      }

      room.turnTimer = setTimeout(() => {
        handleTimeout(roomId, socket.id);
      }, 5000);

    } else if (playersWithChoice.length === 2) {
      if (room.turnTimer) {
        clearTimeout(room.turnTimer);
        room.turnTimer = null;
      }
      determineWinner(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
    
    if (activeTimers[socket.id]) {
      clearTimeout(activeTimers[socket.id]);
      delete activeTimers[socket.id];
      console.log(`Cleared timer for disconnected user ${socket.id}`);
    }
    
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      
      if (rooms[roomId].turnTimer) {
        clearTimeout(rooms[roomId].turnTimer);
        console.log(`Cleared pending timer for room ${roomId}`);
      }

      io.to(roomId).emit('opponentDisconnected');
      delete rooms[roomId];
      console.log(`Room ${roomId} was closed`);
    }
  });

  socket.on('playerForfeit', () => {
    const roomId = socket.roomId;
    const room = rooms[roomId];

    if (!room) return;

    const loserId = socket.id;
    const winnerId = Object.keys(room.players).find(id => id !== loserId);

    if (winnerId) {
      const winner = room.players[winnerId];
      io.to(winnerId).emit('opponentForfeited', { winnerName: winner.name });
      /*io.to(roomId).emit('matchOver', { winnerName: winner.name });*/
      console.log(`Match over in room ${roomId}. Winner by forfeit: ${winner.name}`);
    }

    Object.keys(room.players).forEach(id => {
      if (activeTimers[id]) {
        clearTimeout(activeTimers[id]);
        delete activeTimers[id];
      }
    });

    delete rooms[roomId];     // clean up the last room
  });
});



function findAvailableRoom(gameMode) {
  return Object.keys(rooms).find(roomId =>
    rooms[roomId].mode === gameMode &&
    Object.keys(rooms[roomId].players).length === 1
  );
}

// determineWinner
function determineWinner(roomId) {
  const room = rooms[roomId];
  if (!room) return;              // when room been deleted on 'disconnected' handler

  const playerIds = Object.keys(room.players);
  const player1Id = playerIds[0];
  const player2Id = playerIds[1];
  const player1 = room.players[player1Id];
  const player2 = room.players[player2Id];
  
  let result1, result2;
  let matchWinner = null;

  // main logic of the GAME
  if (player1.choice === player2.choice) {
    player1.score.ties++;
    player2.score.ties++;
    const message = `Empate! Ambos escolheram ${player1.choice}`;
    result1 = { message: message, opponentChoice: player2.choice, score: player1.score };
    result2 = { message: message, opponentChoice: player1.choice, score: player2.score };
  } else if (
    (player1.choice === "Pedra" && player2.choice === "Tesoura") ||
    (player1.choice === "Tesoura" && player2.choice === "Papel") ||
    (player1.choice === "Papel" && player2.choice === "Pedra")
  ) {
    // PLAYER 1 WINS THE ROUND
    player1.score.wins++;
    player2.score.losses++;
    result1 = { message: `Você venceu! ${player1.choice} derrotou ${player2.choice} de ${player2.name}`, opponentChoice: player2.choice, score: player1.score };
    result2 = { message: `Você perdeu! ${player2.choice} foi derrotado por ${player1.choice} de ${player1.name}`, opponentChoice: player1.choice, score: player2.score };
  } else {
    // PLAYER 2 WINS THE ROUND
    player2.score.wins++;
    player1.score.losses++;
    result1 = { message: `Você perdeu! ${player1.choice} foi derrotado por ${player2.choice} de ${player2.name}`, opponentChoice: player2.choice, score: player1.score };
    result2 = { message: `Você venceu! ${player2.choice} derrotou ${player1.choice} de ${player1.name}`, opponentChoice: player1.choice, score: player2.score };
  }

  // check for a match winner after updating scores
  if (player1.score.wins >= room.winCondition) {
    matchWinner = player1.name;
  } else if (player2.score.wins >= room.winCondition) {
    matchWinner = player2.name;
  }
  
  // send result information to players
  io.to(player1Id).emit('gameResult', result1);
  io.to(player2Id).emit('gameResult', result2);
  console.log(`Room ${roomId} round result sent.`);

  if (matchWinner) {
    io.to(roomId).emit('matchOver', { winnerName: matchWinner });
    console.log(`Match over in room ${roomId}. Winner: ${matchWinner}`);
    
    delete rooms[roomId];       // clean room
  } else {
    player1.choice = null;      // reset
    player2.choice = null;
  }
}

// handleTimeout
function handleTimeout(roomId, winnerId) {
  if (activeTimers[winnerId]) {
    delete activeTimers[winnerId];
  }
  
  const room = rooms[roomId];
  if (!room) return;

  const loserId = Object.keys(room.players).find(id => id !== winnerId);
  if (!loserId) return;

  const winner = room.players[winnerId];
  const loser = room.players[loserId];

  winner.score.wins++;
  loser.score.losses++;


  const winnerResult = {
    message: `Você venceu! ${loser.name} ficou sem tempo`,
    opponentChoice: 'None',
    score: winner.score
  };
  const loserResult = {
    message: `Você perdeu! Você ficou sem tempo`,
    opponentChoice: winner.choice,
    score: loser.score
  };

  io.to(winnerId).emit('gameResult', winnerResult);
  io.to(loserId).emit('gameResult', loserResult);
  console.log(`Room ${roomId}: ${loser.name} timed out`);


  let matchWinner = null;
  if (winner.score.wins >= room.winCondition) {
    matchWinner = winner.name;
  }

  if (matchWinner) {
    io.to(roomId).emit('matchOver', { winnerName: matchWinner });
    
    delete rooms[roomId];
  } else {
    winner.choice = null;
    loser.choice = null;
  }
}




server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});