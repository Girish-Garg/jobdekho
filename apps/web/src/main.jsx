import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installDither } from './lib/dither.js';
import { applyEffects } from './lib/effects.js';
import { installReveal } from './lib/reveal.js';
import './index.css';
import './canvas.css';
import './range.css';

// The effects level goes on <html> before anything draws (see lib/effects.js).
applyEffects();
installDither();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

installReveal();
