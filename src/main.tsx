import '@fontsource/anton'
import '@fontsource-variable/manrope'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Check for a new version on launch and every 30 minutes; when one is installed the
// page reloads itself, so phones never keep showing an old cached design.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
