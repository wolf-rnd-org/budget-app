import React from 'react';
import { Building2, Users, Trash2, AlertCircle, CheckCircle, RefreshCw, Search, X, ChevronDown, Copy } from 'lucide-react';
import { authApi, programsApi, isMockMode } from '@/api/http';
import { useAuthStore } from '@/stores/authStore';
import { getRoleDisplayName } from '@/constants/roles';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  password?: string; // For displaying generated password
}

interface Program {
  id: string;
  name: string;
}

interface UserProgramAssignment {
  userId: string;
  programIds: string[];
}

export function ProgramAssignmentSection() {
  const { user } = useAuthStore();
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [assignments, setAssignments] = React.useState<UserProgramAssignment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingUsers, setSavingUsers] = React.useState<Set<string>>(new Set());
  const [deletingUsers, setDeletingUsers] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [userSuccessMessages, setUserSuccessMessages] = React.useState<Map<string, string>>(new Map());
  const [copiedPasswords, setCopiedPasswords] = React.useState<Set<string>>(new Set());
  
  // Search and dropdown states
  const [userSearch, setUserSearch] = React.useState('');
  const [openDropdowns, setOpenDropdowns] = React.useState<Set<string>>(new Set());
  const [programSearches, setProgramSearches] = React.useState<Map<string, string>>(new Map());

  // Fetch data on component mount
  React.useEffect(() => {
    fetchData();
  }, [user?.userId]);

  const fetchData = async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      setError(null);

      // if (isMockMode()) {
       if (false) {
        // Mock data with more programs to simulate large dataset
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockPrograms: Program[] = [
          { id: '24640', name: 'תנועת בתיה תנועה בתנועה' },
          { id: '24864', name: 'פנאי למידה העשרה וחוויה תנועת בתיה' },
          { id: '7112', name: 'אהל אברהם לרעך כמוך' },
          { id: '111900', name: 'מכון בית יעקב - יום עיון מורות' },
          { id: 'general', name: 'כללי' },
          { id: '12345', name: 'מחנה קיץ 2024' },
          { id: '12346', name: 'פעילות חורף' },
          { id: '12347', name: 'יום גיבוש מורות' },
          { id: '12348', name: 'סדנאות העשרה' },
          { id: '12349', name: 'טיולים וחוויות' },
          { id: '12350', name: 'פרויקט מיוחד א' },
          { id: '12351', name: 'פרויקט מיוחד ב' },
          { id: '12352', name: 'תוכנית השתלמות' },
          { id: '12353', name: 'מועדון נוער' },
          { id: '12354', name: 'פעילות קהילתית' },
        ];

        const mockUsers: User[] = [
          { id: '1', email: 'user1@example.com', firstName: 'שרה', lastName: 'כהן', role: 'regular_user', password: 'A3$45678' },
          { id: '2', email: 'user2@example.com', firstName: 'רחל', lastName: 'לוי', role: 'accountan', password: 'B9#12345' },
          { id: '3', email: 'user3@example.com', firstName: 'מרים', lastName: 'ישראל', role: 'admin', password: 'C7@98765' },
          { id: '4', email: 'user4@example.com', firstName: 'דינה', lastName: 'אברהם', role: 'regular_user', password: 'D2!56789' },
          { id: '5', email: 'user5@example.com', firstName: 'תמר', lastName: 'יוסף', role: 'accountan', password: 'E8%34567' },
        ];

        setPrograms(mockPrograms);
        setUsers(mockUsers);
        
        // Initialize assignments with some mock data
        const initialAssignments = mockUsers.map(user => ({
          userId: user.id,
          programIds: user.id === '1' ? ['24640', '7112'] : user.id === '2' ? ['24864', 'general'] : [],
        }));
        setAssignments(initialAssignments);
      } else {
        // Real API calls
        const [programsResponse, usersResponse] = await Promise.all([
          programsApi.get(`/`),
          authApi.get('/users'),
        ]);

        setPrograms(programsResponse.data);
        setUsers(usersResponse.data);
        
        // Initialize assignments
        const initialAssignments = usersResponse.data.map((user: User) => ({
          userId: user.id,
          programIds: [],
        }));
        setAssignments(initialAssignments);
      }
    } catch (err) {
      setError('שגיאה בטעינת הנתונים');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProgramToggle = async (userId: string, programId: string) => {
    const isAssigned = assignments.find(a => a.userId === userId)?.programIds.includes(programId);
    
    // Update UI optimistically
    setAssignments(prev => prev.map(assignment => {
      if (assignment.userId === userId) {
        return {
          ...assignment,
          programIds: isAssigned
            ? assignment.programIds.filter(id => id !== programId)
            : [...assignment.programIds, programId]
        };
      }
      return assignment;
    }));
    
    // Clear previous messages
    setUserSuccessMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
    setError(null);
    
    // Auto-save the change
    await handleSaveUserAssignments(userId, isAssigned ? 'removed' : 'added');
    
    // Close dropdown after selection
    setOpenDropdowns(prev => new Set());
  };

  const handleSaveUserAssignments = async (userId: string, action?: string) => {
    try {
      setSavingUsers(prev => new Set(prev).add(userId));
      setError(null);
      
      // Clear previous success message for this user
      setUserSuccessMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });

      const userAssignment = assignments.find(a => a.userId === userId);
      if (!userAssignment) return;

      if (isMockMode()) {
        // Mock save
        await new Promise(resolve => setTimeout(resolve, 500));
        const message = action === 'added' ? 'פרויקט נוסף בהצלחה!' : 
                       action === 'removed' ? 'פרויקט הוסר בהצלחה!' : 
                       'שיוכי הפרויקטים נשמרו בהצלחה!';
        setUserSuccessMessages(prev => new Map(prev).set(userId, message));
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setUserSuccessMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
        }, 3000);
      } else {
        // Real API call
        await authApi.post(`/user/${userId}/programs`, {
          programIds: userAssignment.programIds,
        });
        const message = action === 'added' ? 'פרויקט נוסף בהצלחה!' : 
                       action === 'removed' ? 'פרויקט הוסר בהצלחה!' : 
                       'שיוכי הפרויקטים נשמרו בהצלחה!';
        setUserSuccessMessages(prev => new Map(prev).set(userId, message));
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setUserSuccessMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
        }, 3000);
      }
    } catch (err) {
      setError(`שגיאה בשמירת השיוכים עבור משתמש ${userId}`);
      console.error('Error saving assignments:', err);
    } finally {
      setSavingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    const userName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.email || userId;
    
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${userName}?`)) {
      return;
    }

    try {
      setDeletingUsers(prev => new Set(prev).add(userId));
      setError(null);

      if (isMockMode()) {
        // Mock delete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Remove user from state
        setUsers(prev => prev.filter(u => u.id !== userId));
        setAssignments(prev => prev.filter(a => a.userId !== userId));
        setUserSuccessMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      } else {
        // Real API call
        await authApi.delete(`/user/${userId}`);
        
        // Remove user from state
        setUsers(prev => prev.filter(u => u.id !== userId));
        setAssignments(prev => prev.filter(a => a.userId !== userId));
        setUserSuccessMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      }
    } catch (err) {
      setError(`שגיאה במחיקת המשתמש ${userName}`);
      console.error('Error deleting user:', err);
    } finally {
      setDeletingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const copyToClipboard = async (text: string, userId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPasswords(prev => new Set(prev).add(userId));
      setTimeout(() => {
        setCopiedPasswords(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedPasswords(prev => new Set(prev).add(userId));
      setTimeout(() => {
        setCopiedPasswords(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 2000);
    }
  };

  const toggleDropdown = (userId: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const setProgramSearch = (userId: string, search: string) => {
    setProgramSearches(prev => new Map(prev).set(userId, search));
  };

  const getProgramSearch = (userId: string) => {
    return programSearches.get(userId) || '';
  };

  const getUserAssignment = (userId: string) => {
    return assignments.find(a => a.userId === userId) || { userId, programIds: [] };
  };

  const getAssignedProgramsForUser = (userId: string) => {
    const assignment = getUserAssignment(userId);
    return programs.filter(p => assignment.programIds.includes(p.id));
  };

  const getAvailableProgramsForUser = (userId: string) => {
    const assignment = getUserAssignment(userId);
    const search = getProgramSearch(userId).toLowerCase();
    return programs.filter(p => 
      !assignment.programIds.includes(p.id) &&
      p.name.toLowerCase().includes(search)
    );
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchTerm = userSearch.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    return fullName.includes(searchTerm) || 
           user.email.toLowerCase().includes(searchTerm) ||
           getRoleDisplayName(user.role).toLowerCase().includes(searchTerm);
  });

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">טוען נתונים...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">שיוך פרויקטים למשתמשים</h2>
          </div>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין משתמשים</h3>
            <p className="text-gray-500">לא נמצאו משתמשים במערכת</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="חיפוש משתמשים..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Users Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900 min-w-[200px]">משתמש</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900 min-w-[150px]">סיסמה</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900 min-w-[400px]">שיוך פרויקטים</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-gray-900 min-w-[100px]">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(user => {
                    const userAssignment = getUserAssignment(user.id);
                    const assignedPrograms = getAssignedProgramsForUser(user.id);
                    const availablePrograms = getAvailableProgramsForUser(user.id);
                    const isUserSaving = savingUsers.has(user.id);
                    const userSuccessMessage = userSuccessMessages.get(user.id);
                    const isPasswordCopied = copiedPasswords.has(user.id);
                    const isDropdownOpen = openDropdowns.has(user.id);
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        {/* User Info */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-medium text-sm">
                                {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName}` 
                                  : user.email}
                              </p>
                              <p className="text-sm text-gray-600 truncate">{user.email}</p>
                              <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full mt-1">
                                {getRoleDisplayName(user.role)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Password */}
                        <td className="px-4 py-4">
                          {user.password && (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={user.password}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent min-w-[100px]"
                              />
                              <button
                                onClick={() => copyToClipboard(user.password!, user.id)}
                                className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isPasswordCopied 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                <Copy className="w-3 h-3" />
                                {isPasswordCopied ? 'הועתק!' : 'העתק'}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Assigned Programs */}
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            {assignedPrograms.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">לא משויך לאף פרויקט</p>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {assignedPrograms.map(program => (
                                  <div
                                    key={program.id}
                                    className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium"
                                  >
                                    <span className="truncate max-w-[120px]" title={program.name}>
                                      {program.name}
                                    </span>
                                    <button
                                      onClick={() => handleProgramToggle(user.id, program.id)}
                                      className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                                    >
                                      <X className="w-2 h-2" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Success Message */}
                            {userSuccessMessage && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <p className="text-green-700 text-xs">{userSuccessMessage}</p>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Add Program Dropdown */}
                        <td className="px-4 py-4">
                          <div className="relative">
                            <button
                              onClick={() => toggleDropdown(user.id)}
                              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all min-w-[140px] justify-between"
                            >
                              <span>הוסף פרויקט</span>
                              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                              <>
                                {/* Backdrop */}
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => toggleDropdown(user.id)}
                                />
                                
                                {/* Dropdown */}
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[300px]">
                                  {/* Search */}
                                  <div className="p-3 border-b border-gray-200">
                                    <div className="relative">
                                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                      <input
                                        type="text"
                                        placeholder="חיפוש פרויקטים..."
                                        value={getProgramSearch(user.id)}
                                        onChange={(e) => setProgramSearch(user.id, e.target.value)}
                                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                      />
                                    </div>
                                  </div>

                                  {/* Programs List */}
                                  <div className="max-h-60 overflow-y-auto">
                                    {availablePrograms.length === 0 ? (
                                      <div className="p-4 text-center text-gray-500 text-sm">
                                        {getProgramSearch(user.id) ? 'לא נמצאו פרויקטים התואמים לחיפוש' : 'כל הפרויקטים כבר משויכים'}
                                      </div>
                                    ) : (
                                      <div className="py-2">
                                        {availablePrograms.map(program => (
                                          <button
                                            key={program.id}
                                            onClick={() => {
                                              handleProgramToggle(user.id, program.id);
                                              toggleDropdown(user.id);
                                            }}
                                            className="w-full text-right px-4 py-2 hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors text-sm"
                                          >
                                            {program.name}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Delete Button */}
                        <td className="px-4 py-4 text-center">
                          {savingUsers.has(user.id) && (
                            <div className="mb-2 text-center">
                              <div className="inline-flex items-center gap-2 text-green-600 text-xs">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                                שומר...
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={deletingUsers.has(user.id)}
                            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[100px] justify-center"
                          >
                            {deletingUsers.has(user.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                מוחק...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3 h-3" />
                                מחק
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
