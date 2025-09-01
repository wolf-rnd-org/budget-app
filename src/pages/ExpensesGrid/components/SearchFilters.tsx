import React from 'react';
import { Search, Calendar } from 'lucide-react';

interface SearchFiltersProps {
  searchText: string;
  setSearchText: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
}

export function SearchFilters({
  searchText,
  setSearchText,
  statusFilter,
  setStatusFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo
}: SearchFiltersProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">סינון וחיפוש</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="חיפוש חופשי..."
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
          <option value="approved">מאושר</option>
          <option value="pending">ממתין</option>
          <option value="rejected">נדחה</option>
        </select>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="מתאריך"
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="עד תאריך"
          />
        </div>
      </div>
    </div>
  );
}