import React from 'react';
import { Search, Calendar, ChevronDown } from 'lucide-react';

interface SearchFiltersProps {
  searchText: string;
  setSearchText: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  // Optional program filter for admin view
  programOptions?: { id: string; name: string }[];
  programFilter?: string;
  setProgramFilter?: (value: string) => void;
  programLoading?: boolean;
}

export function SearchFilters({
  searchText,
  setSearchText,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  programOptions,
  programFilter,
  setProgramFilter,
  programLoading,
}: SearchFiltersProps) {
  // Admin program dropdown state (searchable)
  const [isProgramMenuOpen, setProgramMenuOpen] = React.useState(false);
  const [programSearchTerm, setProgramSearchTerm] = React.useState('');
  const programSearchInputRef = React.useRef<HTMLInputElement | null>(null);

  const currentProgramName = React.useMemo(() => {
    if (!programOptions || !programOptions.length) return 'כל הפרויקטים';
    if (!programFilter) return 'כל הפרויקטים';
    return (
      programOptions.find((p) => p.id === programFilter)?.name || 'בחר פרויקט'
    );
  }, [programOptions, programFilter]);

  const filteredPrograms = React.useMemo(() => {
    if (!programOptions) return [] as { id: string; name: string }[];
    const term = programSearchTerm.trim().toLowerCase();
    if (!term) return programOptions;
    return programOptions.filter((p) => p.name.toLowerCase().includes(term));
  }, [programOptions, programSearchTerm]);

  React.useEffect(() => {
    if (isProgramMenuOpen) {
      setTimeout(() => programSearchInputRef.current?.focus(), 0);
    } else {
      setProgramSearchTerm('');
    }
  }, [isProgramMenuOpen]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">חיפוש וסינון</h3>
      <div className={`grid grid-cols-1 md:grid-cols-2 ${programOptions && setProgramFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>
        {programOptions && setProgramFilter && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setProgramMenuOpen((v) => !v)}
              disabled={!!programLoading}
              className="w-full inline-flex items-center justify-between gap-2 px-4 py-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="truncate text-right flex-1">{currentProgramName}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isProgramMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProgramMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProgramMenuOpen(false)} />
                <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        ref={programSearchInputRef}
                        type="text"
                        placeholder="חיפוש פרויקטים..."
                        value={programSearchTerm}
                        onChange={(e) => setProgramSearchTerm(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="py-2 max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setProgramFilter?.('');
                        setProgramMenuOpen(false);
                      }}
                      className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors ${!programFilter ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                    >
                      כל הפרויקטים
                    </button>

                    {filteredPrograms.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setProgramFilter?.(p.id);
                          setProgramMenuOpen(false);
                        }}
                        className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors ${programFilter === p.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${programFilter === p.id ? 'bg-blue-600' : 'bg-gray-300'}`} />
                          <span className="flex-1">{p.name}</span>
                          {programFilter === p.id && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">נבחר</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="חיפוש..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
        >
          <option value="">כל הסטטוסים</option>
          <option value="new">חדש</option>
          <option value="sent_for_payment">נשלח לתשלום</option>
          <option value="paid">שולם</option>
          <option value="receipt_uploaded">קבלה הועלתה</option>
          <option value="closed">נסגר</option>
          <option value="petty_cash">קופה קטנה</option>
          <option value="salary">שכר</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
        >
          <option value="">כל העדיפויות</option>
          <option value="urgent">דחוף</option>
          <option value="normal">רגיל</option>
        </select>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
    </div>
  );
}
