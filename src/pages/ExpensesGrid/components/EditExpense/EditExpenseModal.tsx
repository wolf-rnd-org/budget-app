import React from 'react';
import { X, Save, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { budgetApi, isMockMode } from '@/api/http';
import { Expense } from '@/api/types';
import { CategoriesField } from '../AddExpense/CategoriesField';

interface EditExpenseModalProps {
  isOpen: boolean;
  expenseId: string;
  onClose: () => void;
  onSuccess: (updatedExpense: Expense) => void;
}

export function EditExpenseModal({ isOpen, expenseId, onClose, onSuccess }: EditExpenseModalProps) {
  const [expense, setExpense] = React.useState<Expense | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [newInvoiceFile, setNewInvoiceFile] = React.useState<File | null>(null);
  const [newBankFile, setNewBankFile] = React.useState<File | null>(null);

  const [programs, setPrograms] = React.useState<Array<{ id: string; name: string }>>([]);


  const [formData, setFormData] = React.useState({
    budget: 0,
    programId: "",
    project: '',
    date: '',
    categories: [] as string[],
    amount: 0,
    invoice_description: '',
    supplier_name: '',
    business_number: '',
    invoice_type: '',
    supplier_email: '',
    status: '',
  });

  // Fetch expense data when modal opens
  React.useEffect(() => {
    if (!isOpen || !expenseId) return;

    async function fetchExpense() {
      try {
        setLoading(true);
        setError(null);

        if (isMockMode()) {
          // Mock response - simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));

          // Find expense from mock data (you'd typically import this)
          const mockExpense: Expense = {
            id: expenseId,
            budget: 2025,
            project: "מחנה קיץ לדוגמה",
            date: "2025-06-15",
            categories: ["מחנה", "הגברה"],
            amount: 1250.00,
            invoice_description: "שירותים למחנה קיץ",
            supplier_name: "ספק לדוגמה בע\"מ",
            invoice_file: "https://example.com/invoice.pdf",
            business_number: "123456789",
            invoice_type: "חשבונית מס",
            bank_details_file: "https://example.com/bank.pdf",
            supplier_email: "supplier@example.com",
            status: "pending",
            user_id: "101"
          };

          setExpense(mockExpense);
          setFormData({
            budget: mockExpense.budget,
            programId: "", // אין כרגע במוק
            project: mockExpense.project,
            date: mockExpense.date,
            categories: Array.isArray(mockExpense.categories) ? mockExpense.categories : [mockExpense.categories],
            amount: mockExpense.amount,
            invoice_description: mockExpense.invoice_description,
            supplier_name: mockExpense.supplier_name,
            business_number: mockExpense.business_number,
            invoice_type: mockExpense.invoice_type,
            supplier_email: mockExpense.supplier_email,
            status: mockExpense.status,
          });
        } else {
          const response = await budgetApi.get(`/budget/expenses/${expenseId}`);
          const expenseData = response.data;

          setExpense(expenseData);
          setFormData({
            budget: expenseData.budget,
            programId: expenseData.program?.id
              || expenseData.program_id_rec
              || expenseData.program_record_id
              || "", // אם אין כרגע — יבחרו מה־Select
            project: expenseData.project || "",
            date: expenseData.date,
            categories: Array.isArray(expenseData.categories) ? expenseData.categories : [expenseData.categories],
            amount: expenseData.amount,
            invoice_description: expenseData.invoice_description,
            supplier_name: expenseData.supplier_name,
            business_number: expenseData.business_number,
            invoice_type: expenseData.invoice_type,
            supplier_email: expenseData.supplier_email,
            status: expenseData.status,
          });
        }
      } catch (err) {
        setError('שגיאה בטעינת נתוני ההוצאה');
        console.error('Error fetching expense:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchExpense();
  }, [isOpen, expenseId]);

  // useEffect נוסף, פעם אחת
  React.useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await budgetApi.get("//programs");//לשאול את נעמי על url
        // תמכי גם ב-res.data.items וגם ב-res.data
        const raw = Array.isArray(res.data?.items) ? res.data.items : res.data;
        const list = (raw || []).map((p: any) => ({
          id: p.id ?? p.recordId ?? p.airtableId,    // מזהה רשומה
          name: p.name ?? p.title ?? p.program_name, // שם לתצוגה
        }));
        setPrograms(list);
      } catch (e) {
        console.error("load programs failed", e);
      }
    })();
  }, [isOpen]);


  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleInvoiceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('קובץ החשבונית גדול מדי (מקסימום 10MB)');
        return;
      }
      setNewInvoiceFile(file);
      setHasUnsavedChanges(true);
      setError(null);
    }
  };

  const handleBankUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('קובץ פרטי הבנק גדול מדי (מקסימום 10MB)');
        return;
      }
      setNewBankFile(file);
      setHasUnsavedChanges(true);
      setError(null);
    }
  };

  const validateForm = () => {
    if (!formData.supplier_name.trim()) {
      setError('שם ספק הוא שדה חובה');
      return false;
    }
    if (!formData.business_number.trim()) {
      setError('מספר עסק הוא שדה חובה');
      return false;
    }
    if (formData.amount <= 0) {
      setError('סכום חייב להיות חיובי');
      return false;
    }
    if (!formData.project.trim()) {
      setError('פרויקט הוא שדה חובה');
      return false;
    }
    if (!formData.date) {
      setError('תאריך הוא שדה חובה');
      return false;
    }
    if (formData.supplier_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supplier_email)) {
      setError('כתובת אימייל לא תקינה');
      return false;
    }
    if (!formData.programId) {
      setError('יש לבחור פרויקט');
      return false;
    }
    if (formData.categories.length === 0) {
      setError('יש לבחור לפחות קטגוריה אחת');
      return false;
    }
    return true;
  };
  React.useEffect(() => {
    // אפשר: איפוס מלא, או לסנן מול האופציות ב-CategoriesField
    if (formData.programId) {
      setFormData(prev => ({ ...prev, categories: [] }));
    }
  }, [formData.programId]);
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);

      const updateData = {
        ...formData,
        user_id: expense?.user_id,
      };

      if (isMockMode()) {
        // Mock success response
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updatedExpense: Expense = {
          ...expense!,
          ...updateData,
          user_id: expense!.user_id ?? '', // Ensure user_id is never undefined
          invoice_file: newInvoiceFile ? 'new-invoice-url' : expense!.invoice_file,
          bank_details_file: newBankFile ? 'new-bank-url' : expense!.bank_details_file,
        };
        onSuccess(updatedExpense);
        handleClose();
        return;
      }

      // Real API call
      const response = await budgetApi.patch(`/budget/expenses/${expenseId}`, updateData);
      onSuccess(response.data);
      handleClose();
    } catch (err) {
      setError('שגיאה בעדכון ההוצאה. אנא נסה שוב.');
      console.error('Update expense error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור?')) {
        resetModal();
        onClose();
      }
    } else {
      resetModal();
      onClose();
    }
  };

  const resetModal = () => {
    setExpense(null);
    setFormData({
      budget: 0,
      programId: "",
      project: '',
      date: '',
      categories: [],
      amount: 0,
      invoice_description: '',
      supplier_name: '',
      business_number: '',
      invoice_type: '',
      supplier_email: '',
      status: '',
    });
    setNewInvoiceFile(null);
    setNewBankFile(null);
    setHasUnsavedChanges(false);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-2xl font-bold text-gray-900">עריכת הוצאה</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">טוען נתוני הוצאה...</p>
            </div>
          ) : (
            <div className="p-8">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Basic Details Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">פרטי הוצאה</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">שם ספק *</label>
                      <input
                        type="text"
                        value={formData.supplier_name}
                        onChange={(e) => handleInputChange('supplier_name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">מספר עסק *</label>
                      <input
                        type="text"
                        value={formData.business_number}
                        onChange={(e) => handleInputChange('business_number', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">סוג חשבונית *</label>
                      <select
                        value={formData.invoice_type}
                        onChange={(e) => handleInputChange('invoice_type', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        required
                      >
                        <option value="">בחר סוג חשבונית</option>
                        <option value="חשבונית מס">חשבונית מס</option>
                        <option value="חשבון עסקה">חשבון עסקה</option>
                        <option value="קבלה">קבלה</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">סכום *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">תקציב *</label>
                      <input
                        type="number"
                        value={formData.budget}
                        onChange={(e) => handleInputChange('budget', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">תאריך *</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">פרויקט *</label>
                      <select
                        value={formData.programId}
                        onChange={(e) => handleInputChange('programId', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        required
                      >
                        <option value="" disabled>בחרי פרויקט…</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                     
                    </div>


                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">תיאור החשבונית *</label>
                      <textarea
                        value={formData.invoice_description}
                        onChange={(e) => handleInputChange('invoice_description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        required
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        required
                      >
                        <option value="">בחר סטטוס</option>
                        <option value="pending">ממתין</option>
                        <option value="approved">מאושר</option>
                        <option value="rejected">נדחה</option>
                        <option value="הועבר לתשלום">הועבר לתשלום</option>
                        <option value="שולם ממתין לקבלה">שולם ממתין לקבלה</option>
                        <option value="שולם הסתים טיפול">שולם הסתים טיפול</option>
                        <option value="חדש - ממתין להנהל''ח">חדש - ממתין להנהל''ח</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Categories Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">קטגוריות *</h3>
                  
                  <CategoriesField
                    program_id={formData.programId}              // ⬅️ חדש
                    selectedCategories={formData.categories}
                    onChange={(categories) => handleInputChange('categories', categories)}
                  />
                </div>

                {/* Files Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">קבצים מצורפים</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Invoice File */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">חשבונית</label>
                      <div className="space-y-3">
                        {expense?.invoice_file && !newInvoiceFile && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-800">חשבונית קיימת</p>
                              <a
                                href={expense.invoice_file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                צפה בקובץ
                              </a>
                            </div>
                          </div>
                        )}

                        {newInvoiceFile && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-800">קובץ חדש נבחר</p>
                              <p className="text-xs text-green-600">{newInvoiceFile.name}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleInvoiceUpload}
                            className="hidden"
                            id="edit-invoice-upload"
                          />
                          <label
                            htmlFor="edit-invoice-upload"
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
                          >
                            <Upload className="w-4 h-4" />
                            {newInvoiceFile || expense?.invoice_file ? 'החלף קובץ' : 'העלה קובץ'}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Bank Details File */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">פרטי בנק</label>
                      <div className="space-y-3">
                        {expense?.bank_details_file && !newBankFile && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-800">פרטי בנק קיימים</p>
                              <a
                                href={expense.bank_details_file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:underline"
                              >
                                צפה בקובץ
                              </a>
                            </div>
                          </div>
                        )}

                        {newBankFile && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-800">קובץ חדש נבחר</p>
                              <p className="text-xs text-green-600">{newBankFile.name}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleBankUpload}
                            className="hidden"
                            id="edit-bank-upload"
                          />
                          <label
                            htmlFor="edit-bank-upload"
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all"
                          >
                            <Upload className="w-4 h-4" />
                            {newBankFile || expense?.bank_details_file ? 'החלף קובץ' : 'העלה קובץ'}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-8 mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition-all"
          >
            <X className="w-4 h-4" />
            ביטול
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all min-w-[160px] justify-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                שמור שינויים
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}