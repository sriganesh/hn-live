import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './layouts/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
