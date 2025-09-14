import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { AIAnalysisBanner } from './AIAnalysisBanner';
import type { ParsedInvoiceData } from './AddExpenseWizard';

interface AIExtractedStepProps {
  parsedData: ParsedInvoiceData;
  onBack: () => void;
  onNext: (updated: ParsedInvoiceData) => void;
  onCancel: () => void;
}

export default function AIExtractedStep({ parsedData, onBack, onNext, onCancel }: AIExtractedStepProps) {
  const [form, setForm] = React.useState<ParsedInvoiceData>({ ...parsedData });
  const [attemptedNext, setAttemptedNext] = React.useState(false);

  const handleChange = (field: keyof ParsedInvoiceData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleContinue = () => {
    setAttemptedNext(true);
    const isBlank = (v: any) => (typeof v === 'string' ? v.trim().length === 0 : v === null || v === undefined);

    const missingFields = [];
    if (isBlank(form.supplier_name)) missingFields.push('שם ספק');
    if (isBlank(form.business_number)) missingFields.push('מספר עוסק/ח.פ');
    if (isBlank(form.invoice_type)) missingFields.push('סוג חשבונית');
    if (isBlank(form.invoice_description)) missingFields.push('תיאור לחשבונית');
    if (isBlank(form.supplier_email)) missingFields.push('אימייל ספק');
    if (!(form.amount > 0)) missingFields.push('סכום תקין');
    if (isBlank(form.bank_name)) missingFields.push('בנק');
    if (isBlank(form.bank_branch)) missingFields.push('סניף');
    if (isBlank(form.bank_account)) missingFields.push('מספר חשבון');
    // if (isBlank(form.beneficiary)) missingFields.push('מוטב');

    const allValid = missingFields.length === 0;

    if (!allValid) {
      // Scroll to the first error field if invoice type is missing
      if (isBlank(form.invoice_type)) {
        const invoiceTypeSelect = document.querySelector('select[required]') as HTMLSelectElement | null;
        if (invoiceTypeSelect) {
          invoiceTypeSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
          invoiceTypeSelect.focus();
        }
      }
      return;
    }
    onNext(form);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6" />

        <AIAnalysisBanner
          status="ready"
          modelName="Gemini"
          checklist={[
            !form.supplier_name && 'חסר שם ספק',
            !form.business_number && 'חסר מספר עוסק/ח.פ',
            (!form.invoice_type || form.invoice_type.trim() === '') && 'חסר סוג חשבונית',
            !form.invoice_description && 'חסר תיאור לחשבונית',
            form.amount <= 0 && 'סכום לא תקין',
          ].filter(Boolean) as string[]}
        />

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-4">
          {/* Basic (AI) Fields */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">נתונים שחולצו ע"י AI</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שם ספק</label>
                <input
                  type="text"
                  value={form.supplier_name}
                  onChange={(e) => handleChange('supplier_name', e.target.value)}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${attemptedNext && (!form.supplier_name || form.supplier_name.trim() === '') ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מספר עוסק/ח.פ</label>
                <input
                  type="text"
                  value={form.business_number}
                  onChange={(e) => handleChange('business_number', e.target.value)}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${attemptedNext && (!form.business_number || form.business_number.trim() === '') ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סוג חשבונית <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.invoice_type || ''}
                  onChange={(e) => handleChange('invoice_type', e.target.value)}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${attemptedNext && (!form.invoice_type || form.invoice_type.trim() === '') ? 'border-red-500' : 'border-gray-300'
                    }`}
                >
                  <option value="">בחר סוג חשבונית</option>
                  <option value="חשבונית עסקה">חשבונית עסקה</option>
                  <option value="חשבונית מס">חשבונית מס</option>
                  <option value="דרישת תשלום">דרישת תשלום</option>
                </select>
                {attemptedNext && (!form.invoice_type || form.invoice_type.trim() === '') && (
                  <p className="mt-1 text-sm text-red-600">יש לבחור סוג חשבונית</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סכום</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${attemptedNext && !(form.amount > 0) ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">תיאור לחשבונית</label>
                <textarea
                  value={form.invoice_description}
                  onChange={(e) => handleChange('invoice_description', e.target.value)}
                  rows={3}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${attemptedNext && (!form.invoice_description || form.invoice_description.trim() === '') ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אימייל ספק</label>
                <input
                  type="email"
                  value={form.supplier_email}
                  onChange={(e) => handleChange('supplier_email', e.target.value)}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${attemptedNext && (!form.supplier_email || form.supplier_email.trim() === '') ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>
            </div>
          </div>

          {/* Bank details (from AI) */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">פרטי בנק (אם זוהו)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">בנק</label>
                <input
                  type="text"
                  value={form.bank_name || ''}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${attemptedNext && (!form.bank_name || form.bank_name.trim() === '') ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סניף</label>
                <input
                  type="text"
                  value={form.bank_branch || ''}
                  onChange={(e) => handleChange('bank_branch', e.target.value)}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${attemptedNext && (!form.bank_branch || form.bank_branch.trim() === '') ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">מס' חשבון</label>
                <input
                  type="text"
                  value={form.bank_account || ''}
                  onChange={(e) => handleChange('bank_account', e.target.value)}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${attemptedNext && (!form.bank_account || form.bank_account.trim() === '') ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">מוטב/beneficiary</label>
                <input
                  type="text"
                  value={form.beneficiary || ''}
                  onChange={(e) => handleChange('beneficiary', e.target.value)}
                  // required
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-8 flex items-center justify-between">
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
              onClick={handleContinue}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-all min-w-[160px] justify-center"
            >
              המשך
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
