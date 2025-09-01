import React from 'react';
import { X } from 'lucide-react';

interface CategoriesFieldProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
}

const availableCategories = [
  'מחנה',
  'מחנה ד',
  'אתנחתא',
  'יום עיון מורות',
  'אחר מחנה',
  'הגברה',
  'זיץ למחנה',
  'טיול',
  'ארוחות',
  'תחבורה',
  'ציוד',
  'שירותים',
];

export function CategoriesField({ selectedCategories, onChange }: CategoriesFieldProps) {
  const [inputValue, setInputValue] = React.useState('');

  const handleAddCategory = (category: string) => {
    if (!selectedCategories.includes(category)) {
      onChange([...selectedCategories, category]);
    }
  };

  const handleRemoveCategory = (category: string) => {
    onChange(selectedCategories.filter(c => c !== category));
  };

  const handleCustomAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !selectedCategories.includes(trimmed)) {
      onChange([...selectedCategories, trimmed]);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomAdd();
    }
  };

  const filteredCategories = availableCategories.filter(cat => 
    !selectedCategories.includes(cat) && 
    cat.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div>
      {/* Selected Categories */}
      {selectedCategories.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">קטגוריות נבחרות:</p>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <span
                key={category}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {category}
                <button
                  onClick={() => handleRemoveCategory(category)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category Input */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="הקלד לחיפוש או הוספת קטגוריה חדשה..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        {inputValue.trim() && (
          <button
            onClick={handleCustomAdd}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-all"
          >
            הוסף
          </button>
        )}
      </div>

      {/* Available Categories */}
      {inputValue && filteredCategories.length > 0 && (
        <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">קטגוריות זמינות:</p>
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((category) => (
              <button
                key={category}
                onClick={() => handleAddCategory(category)}
                className="bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-3 py-1 rounded-full text-sm border border-gray-300 hover:border-blue-300 transition-all"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Popular Categories */}
      {!inputValue && selectedCategories.length === 0 && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">קטגוריות פופולריות:</p>
          <div className="flex flex-wrap gap-2">
            {availableCategories.slice(0, 6).map((category) => (
              <button
                key={category}
                onClick={() => handleAddCategory(category)}
                className="bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-3 py-2 rounded-lg text-sm border border-gray-300 hover:border-blue-300 transition-all"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}