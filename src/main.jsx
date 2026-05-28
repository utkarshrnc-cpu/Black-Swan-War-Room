import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Default theme — preserves the original War Room look.
// Toggle to 'sac-story' from the demo controls panel (Cmd+Shift+D).
document.documentElement.setAttribute('data-theme', 'war-room');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
