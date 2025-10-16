import React from 'react';
import { Search, Calendar } from 'lucide-react';

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
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">חיפוש וסינון</h3>
      <div className={`grid grid-cols-1 md:grid-cols-2 ${programOptions && setProgramFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>
        {programOptions && setProgramFilter && (
          <select
            value={programFilter ?? ''}
            onChange={(e) => setProgramFilter(e.target.value)}
            disabled={!!programLoading}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
          >
            <option value="">כל התוכניות</option>
            {programOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search..."
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
          <option value="new">חדש – ממתין להנה"ח</option>
          <option value="sent_for_payment">נשלחה לתשלום</option>
          <option value="paid">שולם – ממתין לקבלה</option>
          <option value="receipt_uploaded">הועלתה קבלה</option>
          <option value="closed">הסתיים</option>
          <option value="petty_cash">קופה קטנה</option>
          <option value="salary">דיווח שכר</option>
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
            placeholder="מתאריך"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="date"
            placeholder="עד תאריך"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
    </div>
  );
}
