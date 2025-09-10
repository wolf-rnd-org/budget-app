import React from 'react';
import { Users, UserPlus, Trash2, AlertCircle, CheckCircle, ArrowLeft, Search, ChevronDown, User, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProgramsStore } from '@/stores/programsStore';
import { authApi, programsApi, isMockMode } from '@/api/http';
import { ProjectAssignmentDropdown, CopyToClipboardField, type Project } from '@/components/shared';
import { ROLES, getRoleDisplayName } from '@/constants/roles';

interface Assistant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role_label: string;
  programIds: string[];
  password?: string;
}

interface ExistingAssistant {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role_label: string;
}

export function AssistantsManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const programs = useProgramsStore(s => s.programs);
  const [assistants, setAssistants] = React.useState<Assistant[]>([]);
  const [existingAssistants, setExistingAssistants] = React.useState<ExistingAssistant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Set<string>>(new Set());
  const [updating, setUpdating] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [newAssistant, setNewAssistant] = React.useState<Assistant | null>(null);

  // Form state for new assistant
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    selectedProjects: [] as string[],
  });

  // Existing assistant assignment state
  const [selectedExistingAssistant, setSelectedExistingAssistant] = React.useState<ExistingAssistant | null>(null);
  const [existingAssistantProjects, setExistingAssistantProjects] = React.useState<string[]>([]);
  const [showExistingDropdown, setShowExistingDropdown] = React.useState(false);
  const [existingSearch, setExistingSearch] = React.useState('');

  // Get user's assigned programs
  const userPrograms = programs.filter(p => 
    user?.actions?.includes('program_budgets.view') || 
    user?.actions?.includes('expenses.view')
  );

  React.useEffect(() => {
    fetchData();
  }, [user?.userId]);

  const fetchData = async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      setError(null);

      if (isMockMode()) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockAssistants: Assistant[] = [
          {
            id: 'asst_001',
            email: 'assistant1@example.com',
            firstName: 'עדי',
            lastName: 'כהן',
            role_label: 'assistant',
            programIds: ['24640', '7112'],
            password: 'H9#67432',
          },
          {
            id: 'asst_002',
            email: 'assistant2@example.com',
            firstName: 'נועה',
            lastName: 'לוי',
            role_label: 'assistant',
            programIds: ['24864'],
            password: 'K3$89456',
          },
        ];

        const mockExistingAssistants: ExistingAssistant[] = [
          {
            id: 'asst_global_001',
            email: 'global.assistant1@example.com',
            firstName: 'יעל',
            lastName: 'דוד',
            role_label: 'assistant',
          },
          {
            id: 'asst_global_002', 
            email: 'global.assistant2@example.com',
            firstName: 'שירה',
            lastName: 'מזרחי',
            role_label: 'assistant',
          },
          {
            id: 'asst_global_003',
            email: 'global.assistant3@example.com',
            firstName: 'רבקה',
            lastName: 'אשכנזי',
            role_label: 'assistant',
          },
        ];
        
        setAssistants(mockAssistants);
        setExistingAssistants(mockExistingAssistants);
      } else {
        const [assistantsResponse, existingResponse] = await Promise.all([
          authApi.get(`/users/assistants/${user.userId}`),
          authApi.get('/users/existing-assistants'),
        ]);
        setAssistants(assistantsResponse.data);
        setExistingAssistants(existingResponse.data);
      }
    } catch (err) {
      setError('שגיאה בטעינת רשימת העוזרים');
      console.error('Error fetching assistants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleProjectToggle = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProjects: prev.selectedProjects.includes(projectId)
        ? prev.selectedProjects.filter(id => id !== projectId)
        : [...prev.selectedProjects, projectId]
    }));
  };

  const handleProjectRemove = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProjects: prev.selectedProjects.filter(id => id !== projectId)
    }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('שם פרטי נדרש');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('שם משפחה נדרש');
      return false;
    }
    if (!formData.email.trim()) {
      setError('כתובת אימייל נדרשת');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('כתובת אימייל לא תקינה');
      return false;
    }
    if (formData.selectedProjects.length === 0) {
      setError('יש לבחור לפחות פרויקט אחד');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);
      setNewAssistant(null);

      const assistantRole = ROLES.find(r => r.id === 'assistant');
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role_label: assistantRole?.englishLabel || 'assistant',
        programIds: formData.selectedProjects,
        createdBy: user?.userId,
      };

      if (isMockMode()) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockResponse = {
          success: true,
          message: 'עוזר נוצר בהצלחה',
          userId: `asst_${Date.now()}`,
          password: 'H9#67432',
        };
        
        const createdAssistant: Assistant = {
          id: mockResponse.userId,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role_label: 'assistant',
          programIds: formData.selectedProjects,
          password: mockResponse.password,
        };
        
        setNewAssistant(createdAssistant);
        setAssistants(prev => [...prev, createdAssistant]);
        setSuccess('עוזר נוצר בהצלחה! הסיסמה נוצרה על ידי המערכת.');
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          selectedProjects: [],
        });
      } else {
        const response = await authApi.post('/register', userData);
        const createdAssistant: Assistant = {
          id: response.data.userId,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role_label: 'assistant',
          programIds: formData.selectedProjects,
          password: response.data.password,
        };
        
        setNewAssistant(createdAssistant);
        setAssistants(prev => [...prev, createdAssistant]);
        setSuccess('עוזר נוצר בהצלחה! הסיסמה נוצרה על ידי המערכת.');
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          selectedProjects: [],
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'שגיאה ביצירת העוזר';
      setError(errorMessage);
      console.error('Create assistant error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssistant = async (assistantId: string) => {
    const assistant = assistants.find(a => a.id === assistantId);
    const assistantName = assistant 
      ? `${assistant.firstName} ${assistant.lastName}` 
      : assistantId;
    
    if (!confirm(`האם אתה בטוח שברצונך למחוק את העוזר ${assistantName}?`)) {
      return;
    }

    try {
      setDeleting(prev => new Set(prev).add(assistantId));
      setError(null);

      if (isMockMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAssistants(prev => prev.filter(a => a.id !== assistantId));
      } else {
        await authApi.delete(`/user/${assistantId}`);
        setAssistants(prev => prev.filter(a => a.id !== assistantId));
      }
    } catch (err) {
      setError(`שגיאה במחיקת העוזר ${assistantName}`);
      console.error('Error deleting assistant:', err);
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(assistantId);
        return newSet;
      });
    }
  };

  const handleUpdateAssistantProjects = async (assistantId: string, newProjectIds: string[]) => {
    try {
      setUpdating(prev => new Set(prev).add(assistantId));
      setError(null);

      if (isMockMode()) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setAssistants(prev => prev.map(assistant => 
          assistant.id === assistantId 
            ? { ...assistant, programIds: newProjectIds }
            : assistant
        ));
      } else {
        await authApi.post(`/user/${assistantId}/programs`, {
          programIds: newProjectIds,
        });
        setAssistants(prev => prev.map(assistant => 
          assistant.id === assistantId 
            ? { ...assistant, programIds: newProjectIds }
            : assistant
        ));
      }
    } catch (err) {
      setError(`שגיאה בעדכון שיוכי הפרויקטים עבור העוזר`);
      console.error('Error updating assistant projects:', err);
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(assistantId);
        return newSet;
      });
    }
  };

  const handleExistingAssistantSelect = (assistant: ExistingAssistant) => {
    setSelectedExistingAssistant(assistant);
    setShowExistingDropdown(false);
    setExistingSearch('');
    setExistingAssistantProjects([]);
    setError(null);
  };

  const handleAssignExistingAssistant = async () => {
    if (!selectedExistingAssistant || existingAssistantProjects.length === 0) {
      setError('יש לבחור עוזר ולפחות פרויקט אחד');
      return;
    }

    try {
      setAssigning(true);
      setError(null);

      const assignmentData = {
        assistantId: selectedExistingAssistant.id,
        programIds: existingAssistantProjects,
        assignedBy: user?.userId,
      };

      if (isMockMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Add to current user's assistants list
        const assignedAssistant: Assistant = {
          ...selectedExistingAssistant,
          programIds: existingAssistantProjects,
          password: 'H9#67432', // Mock password for display
        };
        
        setAssistants(prev => [...prev, assignedAssistant]);
        
        // Remove from available existing assistants
        setExistingAssistants(prev => 
          prev.filter(a => a.id !== selectedExistingAssistant.id)
        );
        
        setSuccess(`העוזר ${selectedExistingAssistant.firstName} ${selectedExistingAssistant.lastName} שויך בהצלחה!`);
      } else {
        await authApi.post('/users/assign-existing-assistant', assignmentData);
        
        const assignedAssistant: Assistant = {
          ...selectedExistingAssistant,
          programIds: existingAssistantProjects,
        };
        
        setAssistants(prev => [...prev, assignedAssistant]);
        setExistingAssistants(prev => 
          prev.filter(a => a.id !== selectedExistingAssistant.id)
        );
        
        setSuccess(`העוזר ${selectedExistingAssistant.firstName} ${selectedExistingAssistant.lastName} שויך בהצלחה!`);
      }

      // Reset existing assistant form
      setSelectedExistingAssistant(null);
      setExistingAssistantProjects([]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'שגיאה בשיוך העוזר הקיים';
      setError(errorMessage);
      console.error('Assign existing assistant error:', err);
    } finally {
      setAssigning(false);
    }
  };

  const getAssignedProgramsForAssistant = (assistant: Assistant) => {
    return userPrograms.filter(p => assistant.programIds.includes(p.id));
  };
  // Filter existing assistants (exclude already assigned ones)
  const availableExistingAssistants = existingAssistants.filter(existing => 
    !assistants.some(assigned => assigned.id === existing.id) &&
    (existing.firstName.toLowerCase().includes(existingSearch.toLowerCase()) ||
     existing.lastName.toLowerCase().includes(existingSearch.toLowerCase()) ||
     existing.email.toLowerCase().includes(existingSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/expenses')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              חזור
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ניהול עוזרים</h1>
                <p className="text-gray-600">הוסף ונהל עוזרים לפרויקטים שלך</p>
              </div>
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

        {/* Add New Assistant Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">הוספת עוזר חדש</h2>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Main Form Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם פרטי *
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="assistant@example.com"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Project Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  שיוך פרויקטים *
                </label>
                <ProjectAssignmentDropdown
                  projects={userPrograms}
                  selectedProjectIds={formData.selectedProjects}
                  onProjectToggle={handleProjectToggle}
                  onProjectRemove={handleProjectRemove}
                  disabled={creating}
                  placeholder="הוסף פרויקט"
                  className="max-w-md"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-start">
                <button
                  type="submit"
                  disabled={creating || formData.selectedProjects.length === 0}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      יוצר עוזר...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      הוסף עוזר
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Success Message with Generated Password */}
            {newAssistant && newAssistant.password && (
              <div className="mt-6 bg-green-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-4">עוזר נוצר בהצלחה!</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-700">שם מלא:</span>
                      <span className="text-green-800 mr-2">{newAssistant.firstName} {newAssistant.lastName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">אימייל:</span>
                      <span className="text-green-800 mr-2">{newAssistant.email}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">תפקיד:</span>
                      <span className="text-green-800 mr-2">{getRoleDisplayName('assistant')}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">מזהה משתמש:</span>
                      <span className="text-green-800 mr-2 font-mono">{newAssistant.id}</span>
                    </div>
                  </div>
                  
                  <CopyToClipboardField
                    value={newAssistant.password}
                    label="סיסמה שנוצרה על ידי המערכת:"
                    fieldClassName="border-green-300 focus:ring-green-500"
                    buttonClassName="bg-green-600 hover:bg-green-700 text-white"
                  />
                  
                  <p className="text-xs text-green-600">
                    שמור את הסיסמה במקום בטוח ושתף אותה עם העוזר החדש
                  </p>
                </div>
              </div>
            )}

            {success && !newAssistant?.password && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-green-700">{success}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assign Existing Assistant Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">שיוך עוזר קיים</h2>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {/* Existing Assistant Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    בחר עוזר קיים *
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowExistingDropdown(!showExistingDropdown)}
                      className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-xl px-4 py-3 text-right hover:bg-gray-50 transition-all"
                    >
                      <span className="text-gray-700">
                        {selectedExistingAssistant 
                          ? `${selectedExistingAssistant.firstName} ${selectedExistingAssistant.lastName}`
                          : 'בחר עוזר קיים'
                        }
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showExistingDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showExistingDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowExistingDropdown(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[15] overflow-hidden">
                          {/* Search */}
                          <div className="p-3 border-b border-gray-200">
                            <div className="relative">
                              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input
                                type="text"
                                placeholder="חיפוש עוזרים..."
                                value={existingSearch}
                                onChange={(e) => setExistingSearch(e.target.value)}
                                className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                              />
                            </div>
                          </div>

                          {/* Assistants List */}
                          <div className="max-h-60 overflow-y-auto">
                            {availableExistingAssistants.length === 0 ? (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                {existingSearch ? 'לא נמצאו עוזרים התואמים לחיפוש' : 'אין עוזרים זמינים לשיוך'}
                              </div>
                            ) : (
                              <div className="py-2">
                                {availableExistingAssistants.map(assistant => (
                                  <button
                                    key={assistant.id}
                                    onClick={() => handleExistingAssistantSelect(assistant)}
                                    className="w-full text-right px-4 py-3 hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-medium text-xs">
                                          {assistant.firstName.charAt(0)}{assistant.lastName.charAt(0)}
                                        </span>
                                      </div>
                                      <div className="flex-1 text-right">
                                        <p className="font-medium text-gray-900">
                                          {assistant.firstName} {assistant.lastName}
                                        </p>
                                        <p className="text-sm text-gray-600">{assistant.email}</p>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Project Assignment for Existing Assistant */}
                {selectedExistingAssistant && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      שיוך פרויקטים *
                    </label>
                    <ProjectAssignmentDropdown
                      projects={userPrograms}
                      selectedProjectIds={existingAssistantProjects}
                      onProjectToggle={(projectId) => {
                        setExistingAssistantProjects(prev => 
                          prev.includes(projectId)
                            ? prev.filter(id => id !== projectId)
                            : [...prev, projectId]
                        );
                      }}
                      onProjectRemove={(projectId) => {
                        setExistingAssistantProjects(prev => prev.filter(id => id !== projectId));
                      }}
                      disabled={assigning}
                      placeholder="הוסף פרויקט"
                      className="max-w-md"
                    />
                  </div>
                )}
              </div>

              {/* Assign Button */}
              {selectedExistingAssistant && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={handleAssignExistingAssistant}
                    disabled={assigning || existingAssistantProjects.length === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {assigning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        משייך עוזר...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        שייך עוזר קיים
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assistants List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">רשימת עוזרים</h2>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">טוען עוזרים...</p>
              </div>
            ) : assistants.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">אין עוזרים</h3>
                <p className="text-gray-500">לא נמצאו עוזרים במערכת</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900 min-w-[200px]">עוזר</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900 min-w-[150px]">סיסמה</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-gray-900 min-w-[300px]">פרויקטים משויכים</th>
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-900 min-w-[100px]">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assistants.map(assistant => {
                      const assignedPrograms = getAssignedProgramsForAssistant(assistant);
                      const isUpdating = updating.has(assistant.id);
                      const isDeleting = deleting.has(assistant.id);
                      
                      return (
                        <tr key={assistant.id} className="hover:bg-gray-50 transition-colors">
                          {/* Assistant Info */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-medium text-sm">
                                  {assistant.firstName.charAt(0)}{assistant.lastName.charAt(0)}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {assistant.firstName} {assistant.lastName}
                                </p>
                                <p className="text-sm text-gray-600 truncate">{assistant.email}</p>
                                <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full mt-1">
                                  {getRoleDisplayName(assistant.role_label)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Password */}
                          <td className="px-4 py-4">
                            {assistant.password ? (
                              <CopyToClipboardField
                                value={assistant.password}
                                fieldClassName="border-purple-300 focus:ring-purple-500 text-xs"
                                buttonClassName="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-2"
                                className="max-w-[180px]"
                              />
                            ) : (
                              <span className="text-gray-500 text-sm italic">לא זמין</span>
                            )}
                          </td>

                          {/* Assigned Projects with Edit */}
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              {assignedPrograms.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">לא משויך לאף פרויקט</p>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {assignedPrograms.map(program => (
                                    <span
                                      key={program.id}
                                      className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium"
                                    >
                                      <span className="truncate max-w-[120px]" title={program.name}>
                                        {program.name}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Project Assignment Dropdown */}
                              <div className="mt-2">
                                <ProjectAssignmentDropdown
                                  projects={userPrograms}
                                  selectedProjectIds={assistant.programIds}
                                  onProjectToggle={(projectId) => {
                                    const newProjectIds = assistant.programIds.includes(projectId)
                                      ? assistant.programIds.filter(id => id !== projectId)
                                      : [...assistant.programIds, projectId];
                                    handleUpdateAssistantProjects(assistant.id, newProjectIds);
                                  }}
                                  onProjectRemove={(projectId) => {
                                    const newProjectIds = assistant.programIds.filter(id => id !== projectId);
                                    handleUpdateAssistantProjects(assistant.id, newProjectIds);
                                  }}
                                  disabled={isUpdating}
                                  placeholder="עדכן פרויקטים"
                                  className="max-w-xs"
                                />
                              </div>
                              
                              {isUpdating && (
                                <div className="text-center">
                                  <div className="inline-flex items-center gap-2 text-purple-600 text-xs">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                                    מעדכן...
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Delete Button */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => handleDeleteAssistant(assistant.id)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[100px] justify-center"
                            >
                              {isDeleting ? (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
