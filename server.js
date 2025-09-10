const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { clearTimeout } = require('timers');
const { match } = require('assert');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));    // pointing to 'public/' folder



let rooms = {};
let activeTimers = {};

const generatePassword = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

const broadcastRoomList = () => {               // function to sends the updated room list to all players
  const publicRooms = Object.values(rooms)
    .filter(room => !room.settings.hasPassword && room.state === 'waiting' && Object.keys(room.players).length < 2)
    .map(room => ({
      id: room.id,
      name: room.name,
      playerCount: Object.keys(room.players).length
    }));
  
  io.emit('roomListUpdate', publicRooms);
};

const broadcastLobbyUpdate = (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  Object.keys(room.players).forEach(playerId => {
    const isHost = room.host.id === playerId;
    io.to(playerId).emit('lobbyUpdate', {
      room: { name: room.name, settings: room.settings },
      players: Object.entries(room.players).map(([id, player]) => ({...player, id})),
      isHost: isHost,
      myId: playerId
    });
  });
};




// MAIN CONNECTION
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  broadcastRoomList(); // sent current list of rooms

  socket.on('createRoom', (data) => {                   // listener for the player creating a room
    const { playerName } = data;
    const roomId = `room_${socket.id}`;

    rooms[roomId] = {
      id: roomId,
      name: `${playerName}'s Room`,
      host: {
        id: socket.id,
        name: playerName
      },
      players: {
        [socket.id]: {
          name: playerName,
          isReady: false
        }
      },
      settings: {
        mode: 'infinite',
        timer: 5,
        hasPassword: false,
        password: null
      },
      state: 'waiting'
    };


    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`Player ${playerName} created and joined room ${roomId}`);

    broadcastLobbyUpdate(roomId);   // send the host to the "lobby" view

    broadcastRoomList();
  });

  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    const room = rooms[roomId];

    if (!room) return socket.emit('joinRoomError', { message: 'Sala não existe' });
    if (Object.keys(room.players).length >= 2) return socket.emit('joinRoomError', { message: 'Sala cheia' });

    socket.join(roomId);
    socket.roomId = roomId;
    room.players[socket.id] = {
      name: playerName,
      isReady: false,
      score: {
        wins: 0,
        losses: 0,
        ties: 0
      }
    };

    console.log(`Player ${playerName} (${socket.id}) joined room ${roomId}`);

    broadcastRoomList();

    broadcastLobbyUpdate(roomId);
  });

  socket.on('playerToggleReady', () => {
    const roomId = socket.roomId;
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      const player = room.players[socket.id];
      player.isReady = !player.isReady;

      const players = Object.values(room.players);    // check if game can start
      if (players.length === 2 && players.every(p => p.isReady)) {
        console.log(`Game starting in room ${roomId}`);
        room.state = 'playing';
        broadcastRoomList();        // room no longer public
        //io.to(roomId).emit('gameStarting');
        io.to(roomId).emit('navigateToGame', {           // tell players the game is starting
          players,
          settings: room.settings
        });
      
      } else {
        broadcastLobbyUpdate(roomId);
      }
    }
  });

  socket.on('playerChoice', (choice) => {
    const roomId = socket.roomId;
    const room = rooms[roomId];
    if (!room || !room.players[socket.id] || room.players[socket.id].choice) return;

    room.players[socket.id].choice = choice;
    console.log(`Player ${room.players[socket.id].name} in room ${roomId} chose ${choice}`);

    const playersWithChoice = Object.values(room.players).filter(p => p.choice !== null);
    const opponent = Object.entries(room.players).find(([id, player]) => id !== socket.id);

    if (playersWithChoice.length === 1) {
      if (opponent) {
        io.to(opponent[0]).emit('opponentHasChosen');
      }

      activeTimers[socket.id] = setTimeout(() => {
        handleTimeout(roomId, socket.id);
      }, room.settings.timer * 1000);       // use the timer from host room settings

    } else if (playersWithChoice.length === 2) {
      if (opponent && activeTimers[opponent[0]]) {
        clearTimeout(activeTimers[opponent[0]]);
        
        delete activeTimers[opponent[0]];
      }
      determineWinner(roomId);
    }
  });
  
  socket.on('updateSettings', (newSettings) => {      // listen for host updating room properties settings
    const roomId = socket.roomId;
    const room = rooms[roomId];
    if (room && room.host.id === socket.id) {
      room.name = newSettings.name.substring(0, 20);    // safety trim
      room.settings.mode = newSettings.mode;
      room.settings.timer = newSettings.timer;

      // the handler of password enable/disable
      if (newSettings.hasPassword && !room.settings.hasPassword) {
        room.settings.password = generatePassword();
      } else if (!newSettings.hasPassword) {
        room.settings.password = null;
      }
      room.settings.hasPassword = newSettings.hasPassword;

      broadcastLobbyUpdate(roomId);
      broadcastRoomList();            // update public list in case name/password changed
    }
  });

  socket.on('generatePassword', () => {
    const roomId = socket.roomId;
    const room = rooms[roomId];
    if (room && room.host.id === socket.id && room.settings.hasPassword) {
      room.settings.password = generatePassword();
      broadcastLobbyUpdate(roomId);
    }
  });

  socket.on('kickPlayer', (data) => {
    const roomId = socket.roomId;
    const room = rooms[roomId];
    if (room && room.host.id === socket.id) {
      const kickedPlayerSocket = io.sockets.sockets.get(data.playerId);

      if (kickedPlayerSocket) {
        kickedPlayerSocket.emit('kicked');
        kickedPlayerSocket.leave(roomId);
      }

      delete room.players[data.playerId];
      broadcastLobbyUpdate(roomId);
      broadcastRoomList();
    }
  });

  socket.on('deleteRoom', () => {
    const roomId = socket.roomId;
    if (rooms[roomId] && rooms[roomId].host.id === socket.id) {
      io.to(roomId).emit('roomClosed');
      delete rooms[roomId];
      broadcastRoomList();
      console.log(`Room ${roomId} deleted by host`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
    

    if (activeTimers[socket.id]) {          // robust timer cleanup
      clearTimeout(activeTimers[socket.id]);
      
      delete activeTimers[socket.id];
      console.log(`Cleared timer for disconnected user ${socket.id}`);
    }

    
    const roomId = socket.roomId;

    if (roomId && rooms[roomId]) {
      const wasInLobby = roomId.state === 'waiting';

      delete rooms[roomId].players[socket.id];    // remove the player from the room
      console.log(`Player ${socket.id} removed from room ${roomId}`);

      if (Object.keys(rooms[roomId].players).length === 0) {    // if room empty, delete it
        delete rooms[roomId];
        console.log(`Room ${roomId} was empty and has been deleted`);

      } else {
        if (rooms[roomId].host.id === socket.id) {    // if host disconnects, other player mainting a host
          const newHostId = Object.keys(rooms[roomId].players)[0];
          rooms[roomId].host = {
            id: newHostId,
            name: rooms[roomId].players[newHostId].name
          };

          console.log(`New host for room ${roomId} is ${rooms[roomId].host.name}`);
        }

        if (wasInLobby) {
          broadcastLobbyUpdate(roomId);
        } else {
          io.to(roomId).emit('opponentDisconnected');   // notify remaining player
        }
      }
    }

    broadcastRoomList();    // update room list
  });
});



