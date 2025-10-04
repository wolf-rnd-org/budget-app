import React from 'react';
import { X } from 'lucide-react';
import { expensesApi, isMockMode } from '@/api/http';
import type { Expense } from '@/api/types';
import type { CategoryOption } from './types';
import { CategoriesField } from '../AddExpense/CategoriesField';

type EditPettyCashDialogProps = {
  open: boolean;
  expense: Expense | null;
  categories?: CategoryOption[];
  onClose: () => void;
  onSuccess: (updatedExpense: Expense) => void;
};

const normalizeCategoryIds = (expense: Expense | null): string[] => {
  if (!expense) return [];
  const cats = (expense as any).categories;
  if (!cats) return [];
  if (Array.isArray(cats)) {
    return cats
      .map((c) => typeof c === 'string'
        ? String(c)
        : String(c?.id ?? c?.recId ?? c?.recordId ?? c?.value ?? '')
      )
      .filter(Boolean);
  }
  if (typeof cats === 'string') return [cats];
  return [];
};

export default function EditPettyCashDialog({ open, expense, categories = [], onClose, onSuccess }: EditPettyCashDialogProps) {
  const [amount, setAmount] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');
  const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const amountNum = React.useMemo(() => Number(amount), [amount]);
  const amountInvalid = React.useMemo(() => (!amount || Number.isNaN(amountNum) || amountNum <= 0), [amount, amountNum]);
  const nameInvalid = React.useMemo(() => name.trim().length === 0, [name]);
  const catsInvalid = React.useMemo(() => categoryIds.length === 0, [categoryIds]);

  const canSubmit = React.useMemo(() => {
    return !submitting && !amountInvalid && !nameInvalid && !catsInvalid;
  }, [submitting, amountInvalid, nameInvalid, catsInvalid]);


  React.useEffect(() => {
    if (!open) return;
    if (!expense) {
      setAmount('');
      setName('');
      setCategoryIds([]);
      return;
    }

    setAmount(expense.amount != null ? String(expense.amount) : '');
    const preferredName = expense.invoice_description || expense.supplier_name || '';
    setName(preferredName);
    setCategoryIds(normalizeCategoryIds(expense));
    setAttemptedSubmit(false);
    setTouched({});
    setServerError(null);
  }, [open, expense]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttemptedSubmit(true);
 if (amountInvalid || nameInvalid || catsInvalid || !expense) return;

 try {
      setSubmitting(true);
      setServerError(null);

      const payload = {
        supplier_name: name.trim(),
        invoice_description: name.trim(),
        amount: Number(amount),
        categories: categoryIds.map(String),
        status: expense.status,
        program_id: expense.program_id,
        date: expense.date,
      };

      if (isMockMode()) {
        await new Promise(resolve => setTimeout(resolve, 600));
        const mock: Expense = {
          ...expense,
          ...payload,
        };
        onSuccess(mock);
        onClose();
        return;
      }

      const response = await expensesApi.patch(`${expense.id}`, payload);
      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Update petty cash expense failed', err);
      setServerError('שמירת קופה קטנה נכשלה. נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !expense) return null;


  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overscroll-contain" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-lg font-semibold text-gray-900">עריכת קופה קטנה</h3>
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
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, amount: true }))}
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
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
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
                onChange={(ids) => setCategoryIds(ids)}
                error={(attemptedSubmit || touched.categoryIds) && catsInvalid}
              />
              {(attemptedSubmit || touched.categoryIds) && catsInvalid && (
                <p className="text-sm text-red-600 mt-1">יש לבחור לפחות קטגוריה אחת</p>
              )}
            </div>

            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
                {serverError}
              </div>
            )}

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
