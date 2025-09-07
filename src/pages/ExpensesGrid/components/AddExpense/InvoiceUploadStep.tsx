import React from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { documentsApi, isMockMode } from '@/api/http';
import { ParsedInvoiceData } from './AddExpenseWizard';
import UploadFlowIndicator from './UploadFlowIndicator';

interface InvoiceUploadStepProps {
  onComplete: (data: ParsedInvoiceData) => void;
}

function normalizeServerInvoice(data: any): ParsedInvoiceData {
  const bank = data.bank || {};
  return {
    supplier_name: data.supplier_name ?? "",
    business_number: data.business_number ?? "",
    invoice_type: data.invoice_type ?? "",
    invoice_description: data.invoice_description ?? "",
    amount: Number(data.amount) || 0,
    project: data.project ?? "",
    bank_details_file: data.bank_details_file ?? undefined,
    supplier_email: data.supplier_email ?? "",
    bank_name: (data.bank_name ?? bank.bank_name ?? "") || "",
    bank_branch: (data.bank_branch ?? bank.bank_branch ?? "") || "",
    bank_account: (data.bank_account ?? bank.bank_account ?? "") || "",
    beneficiary: (data.beneficiary ?? bank.beneficiary ?? "") || "",
  };
}


export function InvoiceUploadStep({ onComplete }: InvoiceUploadStepProps) {
  const [invoiceFile, setInvoiceFile] = React.useState<File | null>(null);
  const [bankFile, setBankFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    if (!invoiceFile) {
      setPhase("idle");
      setProgress(0);
    }
  }, [invoiceFile]);
  React.useEffect(() => {
    if (phase !== "uploading") return;

    const t = window.setTimeout(() => {
      // נחליף ל-analyzing רק אם עדיין ב-uploading (לא שגיאה/סיום)
      setPhase(prev => (prev === "uploading" ? "analyzing" : prev));
      // בוסט קטן כדי שהפס ייראה זז
      setProgress(p => Math.max(p, 60));
    }, 1000);

    return () => clearTimeout(t);
  }, [phase]);
  const handleInvoiceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('קובץ החשבונית גדול מדי (מקסימום 10MB)');
        return;
      }
      setInvoiceFile(file);
      setError(null);
    }
  };

  const handleBankUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('קובץ פרטי הבנק גדול מדי (מקסימום 10MB)');
        return;
      }
      setBankFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!invoiceFile) {
      setError('יש להעלות קובץ חשבונית');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // תהליך: העלאה → ניתוח → סיום
      setPhase("uploading");
      setProgress(10);
      if (isMockMode()) {
        setPhase("uploading");
        setProgress(30);
        await new Promise(r => setTimeout(r, 500));

        // גם אם האפקט כבר החליף ל-analyzing, זה לא יזיק:
        setPhase("analyzing");
        setProgress(75);
        await new Promise(r => setTimeout(r, 700));


        const mockData: ParsedInvoiceData = {
          supplier_name: "ספק לדוגמה בע\"מ",
          business_number: "123456789",
          invoice_type: "חשבונית מס",
          invoice_description: "שירותים למחנה קיץ",
          amount: 1250.00,
          project: "מחנה קיץ 2025",
          bank_details_file: bankFile ? "mock-bank-details-url" : undefined,
          supplier_email: "supplier@example.com"
        };
        setProgress(100); setPhase("done");

        onComplete(mockData);
        return;
      }

      // Real API call
      const formData = new FormData();
      formData.append('invoice', invoiceFile);
      if (bankFile) {
        formData.append('bank_details', bankFile);
      }

      const response = await documentsApi.post('/documents/upload-invoice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
       onUploadProgress: (e: import('axios').AxiosProgressEvent) => {
  if (e.total) {
    const pct = Math.round((e.loaded / e.total) * 100);
    setProgress(Math.max(10, Math.min(100, pct)));
    if (pct >= 100) {
      setPhase(prev => (prev === "uploading" ? "analyzing" : prev));
    }
  }
},
      });

      setPhase("analyzing");
      setProgress(95);

      setProgress(100);
      setPhase("done");
      onComplete(normalizeServerInvoice(response.data));
    } catch (err) {
      console.error('Upload error:', err);
      setPhase("error");
      setError('שגיאה בהעלאת הקבצים. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };
  return (

    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">העלאת קבצים</h3>
          <p className="text-gray-600">העלה את קובץ החשבונית ופרטי הבנק (אופציונלי)</p>
        </div>
        <div className="mt-4 mb-6" aria-live="polite">
          <UploadFlowIndicator phase={phase} progress={progress} />
        </div>
        <div className="space-y-6">
          {/* Invoice Upload */}
          <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">חשבונית *</h4>
              <p className="text-sm text-gray-600 mb-4">PDF, JPG, PNG עד 10MB</p>

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleInvoiceUpload}
                className="hidden"
                id="invoice-upload"
              />
              <label
                htmlFor="invoice-upload"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4" />
                בחר קובץ
              </label>

              {invoiceFile && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{invoiceFile.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bank Details Upload */}
          <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 hover:border-green-400 transition-colors">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">פרטי בנק (אופציונלי)</h4>
              <p className="text-sm text-gray-600 mb-4">PDF, JPG, PNG עד 10MB</p>

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleBankUpload}
                className="hidden"
                id="bank-upload"
              />
              <label
                htmlFor="bank-upload"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4" />
                בחר קובץ
              </label>

              {bankFile && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{bankFile.name}</span>
                </div>
              )}
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

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!invoiceFile || loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all min-w-[200px] justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                מעלה קבצים...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                העלה ועבור לשלב הבא
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}