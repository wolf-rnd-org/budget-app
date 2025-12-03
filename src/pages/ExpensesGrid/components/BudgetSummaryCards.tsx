import React from 'react';
import { Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/shared/utils';

interface BudgetSummaryCardsProps {
  totalBudget: number;
  totalExpenses: number;
  actualExpenses?: number;
  expectedExpenses?: number;
  remainingBalance: number;
  budgetUsedPercentage: number;
  baseBudget?: number | null;
  extraBudget?: number | null;
  income?: number | null;
  budgetLoaded?: boolean;
}

export function BudgetSummaryCards({
  totalBudget,
  totalExpenses,
  actualExpenses,
  expectedExpenses,
  remainingBalance,
  budgetUsedPercentage,
  baseBudget,
  extraBudget,
  income,
  budgetLoaded: _budgetLoaded,
}: BudgetSummaryCardsProps) {
  const percentLeft = totalBudget > 0
    ? Math.max(0, Math.round((remainingBalance / totalBudget) * 100))
    : 0;

  const actual = typeof actualExpenses === 'number' ? actualExpenses : totalExpenses;
  const expected = typeof expectedExpenses === 'number' ? expectedExpenses : 0;
  const combinedExpenses = totalExpenses || (actual + expected);
  const expensesUsagePct = Number.isFinite(budgetUsedPercentage)
    ? budgetUsedPercentage
    : (totalBudget > 0 ? (combinedExpenses / totalBudget) * 100 : 0);
  const hasExpectedExpenses = expected > 0;

  // ערכים מנורמלים ובטוחים
  const extraVal = Number(extraBudget) || 0;
  const incomeVal = Number(income) || 0;
  const baseVal = Number(baseBudget) || Number(totalBudget - (incomeVal + extraVal)) || 0;

  // יחס הכנסות מול הוצאות למיקרו-בר
  const denom = Math.max(0, incomeVal) + Math.max(0, combinedExpenses);
  const incomeSharePct = denom > 0 ? Math.round((Math.max(0, incomeVal) / denom) * 100) : 0;
  const expenseSharePct = 100 - incomeSharePct;

  // מצב מסגרת עדינה לכרטיס התקציב לפי מצב
  const nearingLimit = totalBudget > 0 && remainingBalance <= totalBudget * 0.1 && remainingBalance >= 0;
  const overrun = remainingBalance < 0;
  const totalCardBorder =
    overrun ? 'border-red-200'
      : nearingLimit ? 'border-blue-200'
        : 'border-gray-100';

  return (
    <>
      <style>{`
        @keyframes subtleBlink { 0%, 100% { opacity: 1 } 50% { opacity: .88 } }
        @keyframes subtleBlinkStrong { 0%, 100% { opacity: 1 } 50% { opacity: .72 } }
      `}</style>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" dir="rtl">
        {/* Total Budget */}
        <div className={`bg-white rounded-2xl p-5 shadow-sm border  border-gray-100 ${totalCardBorder} hover:shadow-md transition-shadow`}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">סה״כ תקציב</h3>
          </div>

          {/* Segments with percentages */}
          {(() => {
            const basePos = Math.max(0, baseVal);
            const extPos = Math.max(0, extraVal);
            const incPos = Math.max(0, incomeVal);

            // ריבועים: מציגים רק מי שערכו > 0
            const boxes = [
              { key: 'base', label: 'תקציב בסיס:', val: basePos, bg: 'bg-green-50', border: 'border-green-200' },
              { key: 'extra', label: 'תקציב חריגה:', val: extPos, bg: 'bg-amber-50', border: 'border-amber-200' },
              { key: 'income', label: 'הכנסה נוספת:', val: incPos, bg: 'bg-blue-50', border: 'border-blue-200' },
            ].filter(b => b.val > 0);

            return (
              <div className="mb-4">
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  {boxes.map(({ key, label, val, bg, border }) => (
                    <div
                      key={key}
                      className={`rounded-lg border ${border} ${bg} px-2 py-1.5 sm:px-3 sm:py-2 flex items-center justify-center text-center`}
                      title={`${label} ${formatCurrency(val)}`}
                      aria-label={`${label} ${formatCurrency(val)}`}
                    >
                      <div className="flex items-center gap-0.5 flex-wrap min-w-0">
                        <span className="text-[13px] sm:text-[12px] font-medium text-gray-700 whitespace-nowrap shrink-0 leading-tight">
                          {label}
                        </span>
                        <span className="text-[13px] sm:text-[12px] font-semibold text-gray-900 whitespace-nowrap leading-tight">
                          {formatCurrency(val)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
          
              </div>
            );
          })()}

          {/* Total line */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-baseline justify-between">
              <span className="text-gray-900 text-base sm:text-lg font-semibold">סה״כ תקציב זמין:</span>
              <span className="text-3xl sm:text-3xl font-bold tracking-tight text-gray-900">
                {formatCurrency(totalBudget)}
              </span>
            </div>
          </div>
        </div>

        {/* Remaining Balance */}
        {/* Remaining Balance — משודרג */}
        <div
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative"
          dir="rtl"
          aria-labelledby="balance-card-title"
        >
          {/* תגית מצב בפינה שמאלית-עליונה */}
          <span
            className={`absolute top-3 left-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
      ${remainingBalance < 0
                ? 'bg-red-100 text-red-700'
                : remainingBalance < totalBudget * 0.1
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'}`}
            title={remainingBalance < 0 ? 'חריגה' : remainingBalance < totalBudget * 0.1 ? 'נמוך' : 'תקין'}
          >
            {remainingBalance < 0 ? 'חריגה' : remainingBalance < totalBudget * 0.1 ? 'נמוך' : 'תקין'}
          </span>

          {/* כותרת + אייקון עם טבעת התקדמות */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              {/* טבעת עגולה: מציגה אחוז נותר */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${remainingBalance >= 0 ? '#10b981' : '#ef4444'} ${Math.max(0, Math.min(100, percentLeft))}%, #e5e7eb 0)`,
                  mask: 'radial-gradient(farthest-side, transparent 65%, black 66%)',
                  WebkitMask: 'radial-gradient(farthest-side, transparent 65%, black 66%)',
                }}
                aria-hidden
                title={`נותר ${Math.max(0, Math.min(100, percentLeft))}% מהתקציב`}
              />
              <div className={`relative p-2 rounded-lg ${remainingBalance < totalBudget * 0.1 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                <TrendingUp className={`w-6 h-6 ${remainingBalance < totalBudget * 0.1 ? 'text-red-600' : 'text-emerald-700'}`} />
              </div>
            </div>

            <h3 id="balance-card-title" className="text-lg font-semibold text-gray-900">יתרה</h3>
          </div>

          {/* סכום היתרה */}
          <p
            className={`text-3xl font-bold ${remainingBalance < totalBudget * 0.1 ? 'text-red-600' : 'text-emerald-700'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
            title={formatCurrency(remainingBalance)}
          >
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
          <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(combinedExpenses)}</p>

          {/* Split badges like budget card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm items-stretch">
            {hasExpectedExpenses && (
              <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 h-10 w-full min-w-0 sm:min-w-[150px]">
                <span className="inline-flex items-center gap-1 font-medium text-indigo-900 text-[12.5px] leading-tight">
                  הוצאות צפויות
                </span>
                <span className="font-semibold text-indigo-900 text-[12.5px] leading-tight">{formatCurrency(expected)}</span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-2 py-1.5 h-10 w-full min-w-0 sm:min-w-[150px]">
              <span className="inline-flex items-center gap-1 font-medium text-purple-900 text-[12.5px] leading-tight">
                הוצאות בפועל
              </span>
              <span className="font-semibold text-purple-900 text-[12.5px] leading-tight">{formatCurrency(actual)}</span>
            </div>
            {!hasExpectedExpenses && <div className="hidden sm:block h-10" aria-hidden />}
          </div>

          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5" role="progressbar" aria-valuenow={Math.min(expensesUsagePct, 100)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${expensesUsagePct > 90 ? 'bg-red-500'
                  : expensesUsagePct > 75 ? 'bg-amber-500'
                    : 'bg-green-500'
                  }`}
                style={{ width: `${Math.min(expensesUsagePct, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{expensesUsagePct.toFixed(1)}% מהתקציב נוצל (כולל צפוי)</p>
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
