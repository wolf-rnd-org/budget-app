import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredFeatures?: string[];
}

export function ProtectedRoute({ children, requiredFeatures = [] }: ProtectedRouteProps) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check required features
  if (requiredFeatures.length > 0) {
    const hasRequiredFeatures = requiredFeatures.every(feature =>  
      user.actions.includes(feature)
    );
    
    if (!hasRequiredFeatures) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">אין הרשאה</h2>
            <p className="text-gray-600 mb-6">
              אין לך הרשאה לגשת לעמוד זה. אנא פנה למנהל המערכת.
            </p>
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

  return <>{children}</>;
}