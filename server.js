const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3000;

app.use(express.static(__dirname));



let players = {};                                                 // Object to store player data and choices


io.on('connection', (socket) => {
  console.log(`A user connected with ID: ${socket.id}`);
  players[socket.id] = { choice: null };                          // add a new player to the list

  socket.on('playerChoice', (choice) => {                         // Listen for player's choice
    players[socket.id].choice = choice;
    console.log(`Player ${socket.id} chose ${choice}`);

    const activePlayers = Object.values(players);
    const playersWithChoices = activePlayers.filter(p => p.choice !== null);

    if (playersWithChoices.length === 2) {
      console.log('Both players have made a choice. Determining winner...');
      determineWinner();
    }

  });

  socket.on('disconnect', () => {
    console.log(`A user disconnected with ID: ${socket.id}`);
    delete players[socket.id];                                    // Remove player for the list
  });
});


function determineWinner() {
  const playerIds = Object.keys(players);
  const player1 = players[playerIds[0]];
  const player2 = players[playerIds[1]];
  let result;

  if (player1.choice === player2.choice) {
    result = "Empate";
  } else if (
    (player1.choice === "Pedra" && player2.choice === "Tesoura") ||
    (player1.choice === "Tesoura" && player2.choice === "Papel") ||
    (player1.choice === "Papel" && player2.choice === "Pedra")
  ) {
    result = `Player 1 (${player1.choice}) wins against Player 2 (${player2.choice})`;
  } else {
    result = `Player 2 (${player2.choice}) wins against Player 1 (${player1.choice})`;
  }

  // io.emit() sends a message to every single connected client
  io.emit('gameResult', result);                                // Send the result to both players
  console.log('Result send:', result);

  // reset for the next round
  player1.choice = null;
  player2.choice = null;
}





server.listen(port, () => {
  console.log(`Server is runnign at http://localhost:${port}`);
});