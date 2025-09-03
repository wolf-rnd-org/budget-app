import React from 'react';
import { ChevronDown, Building2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getProgramsByUserId } from '@/api/programs';

interface UserProgram {
  id: string;
  name: string;
}

export function ProjectSelector() {
  const {
    user,
    currentProgramId,
    setCurrentProgramId,
    programs,
    programsLoading,
    programsError,
    setPrograms,
    setProgramsLoading,
    setProgramsError,
  } = useAuthStore();

  const [isOpen, setIsOpen] = React.useState(false);

  const loadedForUserRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const userId = user?.userId;
    if (!userId) {
      setPrograms([]);
      loadedForUserRef.current = null;
      return;
    }

    if (loadedForUserRef.current === userId && programs.length > 0) {
      if (!currentProgramId) {
        const saved = localStorage.getItem(`projectPreference_${userId}`);
        const defaultProgram =
          saved && programs.find(p => p.id === saved) ? saved : programs[0]?.id;
        if (defaultProgram) setCurrentProgramId(defaultProgram);
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setProgramsLoading(true);
        setProgramsError(null);
        const userPrograms = await getProgramsByUserId(userId);
        if (cancelled) return;

        const programsArray: UserProgram[] = Array.isArray(userPrograms) ? userPrograms : [];
        setPrograms(programsArray);
        loadedForUserRef.current = userId;

        if (programsArray.length > 0) {
          const saved = localStorage.getItem(`projectPreference_${userId}`);
          const defaultProgram =
            saved && programsArray.find(p => p.id === saved) ? saved : programsArray[0].id;
          setCurrentProgramId(defaultProgram);
        } else {
          setCurrentProgramId(null);
        }
      } catch (err) {
        if (!cancelled) {
          setProgramsError('שגיאה בטעינת הפרויקטים');
          console.error('Error fetching user programs:', err);
        }
      } finally {
        if (!cancelled) setProgramsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.userId, setPrograms, setProgramsLoading, setProgramsError, setCurrentProgramId, programs.length, currentProgramId]);

  const handleSelect = (programId: string) => {
    setCurrentProgramId(programId);
    setIsOpen(false);
    if (user?.userId) {
      localStorage.setItem(`projectPreference_${user.userId}`, programId);
    }
  };

  const handleRetry = () => {
    if (!user?.userId) return;
    setProgramsError(null);
    setPrograms([]);
    loadedForUserRef.current = null;
  };

  if (!user?.userId) return null;

  const currentProgram = programs.find(p => p.id === currentProgramId);
  const currentProgramName = currentProgram?.name || 'בחר פרויקט';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={programsLoading}
        className="flex items-center gap-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shadow-sm transition-all min-w-[280px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="p-2 bg-blue-100 rounded-lg">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>

        <div className="flex-1 text-right">
          {programsLoading ? (
            <>
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="h-3 bg-gray-100 rounded animate-pulse w-20"></div>
            </>
          ) : programsError ? (
            <>
              <p className="text-sm font-medium text-red-600">שגיאה בטעינה</p>
              <p className="text-xs text-red-500">לחץ לניסיון חוזר</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900">{currentProgramName}</p>
              <p className="text-xs text-gray-500">פרויקט נוכחי</p>
            </>
          )}
        </div>

        {programsLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        ) : programsError ? (
          <RefreshCw className="w-5 h-5 text-red-400" />
        ) : (
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && !programsLoading && !programsError && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            <div className="py-2">
              {programs.map((program) => (
                <button
                  key={program.id}
                  onClick={() => handleSelect(program.id)}
                  className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors ${
                    currentProgramId === program.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${currentProgramId === program.id ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <span className="flex-1">{program.name}</span>
                    {currentProgramId === program.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">נבחר</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {programsError && isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-red-200 rounded-xl shadow-lg z-20 overflow-hidden">
            <div className="p-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 mb-3">{programsError}</p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                נסה שוב
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
