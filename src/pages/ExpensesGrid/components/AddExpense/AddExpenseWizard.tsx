import React from 'react';
import { X } from 'lucide-react';
import { InvoiceUploadStep } from './InvoiceUploadStep';
import { ExpenseReviewStep } from './ExpenseReviewStep';
import { WizardHeader } from './WizardHeader';

interface AddExpenseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (expense: any) => void;
}

export interface ParsedInvoiceData {
  supplier_name: string;
  business_number: string;
  invoice_type: string;
  invoice_description: string;
  amount: number;
  project: string;
  bank_details_file?: string;
  supplier_email: string;
}

export function AddExpenseWizard({ isOpen, onClose, onSuccess }: AddExpenseWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [parsedData, setParsedData] = React.useState<ParsedInvoiceData | null>(null);

  const handleStepComplete = (data: ParsedInvoiceData) => {
    setParsedData(data);
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {currentStep === 1 && (
            <InvoiceUploadStep onComplete={handleStepComplete} />
          )}
          
          {currentStep === 2 && parsedData && (
            <ExpenseReviewStep
              parsedData={parsedData}
              onBack={handleBack}
              onSuccess={handleSuccess}
              onCancel={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}