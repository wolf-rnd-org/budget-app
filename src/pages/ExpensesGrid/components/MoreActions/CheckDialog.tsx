import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { CategoryOption, CheckPayload } from './types';

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

type Props = {
  open: boolean;
  categories?: CategoryOption[];
  onClose: () => void;
  onSubmit: (payload: CheckPayload) => Promise<void> | void;
};

export default function CheckDialog({ open, categories = [], onClose, onSubmit }: Props) {
  const [payee, setPayee] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(todayISO());
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const computeErrors = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!payee.trim()) next.payee = 'חובה להזין שם מקבל התשלום';
    if (!checkNumber.trim()) next.checkNumber = 'חובה להזין מספר צ׳ק';
    if (!issueDate) next.issueDate = 'חובה להזין תאריך הנפקה';
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) next.amount = 'חובה להזין סכום תקין';
    if (!categoryId) next.categoryId = 'חובה לבחור קטגוריה';
    return next;
  };

  const canSubmit = useMemo(() => {
    return !submitting && Object.keys(computeErrors()).length === 0;
  }, [submitting, payee, checkNumber, issueDate, amount, categoryId]);

  const reset = () => {
    setPayee('');
    setCheckNumber('');
    setIssueDate(todayISO());
    setAmount('');
    setCategoryId('');
    setMemo('');
    setErrors({});
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const validate = (): boolean => {
    const next = computeErrors();
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!validate()) return;
    const payload: CheckPayload = {
      type: 'check',
      payee: payee.trim(),
      checkNumber: checkNumber.trim(),
      issueDate,
      amount: Number(amount),
      categoryId: categoryId || null,
      memo: memo.trim() || undefined,
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
          <h3 className="text-lg font-semibold text-gray-900">צ׳ק</h3>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="סגור">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] overscroll-contain">
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">מקבל התשלום <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={payee}
                onChange={(e) => { setPayee(e.target.value); if (attemptedSubmit) validate(); }}
                required
                aria-invalid={Boolean(errors.payee)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.payee ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.payee && <p className="text-sm text-red-600 mt-1">{errors.payee}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">מספר צ׳ק <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={checkNumber}
                onChange={(e) => { setCheckNumber(e.target.value); if (attemptedSubmit) validate(); }}
                required
                aria-invalid={Boolean(errors.checkNumber)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.checkNumber ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.checkNumber && <p className="text-sm text-red-600 mt-1">{errors.checkNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">תאריך הנפקה <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => { setIssueDate(e.target.value); if (attemptedSubmit) validate(); }}
                required
                aria-invalid={Boolean(errors.issueDate)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.issueDate ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.issueDate && <p className="text-sm text-red-600 mt-1">{errors.issueDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">סכום <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); if (attemptedSubmit) validate(); }}
                required
                min={0}
                step="0.01"
                aria-invalid={Boolean(errors.amount)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.amount ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריה <span className="text-red-500">*</span></label>
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); if (attemptedSubmit) validate(); }}
                required
                aria-invalid={Boolean(errors.categoryId)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white [appearance:auto] ${attemptedSubmit && errors.categoryId ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="" disabled>בחר קטגוריה</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="text-sm text-red-600 mt-1">{errors.categoryId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">מזכר / הערות (אופציונלי)</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
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
