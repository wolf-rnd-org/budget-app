import React from 'react';
import { UserPlus, Mail, User, Shield, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { authApi, programsApi, isMockMode } from '@/api/http';
import { useAuthStore } from '@/stores/authStore';
import { ProjectAssignmentDropdown, type Project } from '@/components/shared';
import { ROLES, getRoleDisplayName } from '@/constants/roles';

export function AddUserSection() {
  const { user } = useAuthStore();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState('');
  const [selectedPrograms, setSelectedPrograms] = React.useState<string[]>([]);
  const [programs, setPrograms] = React.useState<Project[]>([]);
  const [programsLoading, setProgramsLoading] = React.useState(false);
  const [generatedPassword, setGeneratedPassword] = React.useState('');
  const [newUserId, setNewUserId] = React.useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  // Generate a strong password containing upper/lowercase, digits, and symbols
  const generatePassword = (length: number = 10) => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*()?';
    const all = upper + lower + digits + symbols;

    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
    // Ensure at least one of each required type
    let pwd = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    for (let i = pwd.length; i < length; i++) {
      pwd.push(pick(all));
    }
    // Shuffle
    for (let i = pwd.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
    }
    return pwd.join('');
  };

  // Load programs on component mount
  React.useEffect(() => {
    if (user?.userId) {
      loadPrograms();
    }
  }, [user?.userId]);

  const loadPrograms = async () => {
    if (!user?.userId) return;

    try {
      setProgramsLoading(true);
      
      if (isMockMode()) {
        // Mock programs data
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockPrograms: Project[] = [
          { id: '24640', name: 'תנועת בתיה תנועה בתנועה' },
          { id: '24864', name: 'פנאי למידה העשרה וחוויה תנועת בתיה' },
          { id: '7112', name: 'אהל אברהם לרעך כמוך' },
          { id: '111900', name: 'מכון בית יעקב - יום עיון מורות' },
          { id: 'general', name: 'כללי' },
          { id: '12345', name: 'מחנה קיץ 2024' },
          { id: '12346', name: 'פעילות חורף' },
          { id: '12347', name: 'יום גיבוש מורות' },
        ];
        setPrograms(mockPrograms);
      } else {
        const response = await programsApi.get(`/${user.userId}`);
        setPrograms(response.data);
      }
    } catch (err) {
      console.error('Error loading programs:', err);
      setError('שגיאה בטעינת הפרויקטים');
    } finally {
      setProgramsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      setError('שם פרטי נדרש');
      return false;
    }
    if (!lastName.trim()) {
      setError('שם משפחה נדרש');
      return false;
    }
    if (!email.trim()) {
      setError('כתובת אימייל נדרשת');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('כתובת אימייל לא תקינה');
      return false;
    }
    if (!selectedRole) {
      setError('יש לבחור תפקיד');
      return false;
    }
    if (selectedPrograms.length === 0) {
      setError('יש לבחור לפחות פרויקט אחד');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Generate password before sending to server
      const password = generatePassword(10);
      setGeneratedPassword(password);

      const userData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        role_label: selectedRole,
        password,
        application_name: 'BUDGETS',
        
        // program_ids: selectedPrograms,
      };

      if (isMockMode()) {
        // Mock registration with server-generated password
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockResponse = {
          success: true,
          message: 'משתמש נוצר בהצלחה',
          userId: `user_${Date.now()}`,
          password, // Use the generated password
        };
        
        setNewUserId(mockResponse.userId);
        setGeneratedPassword(password);
        setShowPassword(true);
        setSuccess('משתמש נוצר בהצלחה! הסיסמה נוצרה על ידי המערכת.');
      } else {
        debugger
        const response = await authApi.post('/register', userData);
        // Assign the new user to all selected programs
        const createdUserId = response.data.user_id;
        debugger
        if (createdUserId && selectedPrograms.length > 0) {
          await programsApi.post(`/${createdUserId}/assign-user`, {
            program_ids: selectedPrograms,
          });
        }
        setNewUserId(createdUserId);
        
        setGeneratedPassword(password);
        setShowPassword(true);
        setSuccess('משתמש נוצר בהצלחה! הסיסמה נוצרה על ידי המערכת.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'שגיאה ביצירת המשתמש';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setSelectedRole('');
    setSelectedPrograms([]);
    setGeneratedPassword('');
    setNewUserId(null);
    setShowPassword(false);
    setPasswordCopied(false);
    setError(null);
    setSuccess(null);
  };

  const handleProgramAdd = (programId: string) => {
    setSelectedPrograms(prev => [...prev, programId]);
  };

  const handleProgramRemove = (programId: string) => {
    setSelectedPrograms(prev => prev.filter(id => id !== programId));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">הוספת משתמש חדש</h2>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Form Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם פרטי *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setError(null);
                  }}
                  className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="שם פרטי"
                  required
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם משפחה *
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setError(null);
                  }}
                  className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="שם משפחה"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                כתובת אימייל *
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תפקיד *
              </label>
              <div className="relative">
                <Shield className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setError(null);
                  }}
                  className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white appearance-none"
                  required
                >
                  <option value="">בחר תפקיד</option>
                  {ROLES.filter(role => role.id !== 'assistant').map((role) => (
                    <option key={role.id} value={role.englishLabel}>
                      {role.hebrewLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Project Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              שיוך פרויקטים * 
            </label>
            {programsLoading ? (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600 text-sm">טוען פרויקטים...</p>
              </div>
            ) : (
              <ProjectAssignmentDropdown
                projects={programs}
                selectedProjectIds={selectedPrograms}
                onProjectToggle={handleProgramAdd}
                onProjectRemove={handleProgramRemove}
                disabled={loading}
                placeholder="בחר פרויקטים"
                className="max-w-md"
              />
            )}
          </div>

          {/* Submit Button - Placed after project assignment */}
          <div className="flex justify-start">
            <button
              type="submit"
              disabled={loading || programsLoading || selectedPrograms.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  יוצר משתמש...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  צור משתמש
                </>
              )}
            </button>
          </div>
        </form>

        {/* Generated Password Display */}
        {showPassword && generatedPassword && (
          <div className="mt-6 bg-green-50 rounded-xl p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4">משתמש נוצר בהצלחה!</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-700">שם מלא:</span>
                  <span className="text-green-800 mr-2">{firstName} {lastName}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700">אימייל:</span>
                  <span className="text-green-800 mr-2">{email}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700">תפקיד:</span>
                  <span className="text-green-800 mr-2">
                    {getRoleDisplayName(selectedRole)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-green-700">מזהה משתמש:</span>
                  <span className="text-green-800 mr-2 font-mono">{newUserId}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-green-700 mb-2">
                  סיסמה שנוצרה על ידי המערכת:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={generatedPassword}
                    readOnly
                    className="flex-1 px-4 py-3 border border-green-300 rounded-lg bg-white font-mono text-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedPassword)}
                    className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      passwordCopied 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
                    {passwordCopied ? 'הועתק!' : 'העתק'}
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  שמור את הסיסמה במקום בטוח ושתף אותה עם המשתמש החדש
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={resetForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all"
                >
                  הוסף משתמש נוסף
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && !showPassword && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}
