import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './app/styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('应用根节点不存在');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
