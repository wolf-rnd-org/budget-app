import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';

interface CopyToClipboardFieldProps {
  value: string;
  label?: string;
  placeholder?: string;
  className?: string;
  fieldClassName?: string;
  buttonClassName?: string;
}

export function CopyToClipboardField({
  value,
  label,
  placeholder,
  className = '',
  fieldClassName = '',
  buttonClassName = ''
}: CopyToClipboardFieldProps) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          readOnly
          placeholder={placeholder}
          className={`flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldClassName}`}
        />
        <button
          type="button"
          onClick={copyToClipboard}
          className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            copied 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          } ${buttonClassName}`}
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              הועתק!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              העתק
            </>
          )}
        </button>
      </div>
    </div>
  );
}