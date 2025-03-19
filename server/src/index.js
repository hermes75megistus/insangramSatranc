const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Basic route for health check
app.get('/', (req, res) => {
  res.send('Insangram Satranç API is running');
});

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Game queue and active games storage
const gameQueue = [];
const activeGames = new Map();

// Helper function to create a new game instance
const createGame = (players, timeControl, increment) => {
  const gameId = uuidv4();
  const chess = new Chess();
  
  const game = {
    id: gameId,
    players: {
      white: players[0],
      black: players[1]
    },
    chess: chess,
    settings: {
      timeControl: timeControl * 60 * 1000, // Convert minutes to milliseconds
      increment: increment * 1000 // Convert seconds to milliseconds
    },
    state: {
      status: 'playing',
      fen: chess.fen(),
      whiteTime: timeControl * 60 * 1000,
      blackTime: timeControl * 60 * 1000,
      lastMoveTime: Date.now(),
      turn: 'w',
      moveHistory: []
    }
  };
  
  activeGames.set(gameId, game);
  return game;
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Handle find game request
  socket.on('find_game', (data) => {
    const { timeControl = 10, increment = 0 } = data;
    
    // Add player to queue
    const playerInfo = {
      id: socket.id,
      timeControl,
      increment,
      joinTime: Date.now()
    };
    
    // Check if there's someone waiting with similar time control
    const opponentIndex = gameQueue.findIndex(player => 
      player.timeControl === timeControl && 
      player.increment === increment
    );
    
    if (opponentIndex !== -1) {
      // Found a suitable opponent, create a new game
      const opponent = gameQueue.splice(opponentIndex, 1)[0];
      
      // Randomly assign colors
      const players = Math.random() > 0.5 
        ? [opponent.id, socket.id] 
        : [socket.id, opponent.id];
      
      const game = createGame(players, timeControl, increment);
      
      // Notify both players
      io.to(game.players.white).emit('game_found', game.id);
      io.to(game.players.black).emit('game_found', game.id);
      
      console.log(`Game created: ${game.id} between ${game.players.white} and ${game.players.black}`);
    } else {
      // No suitable opponent, add to queue
      gameQueue.push(playerInfo);
      console.log(`Player ${socket.id} added to queue. Queue size: ${gameQueue.length}`);
    }
  });
  
  // Handle cancel search request
  socket.on('cancel_search', () => {
    const playerIndex = gameQueue.findIndex(player => player.id === socket.id);
    
    if (playerIndex !== -1) {
      gameQueue.splice(playerIndex, 1);
      console.log(`Player ${socket.id} removed from queue. Queue size: ${gameQueue.length}`);
    }
  });
  
  // Handle join game request
  socket.on('join_game', (data) => {
    const { gameId } = data;
    const game = activeGames.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Determine player's color
    let playerColor = null;
    
    if (game.players.white === socket.id) {
      playerColor = 'white';
    } else if (game.players.black === socket.id) {
      playerColor = 'black';
    } else {
      // Spectator mode (not implemented in this version)
      socket.emit('error', { message: 'You are not a player in this game' });
      return;
    }
    
    // Join the game room
    socket.join(gameId);
    
    // Send game state to the player
    socket.emit('game_joined', {
      color: playerColor,
      status: game.state.status,
      fen: game.state.fen,
      whiteTime: game.state.whiteTime,
      blackTime: game.state.blackTime,
      turn: game.state.turn
    });
    
    // Update all players in the room with the current game state
    io.to(gameId).emit('game_state', {
      status: game.state.status,
      fen: game.state.fen,
      whiteTime: game.state.whiteTime,
      blackTime: game.state.blackTime,
      turn: game.state.turn,
      moveHistory: game.state.moveHistory
    });
  });
  
  // Handle make move request
  socket.on('make_move', (data) => {
    const { gameId, move, fen } = data;
    const game = activeGames.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Validate that it's the player's turn
    const isWhiteMove = game.state.turn === 'w';
    const isPlayersTurn = 
      (isWhiteMove && game.players.white === socket.id) || 
      (!isWhiteMove && game.players.black === socket.id);
    
    if (!isPlayersTurn) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    try {
      // Verify the move is legal
      const moveResult = game.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q'
      });
      
      if (!moveResult) {
        socket.emit('error', { message: 'Invalid move' });
        return;
      }
      
      // Update game state
      const now = Date.now();
      const timeElapsed = now - game.state.lastMoveTime;
      
      // Update time
      if (isWhiteMove) {
        game.state.whiteTime = Math.max(0, game.state.whiteTime - timeElapsed);
        game.state.whiteTime += game.settings.increment; // Add increment
      } else {
        game.state.blackTime = Math.max(0, game.state.blackTime - timeElapsed);
        game.state.blackTime += game.settings.increment; // Add increment
      }
      
      game.state.lastMoveTime = now;
      game.state.fen = game.chess.fen();
      game.state.turn = game.chess.turn();
      game.state.moveHistory.push(moveResult);
      
      // Check for game over conditions
      if (game.chess.isCheckmate()) {
        game.state.status = 'ended';
        game.state.result = isWhiteMove ? 'White wins' : 'Black wins';
      } else if (game.chess.isDraw()) {
        game.state.status = 'ended';
        game.state.result = 'Draw';
      } else if (game.state.whiteTime <= 0) {
        game.state.status = 'ended';
        game.state.result = 'Black wins on time';
      } else if (game.state.blackTime <= 0) {
        game.state.status = 'ended';
        game.state.result = 'White wins on time';
      }
      
      // Broadcast the move to all players in the room
      io.to(gameId).emit('move_made', {
        fen: game.state.fen,
        move: moveResult
      });
      
      // If the game is over, notify all players
      if (game.state.status === 'ended') {
        io.to(gameId).emit('game_over', {
          result: game.state.result
        });
      }
    } catch (error) {
      console.error('Error processing move:', error);
      socket.emit('error', { message: 'Error processing move' });
    }
  });
  
  // Handle resign request
  socket.on('resign', (data) => {
    const { gameId } = data;
    const game = activeGames.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (game.state.status !== 'playing') {
      socket.emit('error', { message: 'Game is not in progress' });
      return;
    }
    
    // Determine who resigned
    let result;
    if (game.players.white === socket.id) {
      result = 'Black wins by resignation';
    } else if (game.players.black === socket.id) {
      result = 'White wins by resignation';
    } else {
      socket.emit('error', { message: 'You are not a player in this game' });
      return;
    }
    
    // Update game state
    game.state.status = 'ended';
    game.state.result = result;
    
    // Notify all players
    io.to(gameId).emit('game_over', {
      result: game.state.result
    });
  });
  
  // Handle offer draw request
  socket.on('offer_draw', (data) => {
    const { gameId } = data;
    const game = activeGames.get(gameId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    if (game.state.status !== 'playing') {
      socket.emit('error', { message: 'Game is not in progress' });
      return;
    }
    
    // Determine who offered the draw
    let offeringPlayer, receivingPlayer;
    if (game.players.white === socket.id) {
      offeringPlayer = 'white';
      receivingPlayer = game.players.black;
    } else if (game.players.black === socket.id) {
      offeringPlayer = 'black';
      receivingPlayer = game.players.white;
    } else {
      socket.emit('error', { message: 'You are not a player in this game' });
      return;
    }
    
    // Send draw offer to opponent
    io.to(receivingPlayer).emit('draw_offered', {
      by: offeringPlayer
    });
    
    // Also send a system message in chat
    io.to(gameId).emit('chat_message', {
      sender: 'system',
      text: `${offeringPlayer === 'white' ? 'White' : 'Black'} offered a draw`,
      time: new Date().toLocaleTimeString()
    });
  });
  
  // Handle accept draw request
  socket.on('accept_draw', (data) => {
    const { gameId } = data;
    const game = activeGames.get(gameId);
    
    if (!game || game.state.status !== 'playing') {
      return;
    }
    
    // Update game state
    game.state.status = 'ended';
    game.state.result = 'Draw by agreement';
    
    // Notify all players
    io.to(gameId).emit('game_over', {
      result: game.state.result
    });
  });
  
  // Handle chat message
  socket.on('send_message', (data) => {
    const { gameId, message } = data;
    const game = activeGames.get(gameId);
    
    if (!game) {
      return;
    }
    
    // Determine sender
    let sender;
    if (game.players.white === socket.id) {
      sender = 'white';
    } else if (game.players.black === socket.id) {
      sender = 'black';
    } else {
      return; // Not a player in the game
    }
    
    // Send the message to all players
    io.to(gameId).emit('chat_message', {
      sender: sender === 'white' ? 'white' : 'black',
      text: message,
      time: new Date().toLocaleTimeString()
    });
    
    // Also send the message to the sender differently so they can display it as "me"
    socket.emit('chat_message', {
      sender: 'me',
      text: message,
      time: new Date().toLocaleTimeString()
    });
  });
  
  // Handle leave game
  socket.on('leave_game', (data) => {
    const { gameId } = data;
    socket.leave(gameId);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove from queue if present
    const queueIndex = gameQueue.findIndex(player => player.id === socket.id);
    if (queueIndex !== -1) {
      gameQueue.splice(queueIndex, 1);
    }
    
    // Check active games and handle resignation
    for (const [gameId, game] of activeGames.entries()) {
      if (game.players.white === socket.id || game.players.black === socket.id) {
        if (game.state.status === 'playing') {
          // If the game is still in progress, handle as resignation
          game.state.status = 'ended';
          game.state.result = game.players.white === socket.id 
            ? 'Black wins by disconnection' 
            : 'White wins by disconnection';
          
          // Notify remaining player
          io.to(gameId).emit('game_over', {
            result: game.state.result
          });
          
          // Add system message
          io.to(gameId).emit('chat_message', {
            sender: 'system',
            text: `${game.players.white === socket.id ? 'White' : 'Black'} disconnected`,
            time: new Date().toLocaleTimeString()
          });
        }
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
