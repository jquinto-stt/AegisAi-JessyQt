import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppMetaProvider } from '@/shell/meta';
import App from './App.tsx';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppMetaProvider>
      <App />
    </AppMetaProvider>
  </StrictMode>
);
