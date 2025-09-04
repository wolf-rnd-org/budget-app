import React from 'react';
import { Users, UserPlus, Shield, Building2, AlertCircle, CheckCircle, Mail, Key, Save } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi, programsApi } from '@/api/http';
import { AddUserSection } from './components/AddUserSection';
import { ProgramAssignmentSection } from './components/ProgramAssignmentSection';

export function UserManagementPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check permissions
  const userActions = user?.actions || [];
  const canUpdateUsers = userActions.includes('users.update');

  if (!canUpdateUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">אין הרשאה</h2>
          <p className="text-gray-600 mb-6">
            אין לך הרשאה לנהל משתמשים. אנא פנה למנהל המערכת.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all"
          >
            חזור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ניהול משתמשים</h1>
              <p className="text-gray-600">הוסף משתמשים חדשים ונהל הרשאות פרויקטים</p>
            </div>
          </div>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Section 1: Add New User */}
          <AddUserSection />

          {/* Section 2: Programs and Users */}
          <ProgramAssignmentSection />
        </div>
      </div>
    </div>
  );
}