import * as Sentry from "@sentry/react";
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LocaleProvider } from './contexts/LocaleContext'
import App from './App'
import './styles/global.css'
import './index.css'
import './services/axiosConfig'

Sentry.init({
  dsn: "https://27d11c44af122c9cc417160c331241f2@o4511704263622656.ingest.de.sentry.io/4511704276009040",
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
        <App />
      </LocaleProvider>
    </AuthProvider>
  </BrowserRouter>
)
