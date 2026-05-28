import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { warmupServices } from './api/warmup'

// Kick off cold-start warm-up as early as possible, before React even mounts.
warmupServices()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
