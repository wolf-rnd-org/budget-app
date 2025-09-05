import React from 'react';
import { ArrowLeft, Save, X, Upload, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { budgetApi, isMockMode } from '@/api/http';
import { useAuthStore } from '@/stores/authStore';
import { ParsedInvoiceData } from './AddExpenseWizard';
import { CategoriesField } from './CategoriesField';

interface ExpenseReviewStepProps {
  parsedData: ParsedInvoiceData;
  onBack: () => void;
  onSuccess: (expense: any) => void;
  onCancel: () => void;
}

export function ExpenseReviewStep({ parsedData, onBack, onSuccess, onCancel }: ExpenseReviewStepProps) {
  const { user } = useAuthStore();
  const [formData, setFormData] = React.useState({
    supplier_name: parsedData.supplier_name,
    business_number: parsedData.business_number,
    invoice_type: parsedData.invoice_type,
    invoice_description: parsedData.invoice_description,
    amount: parsedData.amount,
    project: parsedData.project,
    supplier_email: parsedData.supplier_email,
    categories: [] as string[],
    bank_name: parsedData.bank_name ?? "",
    bank_branch: parsedData.bank_branch ?? "",
    bank_account: parsedData.bank_account ?? "",
    beneficiary: parsedData.beneficiary ?? "",
  });
  const [bankFile, setBankFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBankUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('קובץ פרטי הבנק גדול מדי (מקסימום 10MB)');
        return;
      }
      setBankFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!user?.userId) {
      setError('שגיאת אימות - אנא התחבר מחדש');
      return;
    }

    if (formData.categories.length === 0) {
      setError('יש לבחור לפחות קטגוריה אחת');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const expenseData = {
        ...formData,
        user_id: user.userId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        bank_details_file: parsedData.bank_details_file || (bankFile ? 'uploaded-bank-file' : ''),
      };

      if (isMockMode()) {
        // Mock success response
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockExpense = {
          id: `exp_${Date.now()}`,
          ...expenseData,
        };
        onSuccess(mockExpense);
        return;
      }

      // Real API call
      const response = await budgetApi.post('/budget/expenses', expenseData);
      onSuccess(response.data);
    } catch (err) {
      setError('שגיאה ביצירת ההוצאה. אנא נסה שוב.');
      console.error('Create expense error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">סקירה ויצירת הוצאה</h3>
          <p className="text-gray-600">בדוק ועדכן את הפרטים לפני יצירת ההוצאה</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Basic Details Section */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">פרטי הוצאה</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שם ספק</label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מספר עסק</label>
                <input
                  type="text"
                  value={formData.business_number}
                  onChange={(e) => handleInputChange('business_number', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סוג חשבונית</label>
                <select
                  value={formData.invoice_type}
                  onChange={(e) => handleInputChange('invoice_type', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="חשבונית מס">חשבונית מס</option>
                  <option value="חשבון עסקה">חשבון עסקה</option>
                  <option value="קבלה">קבלה</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סכום</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">פרויקט</label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) => handleInputChange('project', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">תיאור החשבונית</label>
                <textarea
                  value={formData.invoice_description}
                  onChange={(e) => handleInputChange('invoice_description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אימייל ספק</label>
                <input
                  type="email"
                  value={formData.supplier_email}
                  onChange={(e) => handleInputChange('supplier_email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">קטגוריות</h4>
            <CategoriesField
              selectedCategories={formData.categories}
              onChange={(categories) => handleInputChange('categories', categories)}
            />
          </div>

          {/* Bank Details Section */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">פרטי בנק</h4>
            {parsedData.bank_details_file ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">קובץ פרטי בנק הועלה בשלב הקודם</span>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300 hover:border-green-400 transition-colors">
                <div className="text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">העלה פרטי בנק (אופציונלי)</p>

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleBankUpload}
                    className="hidden"
                    id="bank-upload-step2"
                  />
                  <label
                    htmlFor="bank-upload-step2"
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    בחר קובץ
                  </label>

                  {bankFile && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{bankFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">בנק</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סניף</label>
                <input
                  type="text"
                  value={formData.bank_branch}
                  onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">מספר חשבון</label>
                <input
                  type="text"
                  value={formData.bank_account}
                  onChange={(e) => handleInputChange('bank_account', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">מוטב / בעל חשבון (אופציונלי)</label>
                <input
                  type="text"
                  value={formData.beneficiary}
                  onChange={(e) => handleInputChange('beneficiary', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Action Bar */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              חזור
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
                disabled={loading || formData.categories.length === 0}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all min-w-[160px] justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    יוצר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    צור הוצאה
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