import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Safari IndexedDB lazy loading fix - access early to trigger initialization
if (window.indexedDB) {
  console.log('IndexedDB available')
} else {
  console.warn('IndexedDB not available - using fallback storage')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
