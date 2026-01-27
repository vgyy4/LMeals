import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initRippleEffect } from './lib/ripple'

// Initialize interactive button feedback (ripple wave & custom cursors)
initRippleEffect();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
