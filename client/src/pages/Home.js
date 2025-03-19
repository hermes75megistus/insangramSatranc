import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import '../styles/Home.css';

const Home = () => {
  const [searching, setSearching] = useState(false);
  const [timeControl, setTimeControl] = useState('10');
  const [increment, setIncrement] = useState('0');
  const navigate = useNavigate();

  React.useEffect(() => {
    // Cleanup function for component unmount
    return () => {
      if (searching) {
        socket.emit('cancel_search');
      }
    };
  }, [searching]);

  React.useEffect(() => {
    const handleGameFound = (gameId) => {
      setSearching(false);
      navigate(`/game/${gameId}`);
    };

    socket.on('game_found', handleGameFound);

    return () => {
      socket.off('game_found', handleGameFound);
    };
  }, [navigate]);

  const handleQuickMatch = () => {
    setSearching(true);
    socket.emit('find_game', {
      timeControl: parseInt(timeControl),
      increment: parseInt(increment)
    });
  };

  return (
    <div className="home-container">
      <div className="game-modes">
        <div className="game-mode-card">
          <div className="game-mode-icon">👥</div>
          <h2>Hızlı Eşleşme</h2>
          <p>Benzer süre ayarlarına sahip rastgele bir rakiple hemen oyna.</p>
          <button 
            className={`start-btn ${searching ? 'searching' : ''}`}
            onClick={handleQuickMatch}
            disabled={searching}
          >
            {searching ? 'Eşleşme Aranıyor...' : 'Başlat'}
          </button>
        </div>
      </div>

      <div className="time-settings">
        <h3>Süre Ayarları</h3>
        <div className="time-settings-container">
          <div className="time-column">
            <h4>Süre</h4>
            <div className="time-buttons">
              <button 
                className={timeControl === '1' ? 'active' : ''} 
                onClick={() => setTimeControl('1')}
              >
                1 dk
              </button>
              <button 
                className={timeControl === '3' ? 'active' : ''} 
                onClick={() => setTimeControl('3')}
              >
                3 dk
              </button>
              <button 
                className={timeControl === '5' ? 'active' : ''} 
                onClick={() => setTimeControl('5')}
              >
                5 dk
              </button>
              <button 
                className={timeControl === '10' ? 'active' : ''} 
                onClick={() => setTimeControl('10')}
              >
                10 dk
              </button>
              <button 
                className={timeControl === '15' ? 'active' : ''} 
                onClick={() => setTimeControl('15')}
              >
                15 dk
              </button>
              <button 
                className={timeControl === '30' ? 'active' : ''} 
                onClick={() => setTimeControl('30')}
              >
                30 dk
              </button>
            </div>
          </div>

          <div className="increment-column">
            <h4>Artış</h4>
            <div className="increment-buttons">
              <button 
                className={increment === '0' ? 'active' : ''} 
                onClick={() => setIncrement('0')}
              >
                0 sn
              </button>
              <button 
                className={increment === '1' ? 'active' : ''} 
                onClick={() => setIncrement('1')}
              >
                1 sn
              </button>
              <button 
                className={increment === '2' ? 'active' : ''} 
                onClick={() => setIncrement('2')}
              >
                2 sn
              </button>
              <button 
                className={increment === '3' ? 'active' : ''} 
                onClick={() => setIncrement('3')}
              >
                3 sn
              </button>
              <button 
                className={increment === '5' ? 'active' : ''} 
                onClick={() => setIncrement('5')}
              >
                5 sn
              </button>
              <button 
                className={increment === '10' ? 'active' : ''} 
                onClick={() => setIncrement('10')}
              >
                10 sn
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="active-games">
        <h3>Aktif Odalar</h3>
        <p className="no-rooms">Şu anda bekleyen oda bulunmuyor.</p>
      </div>
    </div>
  );
};

export default Home;
