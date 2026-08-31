import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { SessionProvider } from './contexts/SessionContext';
import App from './App';
import './styles/global.css';
import './index.css';
import './services/axiosConfig';
import { registerAssetRecovery } from './runtime/assetRecovery';
import { sentryMonitoringService } from './services/sentryMonitoringService';

declare global {
  interface Window {
    ARControlTrace?: (label: string, details?: Record<string, unknown>) => void;
  }
}

function arTrace(label: string, details: Record<string, unknown> = {}): void {
  window.ARControlTrace?.(label, details);
}

arTrace('MAIN_MODULE_ENTER');

arTrace('ASSET_RECOVERY_REGISTER_BEGIN');
registerAssetRecovery();
arTrace('ASSET_RECOVERY_REGISTER_END');

arTrace('SENTRY_INITIALIZE_BEGIN');
sentryMonitoringService.initialize();
arTrace('SENTRY_INITIALIZE_END');

arTrace('PWA_REGISTER_BEGIN');
function registerProgressiveWebApp(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  arTrace('SW_REGISTER_ATTEMPT', { scope: '/' });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        arTrace('SW_REGISTER_SUCCESS', {
          scope: reg.scope,
          active: reg.active?.scriptURL ?? null,
          waiting: reg.waiting?.scriptURL ?? null,
          installing: reg.installing?.scriptURL ?? null,
        });
      })
      .catch((error) => {
        arTrace('SW_REGISTER_ERROR', { error: String(error) });
      });
  }, { once: true });
}
registerProgressiveWebApp();
arTrace('PWA_REGISTER_END');

arTrace('REACT_CREATE_ROOT_BEGIN');
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <LocaleProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </LocaleProvider>
    </AuthProvider>
  </BrowserRouter>,
);
arTrace('REACT_CREATE_ROOT_END');