// FUNCTIONS
// --- determineWinner()
function determineWinner(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const playerIds = Object.keys(room.players);
  if (playerIds.length < 2) return;

  const player1Id = playerIds[0];
  const player2Id = playerIds[1];
  const player1 = room.players[player1Id];
  const player2 = room.players[player2Id];

  let result1, result2;
  let matchWinner = null;


  // main game logic
  if (player1.choice === player2.choice) {          // TIE
    player1.score.ties++;
    player2.score.ties++;

    const message = `Empate! Ambos escolheram ${player1.choice}`;

    result1 = {
      message: message,
      opponentChoice: player2.choice,
      score: player1.score
    };
    result2 = {
      message: message,
      opponentChoice: player1.choice,
      score: player2.score
    };

  } else if (
    (player1.choice === "Pedra" && player2.choice === "Tesoura") ||
    (player1.choice === "Tesoura" && player2.choice === "Papel") ||
    (player1.choice === "Papel" && player2.choice === "Pedra")
  ) {
    // PLAYER 1 WINS THE ROUND
    player1.score.wins++;
    player2.score.losses++;

    result1 = {
      message: `Venceu! ${player1.choice} derrotou ${player2.choice} de ${player2.name}`,
      opponentChoice: player2.choice,
      score: player1.score
    };
    result2 = {
      message: `Perdeu! ${player2.choice} foi derrotou por ${player1.choice} de ${player1.name}`,
      opponentChoice: player1.choice,
      score: player2.score
    };

  } else {
    // PLAYER 2 WINS THE ROUND
    player2.score.wins++;
    player1.score.losses++;

    result1 = {
      message: `Perdeu! ${player1.choice} foi derrotou por ${player2.choice} de ${player2.name}`,
      opponentChoice: player2.choice,
      score: player1.score
    };
    result2 = {
      message: `Venceu! ${player2.choice} derrotou ${player1.choice} de ${player1.name}`,
      opponentChoice: player1.choice,
      score: player2.score
    };
  }

  
  if (player1.score.wins >= room.winCondition) {
    matchWinner = player1.name;
  } else if (player2.score.wins >= room.winCondition) {
    matchWinner = player2.name;
  }

  io.to(player1Id).emit('gameResult', result1);
  io.to(player2Id).emit('gameResult', result2);
  console.log(`Room ${roomId} round result sent`);

  if (matchWinner) {
    io.to(roomId).emit('matchOver', { winnerName: matchWinner });
    console.log(`Match over in room ${roomId}. Winner: ${matchWinner}`);

    delete rooms[roomId];
  } else {
    player1.choice = null;
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
    message: `Venceu! ${loser.name} ficou sem tempo`,
    opponentChoice: 'None',
    score: winner.score
  };
  const loserResult = {
    message: `Perdeu! Você ficou sem tempo`,
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