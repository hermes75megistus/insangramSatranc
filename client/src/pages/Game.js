import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { socket } from '../services/socket';
import Timer from '../components/Timer';
import GameInfo from '../components/GameInfo';
import Chat from '../components/Chat';
import '../styles/Game.css';

const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [orientation, setOrientation] = useState('white');
  const [playerColor, setPlayerColor] = useState(null);
  const [gameState, setGameState] = useState({
    status: 'waiting', // waiting, playing, ended
    whiteTime: 0,
    blackTime: 0,
    whiteName: 'Beyaz',
    blackName: 'Siyah',
    turn: 'w',
    result: null,
    moveHistory: []
  });
  const [chatMessages, setChatMessages] = useState([]);

  // Initialize game connection
  useEffect(() => {
    socket.emit('join_game', { gameId });

    socket.on('game_joined', (data) => {
      setPlayerColor(data.color);
      setOrientation(data.color);
      setGameState({
        ...gameState,
        status: data.status,
        whiteTime: data.whiteTime,
        blackTime: data.blackTime,
        turn: data.turn
      });
    });

    socket.on('game_state', (data) => {
      setGameState({
        ...gameState,
        status: data.status,
        whiteTime: data.whiteTime,
        blackTime: data.blackTime,
        turn: data.turn,
        moveHistory: data.moveHistory || []
      });

      if (data.fen) {
        const newGame = new Chess(data.fen);
        setGame(newGame);
      }
    });

    socket.on('move_made', (data) => {
      try {
        const newGame = new Chess(data.fen);
        setGame(newGame);
        setGameState({
          ...gameState,
          turn: newGame.turn(),
          moveHistory: [...gameState.moveHistory, data.move]
        });
      } catch (e) {
        console.error('Invalid FEN:', e);
      }
    });

    socket.on('game_over', (data) => {
      setGameState({
        ...gameState,
        status: 'ended',
        result: data.result
      });
    });

    socket.on('chat_message', (message) => {
      setChatMessages(prevMessages => [...prevMessages, message]);
    });

    // Clean up event listeners
    return () => {
      socket.off('game_joined');
      socket.off('game_state');
      socket.off('move_made');
      socket.off('game_over');
      socket.off('chat_message');
      socket.emit('leave_game', { gameId });
    };
  }, [gameId]);

  const onDrop = useCallback((sourceSquare, targetSquare) => {
    // Don't allow moves if not your turn or game is ended
    if (gameState.status !== 'playing' || game.turn() !== playerColor.charAt(0)) {
      return false;
    }

    try {
      // Make the move locally
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move === null) return false;

      // Send move to server
      socket.emit('make_move', {
        gameId,
        move: {
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        },
        fen: game.fen()
      });

      return true;
    } catch (e) {
      return false;
    }
  }, [game, gameState.status, gameId, playerColor]);

  const handleResign = () => {
    if (gameState.status === 'playing') {
      socket.emit('resign', { gameId });
    }
  };

  const handleDrawOffer = () => {
    if (gameState.status === 'playing') {
      socket.emit('offer_draw', { gameId });
    }
  };

  const sendChatMessage = (message) => {
    socket.emit('send_message', { gameId, message });
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Oda: {gameId}</h1>
        <div className="game-controls">
          <button onClick={() => navigate('/')} className="home-btn">Ana Sayfa</button>
        </div>
      </div>

      <div className="game-content">
        <div className="board-container">
          <div className="opponent-info">
            {orientation === 'white' ? (
              <div className="player-info black">
                <div className="player-name">{gameState.blackName}</div>
                <Timer time={gameState.blackTime} isRunning={gameState.status === 'playing' && gameState.turn === 'b'} />
              </div>
            ) : (
              <div className="player-info white">
                <div className="player-name">{gameState.whiteName}</div>
                <Timer time={gameState.whiteTime} isRunning={gameState.status === 'playing' && gameState.turn === 'w'} />
              </div>
            )}
          </div>

          <Chessboard 
            position={game.fen()}
            onPieceDrop={onDrop}
            boardOrientation={orientation}
            customBoardStyle={{
              borderRadius: '4px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
            }}
            customDarkSquareStyle={{ backgroundColor: '#769656' }}
            customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
          />

          <div className="player-info">
            {orientation === 'white' ? (
              <div className="player-info white">
                <div className="player-name">{gameState.whiteName}</div>
                <Timer time={gameState.whiteTime} isRunning={gameState.status === 'playing' && gameState.turn === 'w'} />
              </div>
            ) : (
              <div className="player-info black">
                <div className="player-name">{gameState.blackName}</div>
                <Timer time={gameState.blackTime} isRunning={gameState.status === 'playing' && gameState.turn === 'b'} />
              </div>
            )}
          </div>

          <div className="game-actions">
            <button onClick={handleResign} className="resign-btn">Teslim Ol</button>
            <button onClick={handleDrawOffer} className="draw-btn">Beraberlik Teklif Et</button>
          </div>
        </div>

        <div className="game-sidebar">
          <GameInfo 
            status={gameState.status}
            result={gameState.result}
            moveHistory={gameState.moveHistory}
          />
          <Chat messages={chatMessages} sendMessage={sendChatMessage} />
        </div>
      </div>
    </div>
  );
};

export default Game;
