// frontend-web/src/components/admin/AdminErrorBoundary.tsx
/**
 * Admin Error Boundary - Catches React errors in admin pages
 * Prevents entire admin dashboard from crashing
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sentryMonitoringService } from '@/services/sentryMonitoringService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const AdminErrorFallback: React.FC<{
  error: Error | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          {t('admin.errorBoundary.title', 'Something went wrong')}
        </h2>

        {/* Message */}
        <p className="text-gray-500 mb-6">
          {t('admin.errorBoundary.message', 'An error occurred while loading this page. Please try again.')}
        </p>

        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="text-left bg-gray-50 rounded-xl p-4 mb-4 overflow-auto max-h-32">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-6 py-2.5 rounded-xl bg-[#6EB9FF] text-white font-medium hover:bg-[#3A8FD1] transition-colors"
          >
            {t('admin.errorBoundary.tryAgain', 'Try Again')}
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            {t('admin.errorBoundary.goHome', 'Go to Dashboard')}
          </button>
        </div>
      </div>
    </div>
  );
};

class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    sentryMonitoringService.captureException(error, {
      feature: 'admin',
      component: 'AdminErrorBoundary',
      componentStack: errorInfo.componentStack,
    });
    console.error('[AdminErrorBoundary] Caught error:', error, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <AdminErrorFallback
          error={error}
          resetError={this.resetError}
        />
      );
    }

    return children;
  }
}

export default AdminErrorBoundary;
export { AdminErrorFallback };
