import React from 'react';
import { Upload, FileText } from 'lucide-react';

interface WizardHeaderProps {
  currentStep: number;
}

export function WizardHeader({ currentStep }: WizardHeaderProps) {
  return (
    <div className="flex items-center gap-6">
      <h2 className="text-2xl font-bold text-gray-900">הוצאה חדשה</h2>
      
      <div className="flex items-center gap-4">
        {/* Step 1 */}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            <Upload className="w-4 h-4" />
          </div>
          <span className={`text-sm font-medium ${
            currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'
          }`}>
            העלאת קבצים
          </span>
        </div>

        {/* Connector */}
        <div className={`w-8 h-0.5 ${
          currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'
        }`} />

        {/* Step 2 */}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            <FileText className="w-4 h-4" />
          </div>
          <span className={`text-sm font-medium ${
            currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'
          }`}>
            סקירה ויצירה
          </span>
        </div>
      </div>
    </div>
  );
}