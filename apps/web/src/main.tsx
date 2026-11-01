import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './design/tokens.css';
import './styles.css';
import './platform/bootstrap';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// UX-003 (#226): bootstrap offline al final del modulo — el import vive en
// un chunk separado del bloque de imports para no colisionar con el hunk de
// #224 (UX-002, platform/bootstrap) en el 3-way merge de main.tsx. El orden
// de ejecucion se conserva: plataforma primero, offline despues.
import './offline/bootstrapOffline';
