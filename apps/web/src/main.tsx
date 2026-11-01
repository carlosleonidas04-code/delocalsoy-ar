import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './design/tokens.css';
import './styles.css';
import './platform/bootstrap';
import './offline/bootstrapOffline';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
