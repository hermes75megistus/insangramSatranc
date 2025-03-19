import React, { useState, useRef, useEffect } from 'react';

const Chat = ({ messages, sendMessage }) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      sendMessage(messageText);
      setMessageText('');
    }
  };

  return (
    <div className="chat-container">
      <h3>Sohbet</h3>
      <div className="messages-container">
        {messages.length === 0 ? (
          <p className="no-messages">Henüz mesaj yok. İlk mesajı gönder!</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender === 'me' ? 'my-message' : 'opponent-message'}`}>
              <div className="message-sender">{msg.sender === 'me' ? 'Sen' : 'Rakip'}</div>
              <div className="message-text">{msg.text}</div>
              <div className="message-time">{msg.time}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Mesajınızı yazın..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default Chat;
