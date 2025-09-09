import React from 'react';
import { Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/shared/utils';

interface BudgetSummaryCardsProps {
  totalBudget: number;
  totalExpenses: number;
  remainingBalance: number;
  budgetUsedPercentage: number;
}

export function BudgetSummaryCards({
  totalBudget,
  totalExpenses,
  remainingBalance,
  budgetUsedPercentage,
}: BudgetSummaryCardsProps) {
  const percentLeft = totalBudget > 0
    ? Math.max(0, Math.round((remainingBalance / totalBudget) * 100))
    : 0;

  return (
    <>
      <style>{`
        @keyframes subtleBlink { 0%, 100% { opacity: 1 } 50% { opacity: .88 } }
        @keyframes subtleBlinkStrong { 0%, 100% { opacity: 1 } 50% { opacity: .72 } }
      `}</style>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Budget */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">סה"כ תקציב</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
        </div>

        {/* Remaining Balance */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${remainingBalance < totalBudget * 0.1 ? 'bg-red-100' : 'bg-green-100'}`}>
              <TrendingUp className={`w-6 h-6 ${remainingBalance < totalBudget * 0.1 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">יתרה</h3>
          </div>
          <p className={`text-3xl font-bold ${remainingBalance < totalBudget * 0.1 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(remainingBalance)}
          </p>
        </div>

        {/* Total Expenses + usage bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">סה"כ הוצאות</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  budgetUsedPercentage > 90 ? 'bg-red-500' :
                  budgetUsedPercentage > 75 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{budgetUsedPercentage.toFixed(1)}% מהתקציב נוצל</p>
          </div>
        </div>
      </div>

      {/* Alerts based on remaining percent / overrun */}
      {remainingBalance < 0 ? (
        <div
          className="relative bg-red-100 border-4 border-red-700 rounded-2xl p-5 mb-6 flex items-start gap-4 shadow-2xl ring-4 ring-red-600/60 text-right"
          style={{ animation: 'subtleBlinkStrong 1.8s ease-in-out infinite' }}
        >
          <span className="absolute -top-2 -right-2 inline-flex h-4 w-4 rounded-full bg-red-500 animate-ping" />
          <span className="absolute -top-2 -right-2 inline-flex h-4 w-4 rounded-full bg-red-700" />
          <AlertTriangle className="w-8 h-8 text-red-800 flex-shrink-0" />
          <div className="text-red-900">
            <p className="text-2xl font-extrabold">חריגה מהתקציב!</p>
            <p className="text-lg font-semibold">לא ניתן להוסיף הוצאות.</p>
            <p className="text-sm">להוספת תקציב חריגה יש לקבל אישור מיוחד ממרים קופשיץ</p>
          </div>
        </div>
      ) : (
        <>
          {percentLeft < 20 && percentLeft >= 10 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div className="text-yellow-800">
                <p className="font-semibold">שימי לב! נותרו {percentLeft}% מהתקציב</p>
              </div>
            </div>
          )}

          {percentLeft < 10 && percentLeft >= 5 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div className="text-red-800">
                <p className="font-semibold">שימי לב! נותרו {percentLeft}% מהתקציב</p>
              </div>
            </div>
          )}



          {percentLeft < 5 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div className="text-red-800">
                <p className="font-semibold">התרעה! נותרו {percentLeft}% מהתקציב</p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
