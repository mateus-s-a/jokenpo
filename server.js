const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { emit } = require('process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));    // pointing to 'public/' folder



let rooms = {};

const broadcastRoomList = () => {               // function to sends the updated room list to all players
  const publicRooms = Object.values(rooms)
    .filter(room => !room.settings.hasPassword && Object.keys(room.players).length < 2)
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
      myId, playerId
    });
  });
};

const generatePassword = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};



// MAIN CONNECTION
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  broadcastRoomList();; // sent current list of rooms

  socket.on('createRoom', (data) => {                   // listener for the player creating a room
    const { playerName } = data;
    const roomId = `room+${socket.id}`;

    rooms[roomId] = {
      id: roomId,
      name: `${playerName}'s Room`,
      host: { id: socket.id, name: playerName },
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
      state: 'waiting'        // will be 'waiting' or 'playing'
    };

    socket.join(roomId);
    console.log(`Player ${playerName} created and joined room ${roomId}`);

    broadcastLobbyUpdate(roomId);   // send the host to the "lobby" view

    broadcastRoomList();
  });

  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    const room = rooms[roomId];

    if (!room) {
      return socket.emit('joinRoomError', { message: 'Sala não existe' });
    }
    if (Object.keys(room.players).length >= 2) {
      return socket.emit('joinRoomError', { message: 'Sala cheia' });
    }

    socket.join(roomId);
    socket.roomId = roomId;
    room.players[socket.id] = {
      name: playerName,
      isReady: false
    };

    console.log(`Player ${playerName} (${socket.id}) joined room ${roomId}`);

    broadcastRoomList();

    const playerNames = Object.values(room.players).map(p => p.name);
    broadcastLobbyUpdate(roomId);
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
        io.to(roomId).emit('gameStarting');           // tell players the game is starting
      } else {
        broadcastLobbyUpdate(roomId);
      }
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`A user disconnected: ${socket.id}`);
    const roomId = socket.roomId;

    if (roomId && rooms[roomId]) {
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

        io.to(roomId).emit('opponentLeft');   // notify remaining player
      }
      broadcastLobbyUpdate(roomId);
    }

    broadcastRoomList();    // update room list
  });
});






server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});