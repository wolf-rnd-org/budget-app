import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { Expense } from '@/api/types';
import { expensesApi, isMockMode } from '@/api/http';
import type { CategoryOption } from './types';
import { CategoriesField } from '../AddExpense/CategoriesField';

type EditSalaryDialogProps = {
    open: boolean;
    expense: Expense | null;
    categories?: CategoryOption[];
    onClose: () => void;
    onSuccess: (updated: Expense) => void;
};
const EMPLOYER_COST_MULTIPLIER = 1.151; // עלות מעביד יחסית לברוטו
const NET_TO_GROSS_FACTOR = 0.8783;     // נטו ≈ 87.83% מהברוטו

function computeEmployerCost(amount: number, isGross: boolean): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const gross = isGross ? amount : amount / NET_TO_GROSS_FACTOR;
    return +(gross * EMPLOYER_COST_MULTIPLIER).toFixed(2);
}
/** מזהה קטגוריות כ-array של מחרוזות מכל פורמט אפשרי */
const normalizeCategoryIds = (expense: Expense | null): string[] => {
    if (!expense) return [];
    const cats = (expense as any).categories;
    if (!cats) return [];
    if (Array.isArray(cats)) {
        return cats.map((c) =>
            typeof c === 'string'
                ? String(c)
                : String(c?.id ?? c?.recId ?? c?.recordId ?? c?.value ?? '')
        ).filter(Boolean);
    }
    if (typeof cats === 'string') return [cats];
    return [];
};

/** קורא ערכים מתוך meta או מתוך שדות-שורש, בצורה בטוחה */
const pickMetaNumber = (expense: Expense | null, key: string): number | null => {
    if (!expense) return null;
    const meta = (expense as any).meta || {};
    const root = (expense as any);
    const raw = meta[key] ?? root[key];
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
};
const pickMetaBoolean = (expense: Expense | null, key: string): boolean | null => {
    if (!expense) return null;
    const meta = (expense as any).meta || {};
    const root = (expense as any);
    const raw = meta[key] ?? root[key];
    return typeof raw === 'boolean' ? raw : null;
};
const pickString = (obj: any, ...keys: string[]): string => {
    for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
};

