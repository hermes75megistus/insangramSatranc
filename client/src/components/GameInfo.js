import React from 'react';

const GameInfo = ({ status, result, moveHistory }) => {
  return (
    <div className="game-info">
      <h3>Oyun Bilgisi</h3>
      
      {status === 'waiting' && (
        <div className="waiting-message">Rakip bekleniyor...</div>
      )}
      
      {status === 'ended' && result && (
        <div className="game-result">
          <h4>Sonuç: {result}</h4>
        </div>
      )}
      
      <div className="move-history">
        <h4>Hamle Geçmişi</h4>
        {moveHistory.length === 0 ? (
          <p>Henüz hamle yapılmadı.</p>
        ) : (
          <div className="moves-list">
            {moveHistory.map((move, index) => (
              <div key={index} className="move-item">
                {index % 2 === 0 ? `${Math.floor(index/2) + 1}.` : ''} 
                {move.san || `${move.from}-${move.to}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameInfo;
