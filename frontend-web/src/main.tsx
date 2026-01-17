// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/global.css'
import './index.css'

// NOTE: StrictMode temporarily disabled to debug AR camera issues
// It causes double-mount which disrupts iframe camera initialization
// TODO: Re-enable after AR is stable
createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <BrowserRouter>
    <App />
  </BrowserRouter>
  // </StrictMode>,
)
