import React from 'react';

interface LoadingStatesProps {
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  error?: string | null;
  expensesCount?: number;
}

export function LoadingStates({ 
  loading, 
  loadingMore, 
  hasMore, 
  error, 
  expensesCount = 0 
}: LoadingStatesProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">טוען הוצאות...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center mt-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">טוען עוד הוצאות...</p>
        </div>
      )}

      {/* End of Data Indicator */}
      {!hasMore && expensesCount > 0 && (
        <div className="text-center py-6">
          <p className="text-gray-500">הוצגו כל ההוצאות</p>
        </div>
      )}
    </>
  );
}