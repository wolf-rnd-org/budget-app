import React from 'react';
import { ArrowLeft, Save, X } from 'lucide-react';
import { budgetApi, isMockMode } from '@/api/http';
import { useAuthStore } from '@/stores/authStore';
import type { ParsedInvoiceData } from './AddExpenseWizard';
import { CategoriesField } from './CategoriesField';

interface AdditionalDetailsStepProps {
  parsedData: ParsedInvoiceData;
  onBack: () => void;
  onSuccess: (expense: any) => void;
  onCancel: () => void;
}

export default function AdditionalDetailsStep({ parsedData, onBack, onSuccess, onCancel }: AdditionalDetailsStepProps) {
  const { user } = useAuthStore();
  const programs = useAuthStore(s => s.programs);
  const programsLoading = useAuthStore(s => s.programsLoading);
  const currentProgramId = useAuthStore(s => s.currentProgramId);

  const [programId, setProgramId] = React.useState<string>("");
  const [categories, setCategories] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);

  React.useEffect(() => {
    if (programId) return;
    const auto = currentProgramId || (programs.length === 1 ? programs[0].id : '');
    if (auto && auto !== programId) {
      setProgramId(auto);
    }
  }, [programs, currentProgramId]);

  const handleSubmit = async () => {
    setAttemptedSubmit(true);
    if (!user?.userId) {
      setError('שגיאה במשתמש - נסו להתחבר שוב');
      return;
    }
    if (categories.length === 0) {
      setError('נא לבחור לפחות קטגוריה אחת');
      return;
    }

    try {
      setLoading(true);
      setError(null);

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

      const response = await budgetApi.post('/expenses', expenseData);
      onSuccess(response.data);
    } catch (err) {
      setError('שמירה נכשלה. נסו שוב.');
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תכנית</label>
                <div className="relative">
                  <select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                    className={`w-full px-4 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white [appearance:auto] ${
                      attemptedSubmit && !programId ? 'border-red-500' : 'border-gray-300'
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריות</label>
                <CategoriesField
                  program_id={programId}
                  selectedCategories={categories}
                  onChange={setCategories}
                  error={attemptedSubmit && categories.length === 0}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="m-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-red-700">{error}</span>
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
                disabled={loading}
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
