const socket = io();

// UI elements
const mainMenu = document.querySelector('#main-menu');
const gameContainer = document.querySelector('#game-container');
const playerNameInput = document.querySelector('#playerNameInput');
const createRoomBtn = document.querySelector('#createRoomBtn');
const roomList = document.querySelector('#room-list');
const noRoomMsg = document.querySelector('#no-rooms-msg');



// EVENT LISTENERS
createRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    alert('Por favor insira um nome');
    return;
  }
  
  socket.emit('createRoom', { playerName });
});



// SOCKET LISTENERS
socket.on('roomListUpdate', (rooms) => {
  updateRoomList(rooms);
});

socket.on('joinRoomError', (data) => {      // if entering the room fails
  alert(data.message);
});

socket.on('lobbyUpdate', (data) => {
  renderLobby(data);
});

socket.on('roomClosed', () => {
  alert('O host fechou a sala');
  window.location.reload();
});


// HELPER FUNCTIONS (UTILS FUNCTIONS)
function updateRoomList(rooms) {
  roomList.innerHTML = '';

  if (rooms.length === 0) {
    noRoomMsg.style.display = 'block';
  } else {
    noRoomMsg.style.display = 'none';
    rooms.forEach(room => {
      const roomElement = document.createElement('a');
      roomElement.href = '#';
      roomElement.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center bg-dark text-light border-secondary';
      roomElement.innerHTML = `
        <span>${room.name}</span>
        <span class="badge bg-primary rounded-pill">${room.playerCount}/2</span>
      `;

      roomElement.onclick = () => joinRoom(room.id);
      roomList.appendChild(roomElement);
    });
  }
}

// joiningRoom FUNCTION
function joinRoom(roomId) {
  const playerName = playerNameInput.value.trim();

  if (!playerName) {
    alert('Por favor, insira um nome antes de entrar numa sala');
    return;
  }

  socket.emit('joinRoom', { roomId, playerName });
}

// renderLobby FUNCTION
function renderLobby(data) {
  const { room, players, isHost, myId } = data;
  const me = players.find(p => p.id === myId);
  const opponent = players.find(p => p.id !== myId);

  const hostControls = isHost ? `
    <div class="card bg-dark border-secondary mt-4">
        <div class="card-header">Host Configs.</div>
        <div class="card-body text-start">
            <div class="input-group mb-3">
                <span class="input-group-text">Nome da Sala</span>
                <input type="text" id="roomNameInput" class="form-control bg-dark text-light" value="${room.name}">
            </div>
            
            <div class="input-group mb-3">
                <select class="form-select bg-dark text-light" id="gameModeSelect">
                    <option value="infinite" ${room.settings.mode === 'infinite' ? 'selected' : ''}>Modo Infinito</option>
                    <option value="bo3" ${room.settings.mode === 'bo3' ? 'selected' : ''}>Melhor de 3</option>
                    <option value="bo5" ${room.settings.mode === 'bo5' ? 'selected' : ''}>melhor de 5</option>
                </select>
                <select class="form-select bg-dark text-light" id="timerSelect">
                    <option value="5" ${room.settings.timer === 5 ? 'selected' : ''}>5s Timer</option>
                    <option value="4" ${room.settings.timer === 4 ? 'selected' : ''}>4s Timer</option>
                    <option value="3" ${room.settings.timer === 3 ? 'selected' : ''}>3s Timer</option>
                    <option value="2" ${room.settings.timer === 2 ? 'selected' : ''}>2s Timer</option>
                    <option value="1" ${room.settings.timer === 1 ? 'selected' : ''}>1s Timer</option>
                </select>
            </div>

            <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" role="switch" id="passwordSwitch" ${room.settings.hasPassword ? 'checked' : ''}>
                <label class="form-check-label" for="passwordSwitch">Requerir Senha</label>
            </div>

            ${room.settings.hasPassword ? `
            <div class="input-group mb-3">
                <span class="input-group-text">Senha</span>
                <input type="text" class="form-control bg-dark text-light" value="${room.settings.password}" readonly>
                <button class="btn btn-outline-secondary" id="newPasswordBtn">Nova</button>
            </div>
            ` : ''}
            
            <button id="updateSettingsBtn" class="btn btn-info">Atualizar Configs.</button>
            <button id="deleteRoomBtn" class="btn btn-danger float-end">Deletar Sala</button>
        </div>
    </div>
  ` : '';

  gameContainer.innerHTML = `
    <div class="container text-center">
        <h1 class="my-4">${room.name}</h1>
        <div class="row">
            <div class="col-md-5">
                <div class="card border-secondary bg-dark">
                    <div class="card-header fs-4">${me.name} ${isHost ? '(Host)' : ''}</div>
                    <div class="card-body">
                        <p class="fs-1 ${me.isReady ? 'text-success' : 'text-warning'}">
                            ${me.isReady ? 'Pronto' : 'Preparando'}
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-2 d-flex align-items-center justify-content-center display-4">VS</div>
            <div class="col-md-5">
                ${opponent ? `
                <div class="card border-secondary bg-dark">
                    <div class="card-header fs-4">${opponent.name}</div>
                    <div class="card-body">
                        <p class="fs-1 ${opponent.isReady ? 'text-success' : 'text-warning'}">
                            ${opponent.isReady ? 'Pronto' : 'Preparando'}
                        </p>
                        ${isHost ? `<button id="kickPlayerBtn" class="btn btn-sm btn-outline-danger mt-2">Expulsar Player</button>` : ''}
                    </div>
                </div>
                ` : `
                <div class="card border-secondary bg-dark">
                    <div class="card-header fs-4">Aguardando...</div>
                    <div class="card-body">
                        <p class="fs-1 text-muted">Aguardando adversário...</p>
                    </div>
                </div>
                `}
            </div>
        </div>
        
        <button id="readyBtn" class="btn ${me.isReady ? 'btn-warning' : 'btn-success'} btn-lg my-4">
            ${me.isReady ? 'Cancelar' : 'Ready Up'}
        </button>

        ${hostControls}
    </div>
  `;

  document.getElementById('readyBtn').addEventListener('click', () => {
    socket.emit('playerToggleReady');
  });

  if (isHost) {
    document.getElementById('deleteRoomBtn').addEventListener('click', () => {
      if (confirm('Tem certeza que deseja deletar sua sala?')); {
        socket.emit('deleteRoom');
        window.location.reload();
      }
    });

    document.getElementById('updateSettingsBtn').addEventListener('click', () => {
      const newSettings = {
        name: document.getElementById('roomNameInput').value,
        mode: document.getElementById('gameModeSelect').value,
        timer: parseInt(document.getElementById('timerSelect').value, 10),
        hasPassword: document.getElementById('passwordSwitch').checked
      };
    });

    if (room.settings.hasPassword) {
      document.getElementById('newPasswordBtn').addEventListener('click', () => {
        socket.emit('generatePassword');
      });
    }

    if (opponent) {
      document.getElementById('kickPlayerBtn').addEventListener('click', () => {
        if (confirm(`Tem certeza que deseja expulsar ${opponent.name}?`)) {
          socket.emit('kickPlayer', { playerId: opponent.id });
        }
      });
    }
  }
}