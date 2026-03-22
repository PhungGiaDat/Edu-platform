// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './styles/global.css'
import './index.css'
// Configure axios interceptors for automatic JWT token injection
import './services/axiosConfig'

// NOTE: StrictMode temporarily disabled to debug AR camera issues
// It causes double-mount which disrupts iframe camera initialization
// TODO: Re-enable after AR is stable
createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
  // </StrictMode>,
)
