import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/">
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
import './styles/zombie-theme.css';
import './styles/zombie-base.css';
import './styles/zombie-animations.css';
import './styles/zombie-effects.css';
import './styles/zombie-blood.css';
import './styles/zombie-blood.css';
import './styles/sidebar.css';

import './styles/command-center.css';
