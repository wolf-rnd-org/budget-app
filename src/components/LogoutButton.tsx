import React from 'react';
import { LogOut, AlertCircle } from 'lucide-react';
import { logout } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

interface LogoutButtonProps {
  variant?: 'button' | 'menu-item';
  className?: string;
}

export function LogoutButton({ variant = 'button', className = '' }: LogoutButtonProps) {
  const { clearUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await logout();
      
      // Clear auth data
      clearUser();
      localStorage.removeItem('authToken');
      
      // Redirect to login
      navigate('/login');
    } catch (err) {
      setError('שגיאה בהתנתקות');
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'menu-item') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`w-full text-right px-4 py-3 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <LogOut className="w-4 h-4" />
        {loading ? 'מתנתק...' : 'התנתק'}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all ${className}`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            מתנתק...
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4" />
            התנתק
          </>
        )}
      </button>
      
      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}