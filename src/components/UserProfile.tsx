import React from 'react';
import { User, ChevronDown, Users, Key } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { LogoutButton } from './LogoutButton';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useNavigate } from 'react-router-dom';

export function UserProfile() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);

  if (!user) return null;
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const handleChangePassword = () => {
    setIsOpen(false);
    setShowChangePassword(true);
  };

  const handleManageAssistants = () => {
    setIsOpen(false);
    navigate('/profile/assistants');
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 shadow-sm transition-all"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">{initials}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[240px]">
              {/* User Info Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">{initials}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={handleManageAssistants}
                  className="w-full text-right px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-3"
                >
                  <Users className="w-4 h-4" />
                  ניהול עוזרים
                </button>
                
                <button
                  onClick={handleChangePassword}
                  className="w-full text-right px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-3"
                >
                  <Key className="w-4 h-4" />
                  שינוי סיסמה
                </button>
                
                <LogoutButton variant="menu-item" />
              </div>
            </div>
          </>
        )}
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}