export default function EditSalaryDialog({
    open,
    expense,
    categories = [],
    onClose,
    onSuccess,
}: EditSalaryDialogProps) {
    // --- state ---
    const [payee, setPayee] = React.useState<string>('');
    const [idNumber, setIdNumber] = React.useState<string>('');
    const [month, setMonth] = React.useState<string>(''); // YYYY-MM
    const [isGross, setIsGross] = React.useState<boolean>(false);
    const [rate, setRate] = React.useState<string>(''); // string כדי לשמור על controlled
    const [quantity, setQuantity] = React.useState<string>('1');
    const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
    const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [serverError, setServerError] = React.useState<string | null>(null);

    // --- derived ---
    const rateNum = React.useMemo(() => Number(rate), [rate]);
    const qtyNum = React.useMemo(() => Number(quantity), [quantity]);

    const autoAmount = React.useMemo(() => {
        if (!Number.isFinite(rateNum) || rateNum <= 0) return 0;
        if (!Number.isFinite(qtyNum) || qtyNum <= 0) return 0;
        return +(rateNum * qtyNum).toFixed(2);
    }, [rateNum, qtyNum]);
    const employerCost = React.useMemo(() => {
        return computeEmployerCost(autoAmount, isGross);
    }, [autoAmount, isGross]);
    const errors = React.useMemo(() => {
        const e: Record<string, string> = {};
        if (!payee.trim()) e.payee = 'חובה להזין שם מקבל התשלום';
        if (!idNumber.trim()) e.idNumber = 'חובה להזין תעודת זהות';
        if (!month.trim()) e.month = 'חובה לבחור חודש דיווח';
        if (!rate || !Number.isFinite(rateNum) || rateNum <= 0) e.rate = 'תעריף חייב להיות גדול מ-0';
        if (!quantity || !Number.isFinite(qtyNum) || qtyNum <= 0) e.quantity = 'כמות חייבת להיות גדולה מ-0';
        if (categoryIds.length === 0) e.categoryIds = 'יש לבחור לפחות קטגוריה אחת';
        if (autoAmount <= 0) e.amount = 'סכום חייב להיות גדול מ-0';
        return e;
    }, [payee, idNumber, month, rate, rateNum, quantity, qtyNum, categoryIds, autoAmount]);

    const canSubmit = React.useMemo(
        () => !submitting && Object.keys(errors).length === 0,
        [submitting, errors]
    );
    const pickGrossFlag = (e: any): boolean => {
        const v = e?.fields?.is_gross ?? e?.meta?.is_gross ?? e?.is_gross;
        if (typeof v === 'boolean') return v;                    // true/false
        if (typeof v === 'string') return v.toLowerCase() === 'gross'; // 'gross' → true
        return false; // ברירת מחדל: נטו
    };
    // --- hydrate when open/expense change ---
    React.useEffect(() => {
        if (!open || !expense) return;

        const initialPayee =
            pickString(expense, 'supplier_name', 'payee') ||
            pickString(expense, 'invoice_description');

        const initialId =
            pickString(expense, 'idNumber', 'id_number') ||
            pickString((expense as any).meta, 'idNumber', 'id_number');

        const initialMonth =
            pickString(expense, 'month') ||
            pickString((expense as any).meta, 'month');

        const initRate = pickMetaNumber(expense, 'rate');
        const initQty = pickMetaNumber(expense, 'quantity') ?? 1;

        setPayee(initialPayee);
        setIdNumber(initialId);
        setMonth(initialMonth);
        setIsGross(pickGrossFlag(expense));
        setRate(initRate != null ? String(initRate) : '');
        setQuantity(initQty != null ? String(initQty) : '1');
        setCategoryIds(normalizeCategoryIds(expense));
        setAttemptedSubmit(false);
        setServerError(null);
    }, [open, expense]);

    const handleClose = () => {
        if (submitting) return;
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAttemptedSubmit(true);
        setServerError(null);
        if (!expense) return;
        if (!canSubmit) return;

        // בונים payload לעריכת "דיווח שכר"
        const payload: any = {
            supplier_name: payee.trim(),
            invoice_description: payee.trim(),
            amount: autoAmount,
            quantity: Number(quantity),
            rate: Number(rate),
            is_gross: isGross,
            status: (expense as any).status,
            date: (expense as any).date,
            categories: categoryIds.map(String),
            id_number: idNumber.trim(),
            month: month.trim(),
            meta: {
                ...(expense as any).meta,
                is_gross: isGross,
                rate: Number(rate),
                quantity: Number(quantity),
                id_number: idNumber.trim(),
                month: month.trim(),
            },
        };

        try {
            setSubmitting(true);

            if (isMockMode()) {
                await new Promise((r) => setTimeout(r, 600));
                const mock: Expense = { ...expense, ...payload };
                onSuccess(mock);
                onClose();
                return;
            }

            const res = await expensesApi.patch(`/${expense.id}`, payload, {
                headers: { 'Content-Type': 'application/json' },
            });
            const updated = res.data?.fields ? { id: res.data.id, ...res.data.fields } : res.data;
            onSuccess(updated);
            onClose();
        } catch (err) {
            console.error('Update salary expense failed', err);
            // הודעה כללית בלבד בעברית
            setServerError('שמירת דיווח שכר נכשלה. נסו שוב.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!open || !expense) return null;

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overscroll-contain" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-lg font-semibold text-gray-900">עריכת דיווח שכר</h3>
                    <button onClick={handleClose} className="p-2 hover:bg-white/60 rounded-lg transition-colors" aria-label="סגור">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* הערת מידע קומפקטית */}
                <p className="px-6 py-2 text-xs md:text-sm text-amber-800 bg-amber-50 border-b border-amber-200">
                    יש לשלוח טופס 101 למדור שכר
                </p>

                {/* Body */}
                <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-6">
                    {/* באנר שגיאה כללי מהשרת */}
                    {serverError && (
                        <div role="alert" aria-live="assertive" className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
                            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                            <div className="text-sm leading-6">
                                <div className="font-semibold text-red-800">שמירה נכשלה. נסו שוב.</div>
                                <div className="text-red-700 mt-1">{serverError}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setServerError(null)}
                                className="ms-auto text-red-700 hover:text-red-900 underline underline-offset-2"
                                aria-label="הסתר שגיאה"
                            >
                                הבנתי
                            </button>
                        </div>
                    )}

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Payee */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                מקבל התשלום <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={payee}
                                onChange={(e) => setPayee(e.target.value)}
                                required
                                aria-invalid={Boolean(attemptedSubmit && errors.payee)}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.payee ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {attemptedSubmit && errors.payee && <p className="text-xs text-red-600 mt-1">{errors.payee}</p>}
                        </div>

                        {/* ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                תעודת זהות <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={idNumber}
                                onChange={(e) => setIdNumber(e.target.value)}
                                required
                                aria-invalid={Boolean(attemptedSubmit && errors.idNumber)}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.idNumber ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {attemptedSubmit && errors.idNumber && <p className="text-xs text-red-600 mt-1">{errors.idNumber}</p>}
                        </div>

                        {/* Month */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                חודש דיווח <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                required
                                dir="ltr"
                                aria-invalid={Boolean(attemptedSubmit && errors.month)}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.month ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {attemptedSubmit && errors.month && <p className="text-xs text-red-600 mt-1">{errors.month}</p>}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                תעריף <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                required
                                min={0.01}
                                step="0.01"
                                aria-invalid={Boolean(attemptedSubmit && errors.rate)}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.rate ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {attemptedSubmit && errors.rate && <p className="text-xs text-red-600 mt-1">{errors.rate}</p>}
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                כמות <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                                min={1}
                                step="1"
                                aria-invalid={Boolean(attemptedSubmit && errors.quantity)}
                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedSubmit && errors.quantity ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {attemptedSubmit && errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
                        </div>

                        {/* Categories (multi) */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                קטגוריות <span className="text-red-500">*</span>
                            </label>
                            <CategoriesField
                                selectedCategories={categoryIds}
                                onChange={(ids) => setCategoryIds(ids)}
                                error={attemptedSubmit && categoryIds.length === 0}
                            />
                            {attemptedSubmit && categoryIds.length === 0 && (
                                <p className="text-xs text-red-600 mt-1">יש לבחור לפחות קטגוריה אחת</p>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    {/* Summary */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2">
                        <div className="flex flex-col gap-2 text-gray-600 text-sm" dir="rtl">
                            {/* שורה 1: סכום + חישוב לפי */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-gray-700">סכום:</span>
                                <span className="tabular-nums">{autoAmount ? autoAmount.toFixed(2) : '-'}</span>
                                {/* <span className="text-xs text-gray-500">({isGross ? 'ברוטו' : 'נטו'})</span> */}
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
                            {/* שורה 2: ירד מהתקציב */}
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">ירד מהתקציב (עלות מעביד):</span>
                                <span className="tabular-nums">{employerCost ? employerCost.toFixed(2) : '-'}</span>
                            </div>
                        </div>
                        {/* נוסחה קצרה להסבר (אופציונלי) */}
                        <div className="mt-1 text-xs text-gray-500">
                            {isGross
                                ? `ברוטו × ${EMPLOYER_COST_MULTIPLIER}`
                                : `נטו ÷ ${NET_TO_GROSS_FACTOR} × ${EMPLOYER_COST_MULTIPLIER}`}
                        </div>
                    </div>                </form>

                {/* Footer */}
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
                        onClick={(e) => {
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
