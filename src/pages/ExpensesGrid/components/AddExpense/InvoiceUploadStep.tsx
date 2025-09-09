import React from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { documentsApi, isMockMode } from '@/api/http';
import type { ParsedInvoiceData } from './AddExpenseWizard';
import UploadFlowIndicator from './UploadFlowIndicator';

interface InvoiceUploadStepProps {
  onComplete: (data: ParsedInvoiceData, files?: { invoice?: File; bank?: File }) => void;
}

function normalizeServerInvoice(data: any): ParsedInvoiceData {
  const bank = data.bank || {};
  return {
    supplier_name: data.supplier_name ?? '',
    business_number: data.business_number ?? '',
    invoice_type: data.invoice_type ?? '',
    invoice_description: data.invoice_description ?? '',
    amount: Number(data.amount) || 0,
    project: data.project ?? '',
    bank_details_file: data.bank_details_file ?? undefined,
    supplier_email: data.supplier_email ?? '',
    bank_name: (data.bank_name ?? bank.bank_name ?? '') || '',
    bank_branch: (data.bank_branch ?? bank.bank_branch ?? '') || '',
    bank_account: (data.bank_account ?? bank.bank_account ?? '') || '',
    beneficiary: (data.beneficiary ?? bank.beneficiary ?? '') || '',
  };
}

export function InvoiceUploadStep({ onComplete }: InvoiceUploadStepProps) {
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const [bankFile, setBankFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = React.useState(0);
  const [attemptedNext, setAttemptedNext] = React.useState(false);

  React.useEffect(() => {
    if (!invoiceFile) {
      setPhase('idle');
      setProgress(0);
    }
  }, [invoiceFile]);

  React.useEffect(() => {
    if (phase !== 'uploading') return;
    const t = window.setTimeout(() => {
      setPhase((prev) => (prev === 'uploading' ? 'analyzing' : prev));
      setProgress((p) => Math.max(p, 60));
    }, 1000);
    return () => clearTimeout(t);
  }, [phase]);

  const handleInvoiceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('קובץ חשבונית גדול מדי (עד 10MB)');
        return;
      }
      setInvoiceFile(file);
      setError(null);
    }
  };

  const handleBankUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('קובץ פרטי בנק גדול מדי (עד 10MB)');
        return;
      }
      setBankFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setAttemptedNext(true);
    if (!invoiceFile) {
      setError('בחרו קובץ חשבונית');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPhase('uploading');
      setProgress(10);

      if (isMockMode()) {
        setProgress(30);
        await new Promise((r) => setTimeout(r, 500));
        setPhase('analyzing');
        setProgress(75);
        await new Promise((r) => setTimeout(r, 700));

        const mockData: ParsedInvoiceData = {
          supplier_name: 'ספק לדוגמה',
          business_number: '123456789',
          invoice_type: 'חשבונית מס',
          invoice_description: 'תיאור לדוגמה מחשבונית',
          amount: 1250,
          project: 'פרויקט 2025',
          bank_details_file: bankFile ? 'mock-bank-details-url' : undefined,
          supplier_email: 'supplier@example.com',
        } as ParsedInvoiceData;

        setProgress(100);
        setPhase('done');
        onComplete(mockData);
        return;
      }

      const formData = new FormData();
      formData.append('invoice', invoiceFile);
      if (bankFile) formData.append('bank_details', bankFile);

      const response = await documentsApi.post('/documents/upload-invoice', formData, {
        
        onUploadProgress: (e: import('axios').AxiosProgressEvent) => {
          if (e.total) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(Math.max(10, Math.min(100, pct)));
            if (pct >= 100) setPhase((prev) => (prev === 'uploading' ? 'analyzing' : prev));
          }
        },
      });

      setPhase('analyzing');
      setProgress(95);
      setProgress(100);
      setPhase('done');
      onComplete(normalizeServerInvoice(response.data), {
        invoice: invoiceFile || undefined,
        bank: bankFile || undefined,
      });
    } catch (err) {
      console.error('Upload error:', err);
      setPhase('error');
      setError('אירעה שגיאה בהעלאה או עיבוד המסמך. נסו שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">בחירת מסמכים</h3>
          <p className="text-gray-600 text-sm">בחרו חשבונית ולא חובה פירוט פרטי בנק</p>
        </div>

        <div className="mt-3 mb-4" aria-live="polite">
          <UploadFlowIndicator phase={phase} progress={progress} />
        </div>

        <div className="space-y-4">
          {/* Invoice Upload */}
          <div className={`rounded-xl p-4 border transition-colors ${
            attemptedNext && !invoiceFile
              ? 'border-red-500 bg-red-50'
              : invoiceFile
                ? 'border-green-500 bg-green-50'
                : 'bg-gray-50 border-gray-300 hover:border-blue-400'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${invoiceFile ? 'bg-green-100' : 'bg-blue-100'}`}>
                <FileText className={`w-5 h-5 ${invoiceFile ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">חשבונית (חובה)</h4>
                {!invoiceFile ? (
                  <p className="text-xs text-gray-600">PDF, JPG, PNG עד 10MB</p>
                ) : (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium truncate" title={invoiceFile.name}>{invoiceFile.name}</span>
                  </div>
                )}
              </div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleInvoiceUpload} className="hidden" id="invoice-upload" />
              <label htmlFor="invoice-upload" className={`shrink-0 inline-flex items-center gap-2 rounded-lg font-medium cursor-pointer transition-all px-3 py-2 text-sm text-white ${invoiceFile ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                <Upload className="w-4 h-4" />
                {invoiceFile ? 'החלפת קובץ' : 'בחר קובץ'}
              </label>
            </div>
          </div>

          {/* Bank Details Upload */}
          <div className={`rounded-xl p-4 border transition-colors ${bankFile ? 'border-green-500 bg-green-50' : 'bg-gray-50 border-gray-300 hover:border-green-400'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bankFile ? 'bg-green-100' : 'bg-emerald-100'}`}>
                <FileText className={`w-5 h-5 ${bankFile ? 'text-green-600' : 'text-emerald-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">פרטי בנק (אופציונלי)</h4>
                {!bankFile ? (
                  <p className="text-xs text-gray-600">PDF, JPG, PNG עד 10MB</p>
                ) : (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium truncate" title={bankFile.name}>{bankFile.name}</span>
                  </div>
                )}
              </div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleBankUpload} className="hidden" id="bank-upload" />
              <label htmlFor="bank-upload" className={`shrink-0 inline-flex items-center gap-2 rounded-lg font-medium cursor-pointer transition-all px-3 py-2 text-sm text-white ${bankFile ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                <Upload className="w-4 h-4" />
                {bankFile ? 'החלפת קובץ' : 'בחר קובץ'}
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!invoiceFile || loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-all min-w-[180px] justify-center text-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                מעלה ומנתח...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                העלה והמשך
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

