const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3000;

app.use(express.static(__dirname));


io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server is runnign at http://localhost:${port}`);
});