
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Shim básico para process.env para evitar erros de 'process is not defined'
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
