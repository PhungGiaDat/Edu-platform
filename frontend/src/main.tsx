import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LocaleProvider } from './contexts/LocaleContext'
import { SessionProvider } from './contexts/SessionContext'
import App from './App'
import './styles/global.css'
import './index.css'
import './services/axiosConfig'
import { registerAssetRecovery } from './runtime/assetRecovery'
import { sentryMonitoringService } from './services/sentryMonitoringService'

registerAssetRecovery()
sentryMonitoringService.initialize()

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <LocaleProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </LocaleProvider>
    </AuthProvider>
  </BrowserRouter>
);
