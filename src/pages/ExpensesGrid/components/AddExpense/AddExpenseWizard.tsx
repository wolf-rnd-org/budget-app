import React from 'react';
import { X } from 'lucide-react';
import { InvoiceUploadStep } from './InvoiceUploadStep';
import AdditionalDetailsStep from './AdditionalDetailsStep';
import { WizardHeader } from './WizardHeader';
import AIExtractedStep from './AIExtractedStep';

interface AddExpenseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (expense: any) => void;
  onTimeoutRefresh?: () => Promise<void> | void;
  totalBudget: number;
  totalExpenses: number;
}

export interface ParsedInvoiceData {
  invoice_file?: string;
  supplier_name: string;
  business_number: string;
  invoice_type: string;
  invoice_description: string;
  amount: number;
  project: string;
  bank_details_file?: string;
  supplier_email: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account?: string;
  beneficiary?: string;
}

export function AddExpenseWizard({ isOpen, onClose, onSuccess, onTimeoutRefresh, totalBudget, totalExpenses }: AddExpenseWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [parsedData, setParsedData] = React.useState<ParsedInvoiceData | null>(null);
  const [files, setFiles] = React.useState<{ invoice?: File; bank?: File }>({});

  // Lock background scroll while the wizard is open
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    // Avoid layout shift from scrollbar removal
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  const handleStepComplete = (data: ParsedInvoiceData, filesFromStep?: { invoice?: File; bank?: File }) => {
    setParsedData(data);
    setFiles(filesFromStep || {});   
    setCurrentStep(2);
  };

  const handleBackToUpload = () => {
    setCurrentStep(1);
  };

  const handleBackToAI = () => {
    setCurrentStep(2);
  };

  const handleSuccess = (expense: any) => {
    onSuccess(expense);
    onClose();
    // Reset wizard state
    setCurrentStep(1);
    setParsedData(null);
  };

  const handleClose = () => {
    onClose();
    // Reset wizard state
    setCurrentStep(1);
    setParsedData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overscroll-contain">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <WizardHeader currentStep={currentStep} />
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] overscroll-contain">
          {currentStep === 1 && (
            <InvoiceUploadStep onComplete={handleStepComplete} />
          )}

          {currentStep === 2 && parsedData && (
            <AIExtractedStep
              parsedData={parsedData}
              onBack={handleBackToUpload}
              onNext={(updated) => { setParsedData(updated); setCurrentStep(3); }}
              onCancel={handleClose}
            />
          )}

          {currentStep === 3 && parsedData && (
            <AdditionalDetailsStep
              parsedData={parsedData}
              initialInvoiceFile={files.invoice}
              initialBankFile={files.bank}
              totalBudget={totalBudget}
              totalExpenses={totalExpenses}
              onBack={handleBackToAI}
              onSuccess={handleSuccess}
              onCancel={handleClose}
              onTimeoutRefresh={onTimeoutRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}
