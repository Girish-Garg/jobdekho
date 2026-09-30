import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installDither } from './lib/dither.js';
import './index.css';
import './canvas.css';
import './range.css';

installDither();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
