import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initRippleEffect } from './lib/ripple'

// Initialize interactive button feedback (ripple wave & custom cursors)
initRippleEffect();

// Polyfill for crypto.randomUUID for non-secure contexts (e.g. Home Assistant over HTTP)
if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  Object.defineProperty(window.crypto, 'randomUUID', {
    value: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
