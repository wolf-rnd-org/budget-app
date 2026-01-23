import React from 'react';
import axios from 'axios';
import { ArrowLeft, Save, X } from 'lucide-react';
import { expensesApi, isMockMode, getFundingSources, type FundingSourceDTO } from '@/api/http';
import { useAuthStore } from '@/stores/authStore';
import { useProgramsStore } from '@/stores/programsStore';
import type { ParsedInvoiceData } from './AddExpenseWizard';
import { CategoriesField } from './CategoriesField';

interface AdditionalDetailsStepProps {
  parsedData: ParsedInvoiceData;
  initialInvoiceFile?: File;
  initialBankFile?: File;
  totalBudget: number;
  totalExpenses: number;
  onBack: () => void;
  onSuccess: (expense: any) => void;
  onCancel: () => void;
  onTimeoutRefresh?: () => Promise<void> | void;
}

export default function AdditionalDetailsStep({ parsedData, initialInvoiceFile, initialBankFile, totalBudget, totalExpenses, onBack, onSuccess, onCancel, onTimeoutRefresh }: AdditionalDetailsStepProps) {
  const { user } = useAuthStore();
  const programs = useProgramsStore(s => s.programs);
  const programsLoading = useProgramsStore(s => s.loading);
  const currentProgramId = useProgramsStore(s => s.selectedProgramId);

  const [programId, setProgramId] = React.useState<string>("");
  const [categories, setCategories] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);
  const [fundingSourceId, setFundingSourceId] = React.useState("");
  const [fundingSources, setFundingSources] = React.useState<FundingSourceDTO[]>([]);
  const [fundingSourcesLoading, setFundingSourcesLoading] = React.useState(false);
  const [fundingSourcesError, setFundingSourcesError] = React.useState<string | null>(null);

  const overLimitWithNew = React.useMemo(() => {
    if (!totalBudget || totalBudget <= 0) return false;
    const amount = Number(parsedData.amount) || 0;
    return totalExpenses + amount > totalBudget * 1.05;
  }, [totalBudget, totalExpenses, parsedData.amount]);

  React.useEffect(() => {
    if (programId) return;
    const auto = currentProgramId || (programs.length === 1 ? programs[0].id : '');
    if (auto && auto !== programId) {
      setProgramId(auto);
    }
  }, [programs, currentProgramId]);
  React.useEffect(() => {
    (async () => {
      try {
        setFundingSourcesLoading(true);
        setFundingSourcesError(null);
        const list = await getFundingSources(); // לפי השנה הנוכחית
        setFundingSources(list);
        if (!list.some(fs => fs.id === fundingSourceId)) {
          setFundingSourceId('');
        }
      } catch (e) {
        console.error('Load funding sources failed', e);
        setFundingSources([]);
        setFundingSourcesError('נכשלה טעינת מקורות המימון');
        setFundingSourceId('');
      } finally {
        setFundingSourcesLoading(false);
      }
    })();
  }, [programId]);

  const handleSubmit = async () => {
    if (loading) return;
    setAttemptedSubmit(true);
    if (!user?.userId) {
      setError('שגיאה במשתמש - נסו להתחבר שוב');
      return;
    }
    if (categories.length === 0) {
      setError('נא לבחור לפחות קטגוריה אחת');
      return;
    }
    if (!fundingSourceId) {
      setError('יש לבחור על שם מי הקבלה');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      if (overLimitWithNew) {
        setError('חריגה של יותר מ‑5% מהתקציב. לא ניתן ליצור הוצאה. להוספת תקציב חריגה יש לקבל אישור מיוחד ממרים קופשיץ');
        setLoading(false);
        return;
      }
      const expenseData = {
        // From AI (steps 1-2)
        supplier_name: parsedData.supplier_name,
        business_number: parsedData.business_number,
        invoice_type: parsedData.invoice_type,
        invoice_description: parsedData.invoice_description,
        amount: parsedData.amount,
        project: parsedData.project,
        supplier_email: parsedData.supplier_email,
        bank_name: parsedData.bank_name,
        bank_branch: parsedData.bank_branch,
        bank_account: parsedData.bank_account,
        beneficiary: parsedData.beneficiary,

        // From this step
        program_id: programId,
        categories,
        funding_source_id: fundingSourceId,

        // System
        user_id: user.userId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        bank_details_file: parsedData.bank_details_file || '',
      };

      if (isMockMode()) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockExpense = { id: `exp_${Date.now()}`, ...expenseData };
        onSuccess(mockExpense);
        return;
      }
      if (initialInvoiceFile || initialBankFile) {
        const form = new FormData();
        Object.entries(expenseData).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            v.forEach(val => form.append(k, String(val)));
          } else {
            form.append(k, String(v));
          }
        });

        if (initialInvoiceFile) form.append('invoice_file', initialInvoiceFile);
        if (initialBankFile) form.append('bank_details_file', initialBankFile);

        const response = await expensesApi.post('/', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        });
        onSuccess(response.data);
      }
    } catch (err) {
      const isTimeout = axios.isAxiosError(err)
        && (err.code === 'ECONNABORTED'
          || (typeof err.message === 'string' && err.message.toLowerCase().includes('timeout')));
      if (isTimeout) {
        setError('\u05d4\u05d4\u05d5\u05e6\u05d0\u05d4 \u05e0\u05e9\u05de\u05e8\u05d4, \u05de\u05d7\u05db\u05d9\u05dd \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8\u2026 \u05e0\u05d8\u05e2\u05df \u05de\u05d7\u05d3\u05e9');
        try {
          await onTimeoutRefresh?.();
        } catch (refreshError) {
          console.error('Refresh after timeout failed:', refreshError);
        }
        return;
      }
      setError('\u05e9\u05de\u05d9\u05e8\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4. \u05e0\u05e1\u05d5 \u05e9\u05d5\u05d1.');
      console.error('Create expense error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Program & Categories */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">פרטים נוספים</h4>

            <div className="grid grid-cols-1 gap-6">
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תכנית</label>
                <div className="relative">
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className={`w-full px-4 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white [appearance:auto] ${attemptedSubmit && !programId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    required
                    disabled={programsLoading || programs.length === 0}
                  >
                    <option value="" disabled>
                      {programsLoading ? 'טוען תכניות…' : (programs.length ? 'בחרו תכנית' : 'לא נמצאו תכניות זמינות')}
                    </option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריות</label>
                <CategoriesField
                  selectedCategories={categories}
                  onChange={setCategories}
                  programId={programId || currentProgramId || ''}
                  error={attemptedSubmit && categories.length === 0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">קבלה על שם</label>
                <select
                  value={fundingSourceId}
                  onChange={(e) => setFundingSourceId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  disabled={fundingSourcesLoading || fundingSources.length === 0 || !programId}
                  required
                >
                  <option value="" disabled>
                    {!programId
                      ? "בחרי תחילה תכנית"
                      : fundingSourcesLoading
                        ? "טוען... "
                        : (fundingSources.length ? "בחרי על שם מי הקבלה" : "לא נמצאו")}
                  </option>
                  {fundingSources.map(fs => (
                    <option key={fs.id} value={fs.id}>{fs.name}</option>
                  ))}
                </select>
                {fundingSourcesError && (
                  <p className="text-sm text-red-600 mt-2">{fundingSourcesError}</p>
                )}
              </div>

            </div>
          </div>

          {(error || overLimitWithNew) && (
            <div className="m-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <span className="text-red-800 font-semibold">
                {error || 'חריגה של יותר מ‑5% מהתקציב. לא ניתן ליצור הוצאה.'}
              </span>
            </div>
          )}

          {/* Action Bar */}
          <div className="p-6 flex items-center justify-between">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              חזרה
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition-all"
              >
                <X className="w-4 h-4" />
                ביטול
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading || overLimitWithNew}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all min-w-[160px] justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    שומר…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    שמור
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


