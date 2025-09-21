import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { PettyCashPayload } from './types';
import { CategoriesField } from '../AddExpense/CategoriesField';


type Props = {
  open: boolean;
  // categories?: CategoryOption[];
  onClose: () => void;
  onSubmit: (payload: PettyCashPayload) => Promise<void> | void;
};

export default function PettyCashDialog({ open, /*categories = [],*/ onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Derived validation (errors shown only after blur or submit)
  const amountNum = useMemo(() => Number(amount), [amount]);
  const amountInvalid = useMemo(() => (!amount || Number.isNaN(amountNum) || amountNum <= 0), [amount, amountNum]);
  const nameInvalid = useMemo(() => name.trim().length === 0, [name]);
  const categoryInvalid = useMemo(() => categoryIds.length === 0, [categoryIds]);

  const canSubmit = useMemo(() => {
    return !submitting && !amountInvalid && !nameInvalid && !categoryInvalid;
  }, [submitting, amountInvalid, nameInvalid, categoryInvalid]);

  const reset = () => {
    setAmount('');
    setName('');
    setCategoryIds([]);
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (amountInvalid || nameInvalid || categoryInvalid) return;
    const payload: PettyCashPayload = {
      type: 'petty_cash',
      amount: Number(amount),
      name: name.trim(),
      categoryIds,
    };
    try {
      setSubmitting(true);
      await onSubmit(payload);
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overscroll-contain" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-lg font-semibold text-gray-900">קופה קטנה</h3>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="סגירה">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] overscroll-contain">
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">סכום <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); }}
                onBlur={() => { setTouched(prev => ({ ...prev, amount: true })); }}
                required
                min={0}
                step="0.01"
                aria-invalid={Boolean((attemptedSubmit || touched.amount) && amountInvalid)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${(attemptedSubmit || touched.amount) && amountInvalid ? 'border-red-500' : 'border-gray-300'}`}
              />
              {(attemptedSubmit || touched.amount) && amountInvalid && (
                <p className="text-sm text-red-600 mt-1">סכום לא תקין יש להזין מספר חיובי</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">שם הוצאה <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); }}
                onBlur={() => { setTouched(prev => ({ ...prev, name: true })); }}
                required
                aria-invalid={Boolean((attemptedSubmit || touched.name) && nameInvalid)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${(attemptedSubmit || touched.name) && nameInvalid ? 'border-red-500' : 'border-gray-300'}`}
              />
              {(attemptedSubmit || touched.name) && nameInvalid && (
                <p className="text-sm text-red-600 mt-1">שם הוצאה הוא שדה חובה</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                קטגוריות <span className="text-red-500">*</span>
              </label>

              <CategoriesField
                selectedCategories={categoryIds}
                onChange={(ids) => {
                  setTouched(prev => ({ ...prev, categoryIds: true }));
                  setCategoryIds(ids);
                }}
                error={(attemptedSubmit || touched.categoryIds) && categoryInvalid}
              />

              {(attemptedSubmit || touched.categoryIds) && categoryInvalid && (
                <p className="text-sm text-red-600 mt-1">יש לבחור לפחות קטגוריה אחת</p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition-all"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all min-w-[120px] justify-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    שומר…
                  </>
                ) : (
                  <>שמירה</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

