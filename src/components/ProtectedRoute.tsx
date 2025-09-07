import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredFeatures?: string[];
}

export function ProtectedRoute({ children, requiredFeatures = [] }: ProtectedRouteProps) {
  const { user, hasHydrated, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const req = requiredFeatures.join(',');
  // Debug trace for diagnosing routing/permissions
  // eslint-disable-next-line no-console
  console.debug('[ProtectedRoute] enter', {
    pathname: location.pathname,
    hasHydrated,
    isLoading,
    isAuthed: !!user,
    actionsCount: user?.actions?.length ?? 0,
    required: req,
  });

  // While the store initializes, show a spinner
  if (!hasHydrated && isLoading) {
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] waiting for hydration');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] not authenticated, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Feature gate when required
  if (requiredFeatures.length > 0) {
    // If actions not loaded yet, wait instead of denying
    if (!user.actions || user.actions.length === 0) {
      // eslint-disable-next-line no-console
      console.debug('[ProtectedRoute] actions empty, waiting before checking features');
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען הרשאות...</p>
          </div>
        </div>
      );
    }
    const hasRequired = requiredFeatures.every((f) => user.actions?.includes(f));
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] feature check', { required: req, hasRequired, actions: user.actions });
    if (!hasRequired) {
      return (
        <div data-pr="protected-route-deny" className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">אין הרשאה</h2>
            <p className="text-gray-600 mb-6">אין לך הרשאה לגשת לעמוד זה. אנא פנה למנהל המערכת.</p>
            <button
              onClick={() => navigate('/expenses')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all"
            >
              חזור לעמוד הראשי
            </button>
          </div>
        </div>
      );
    }
  }

  // Default: render protected content
  // eslint-disable-next-line no-console
  console.debug('[ProtectedRoute] allowed; rendering children');
  return <>{children}</>;
}
