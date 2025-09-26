import React, { useMemo, useState, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { CategoryOption, SalaryPayload } from './types';
import { CategoriesField } from '../AddExpense/CategoriesField';

type Props = {
  open: boolean;
  categories?: CategoryOption[];
  onClose: () => void;
  onSubmit: (payload: SalaryPayload) => Promise<void> | void;
};

export default function SalaryDialog({ open, categories = [], onClose, onSubmit }: Props) {
  const [payee, setPayee] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [month, setMonth] = useState('');
  const [isGross, setIsGross] = useState(false);
  const [rate, setRate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formTopRef = useRef<HTMLDivElement | null>(null);
  const autoAmount = useMemo(() => {
    const r = Number(rate);
    const q = Number(quantity);
    if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(q) || q <= 0) return 0;
    return +(r * q).toFixed(2);
  }, [rate, quantity]);

  // const previewEmployerCost = useMemo(() => {
  //   if (!autoAmount) return 0;
  //   return isGross ? autoAmount * 1.151 : (autoAmount / 0.8783) * 1.151;
  // }, [autoAmount, isGross]);

  const computeErrors = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!payee.trim()) next.payee = 'חובה להזין שם מקבל התשלום';
    if (!idNumber.trim()) next.idNumber = 'חובה להזין תעודת זהות';
    if (!month.trim()) next.month = 'חובה לבחור חודש דיווח';
    const r = Number(rate); if (!rate || !Number.isFinite(r) || r <= 0) next.rate = 'תעריף חייב להיות גדול מ-0';
    const q = Number(quantity); if (!quantity || !Number.isFinite(q) || q <= 0) next.quantity = 'כמות חייבת להיות גדולה מ-0';
    if (categoryIds.length === 0) next.categoryIds = 'יש לבחור לפחות קטגוריה אחת';
    return next;
  };

  const canSubmit = useMemo(() => {
    return !submitting && Object.keys(computeErrors()).length === 0 && autoAmount > 0;
  }, [submitting, payee, idNumber, month, rate, quantity, categoryIds, autoAmount]);

  const reset = () => {
    setPayee(''); setIdNumber(''); setMonth(''); setIsGross(false);
    setRate(''); setQuantity('1'); setCategoryIds([]); setErrors({}); setAttemptedSubmit(false);
  };

  const handleClose = () => { if (!submitting) onClose(); };

  const clearSubmitError = () => {
    setErrors((prev) => {
      if (!prev.submit) return prev;
      const { submit, ...rest } = prev;
      return rest;
    });
  };

  const validate = (): boolean => {
    const next = computeErrors();
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    clearSubmitError();
    if (!validate()) return;
    const payload: SalaryPayload = {
      type: 'salary',
      payee: payee.trim(),
      is_gross: isGross,
      rate: Number(rate),
      quantity: Number(quantity),
      amount: autoAmount,              // תמיד החישוב האוטומטי
      categoryIds,
      idNumber: idNumber.trim(),
      month: month.trim(),
    };
    try {
      setSubmitting(true);
      const res: any = await onSubmit(payload);
      if (res && res.ok === false) {
        throw new Error(res.error || 'שמירה נכשלה, נסו שוב.');
      }
      reset();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to submit salary expense', err);
      // תמיד הודעה כללית בעברית – לא מציגים פרטי שגיאה באנגלית
      setErrors((prev) => ({ ...prev, submit: 'שמירה נכשלה. נסו שוב.' }));
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overscroll-contain" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-lg font-semibold text-gray-900">דיווח שכר</h3>
          <button onClick={handleClose} className="p-2 hover:bg-white/60 rounded-lg transition-colors" aria-label="סגור">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {/* Compact note */}
        <p className="px-6 py-2 text-xs md:text-sm text-amber-800 bg-amber-50 border-b border-amber-200">
          יש לשלוח טופס 101 למדור שכר
        </p>
        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-6">
          <div ref={formTopRef} />
          {/* באנר שגיאת שמירה */}
          {errors.submit && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <div className="text-sm leading-6">
                <div className="font-semibold text-red-800">שמירה נכשלה. נסו שוב.</div>
                {/* אם ההודעה שונה מהכותרת, הצג פירוט */}
                {errors.submit !== 'שמירה נכשלה. נסו שוב.' && (
                  <div className="text-red-700 mt-1">{errors.submit}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrors(({ submit, ...rest }) => rest)}
                className="ms-auto text-red-700 hover:text-red-900 underline underline-offset-2"
                aria-label="הסתר שגיאה"
              >
                הבנתי
              </button>
            </div>
          )}          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Payee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">מקבל התשלום <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={payee}
                onChange={(e) => { setPayee(e.target.value); if (attemptedSubmit) validate(); }}
                required
                aria-invalid={!!errors.payee}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.payee ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.payee && <p className="text-xs text-red-600 mt-1">{errors.payee}</p>}
            </div>

            {/* ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">תעודת זהות <span className="text-red-500">*</span></label>
              <input
                type="text"
                inputMode="numeric"
                value={idNumber}
                onChange={(e) => { setIdNumber(e.target.value); if (attemptedSubmit) validate(); }}
                required
                aria-invalid={!!errors.idNumber}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.idNumber ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.idNumber && <p className="text-xs text-red-600 mt-1">{errors.idNumber}</p>}
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">חודש דיווח <span className="text-red-500">*</span></label>
              <input
                type="month"
                value={month}
                onChange={(e) => { setMonth(e.target.value); if (attemptedSubmit) validate(); }}
                required
                dir="ltr"
                aria-invalid={!!errors.month}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.month ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.month && <p className="text-xs text-red-600 mt-1">{errors.month}</p>}
            </div>

            {/* Gross/Net */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">סוג שכר</label>
              <div className="flex items-center gap-6 h-[48px]">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="salaryType" checked={!isGross} onChange={() => setIsGross(false)} />
                  <span className="text-sm text-gray-700">נטו</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="salaryType" checked={isGross} onChange={() => setIsGross(true)} />
                  <span className="text-sm text-gray-700">ברוטו</span>
                </label>
              </div>
            </div>

            {/* Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">תעריף <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={rate}
                onChange={(e) => { setRate(e.target.value); if (attemptedSubmit) validate(); }}
                required
                min={0.01}
                step="0.01"
                aria-invalid={!!errors.rate}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.rate ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.rate && <p className="text-xs text-red-600 mt-1">{errors.rate}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">כמות <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value); if (attemptedSubmit) validate(); }}
                required
                min={1}
                step="1"
                aria-invalid={!!errors.quantity}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.quantity ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                קטגוריות <span className="text-red-500">*</span>
              </label>

              <CategoriesField
                selectedCategories={categoryIds}
                onChange={(ids) => {
                  if (attemptedSubmit) validate();
                  setCategoryIds(ids);
                }}
                error={attemptedSubmit && categoryIds.length === 0}
              />

              {attemptedSubmit && categoryIds.length === 0 && (
                <p className="text-xs text-red-600 mt-1">יש לבחור לפחות קטגוריה אחת</p>
              )}
            </div>
          </div>
          {/* Summary card */}
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-gray-600 text-sm" dir="rtl">
              <span className="inline-flex items-center gap-1.5">
                {/* <span className="text-xs text-gray-500">תצוגה מקדימה</span> */}
                {/* <span className="h-1 w-1 rounded-full bg-gray-300" /> */}
                <span className="font-medium text-gray-700">סכום:</span>
                <span className="tabular-nums">{autoAmount ? autoAmount.toFixed(2) : '-'}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 md:pl-3 md:border-r md:border-gray-200">
                <span className="text-xs text-gray-500">חישוב לפי</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="tabular-nums">
                  {Number(rate) > 0 && Number(quantity) > 0
                    ? `${Number(rate).toFixed(2)} × ${Number(quantity)}`
                    : 'תעריף וכמות'}
                </span>
              </span>
            </div>

          </div>
        </form>

        {/* Footer (sticky) */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-all"
          >
            ביטול
          </button>
          <button
            formAction="submit"
            onClick={(e) => e.preventDefault()}
            className="hidden" // block submit via button below
          />
          <button
            onClick={(e) => {
              // מעביר submit לטופס
              (e.currentTarget.closest('div')?.previousElementSibling as HTMLFormElement)?.requestSubmit();
            }}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-7 py-2.5 rounded-xl font-medium transition-all"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                שומר…
              </>
            ) : (
              <>שמירה</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
