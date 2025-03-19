import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/App.css';
import App from './App';

// Check if running in iframe
if (window.location !== window.parent.location) {
  // The page is in an iframe
  document.body.classList.add('in-iframe');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
