import React, { useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { ExpectedExpensePayload } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ExpectedExpensePayload) => Promise<void> | void;
};

export default function ExpectedExpenseDialog({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amountNum = useMemo(() => Number(amount), [amount]);
  const amountInvalid = useMemo(
    () => !amount || Number.isNaN(amountNum) || amountNum <= 0,
    [amount, amountNum]
  );
  const nameInvalid = useMemo(() => name.trim().length === 0, [name]);
  const canSubmit = useMemo(
    () => !submitting && !amountInvalid && !nameInvalid,
    [amountInvalid, nameInvalid, submitting]
  );

  const reset = () => {
    setName('');
    setAmount('');
    setTouched({});
    setAttemptedSubmit(false);
    setSubmitError(null);
  };

  const handleClose = () => {
    if (!submitting) {
      setSubmitError(null);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setSubmitError(null);

    if (amountInvalid || nameInvalid) return;

    const payload: ExpectedExpensePayload = {
      type: 'expected',
      name: name.trim(),
      amount: Number(amount),
    };

    try {
      setSubmitting(true);
      await onSubmit(payload);
      reset();
      onClose();
    } catch (err) {
      console.error('Expected expense save failed:', err);
      setSubmitError('שמירת הוצאה צפויה נכשלה. נסו שוב או בדקו את החיבור.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overscroll-contain"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <h3 className="text-lg font-semibold text-gray-900">הוצאה צפויה</h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="סגירה"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] overscroll-contain">
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 gap-4">
            {submitError && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                <div className="text-sm leading-6">
                  <div className="font-semibold text-red-800">{submitError}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="ms-auto text-red-700 hover:text-red-900 underline underline-offset-2"
                  aria-label="סגור הודעת שגיאה"
                >
                  סגור
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם ההוצאה <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                  (attemptedSubmit || touched.name) && nameInvalid ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-invalid={Boolean((attemptedSubmit || touched.name) && nameInvalid)}
                required
              />
              {(attemptedSubmit || touched.name) && nameInvalid && (
                <p className="text-sm text-red-600 mt-1">יש למלא שם להוצאה הצפויה.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סכום צפוי <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, amount: true }))}
                min={0}
                step="0.01"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                  (attemptedSubmit || touched.amount) && amountInvalid ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-invalid={Boolean((attemptedSubmit || touched.amount) && amountInvalid)}
                required
              />
              {(attemptedSubmit || touched.amount) && amountInvalid && (
                <p className="text-sm text-red-600 mt-1">יש להזין סכום גדול מאפס.</p>
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
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all min-w-[140px] justify-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    שומר...
                  </>
                ) : (
                  <>שמור</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
