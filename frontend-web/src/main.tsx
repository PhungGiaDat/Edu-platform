import * as Sentry from "@sentry/react";
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LocaleProvider } from './contexts/LocaleContext'
import { SessionProvider } from './context/SessionContext'
import App from './App'
import './styles/global.css'
import './index.css'
import './services/axiosConfig'
import { registerAssetRecovery } from './runtime/assetRecovery'

registerAssetRecovery()

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});

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
