import React from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface Project {
  id: string;
  name: string;
}

interface ProjectAssignmentDropdownProps {
  projects: Project[];
  selectedProjectIds: string[];
  onProjectToggle: (projectId: string) => void;
  onProjectRemove: (projectId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ProjectAssignmentDropdown({
  projects,
  selectedProjectIds,
  onProjectToggle,
  onProjectRemove,
  disabled = false,
  placeholder = "הוסף פרויקט",
  className = ""
}: ProjectAssignmentDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const [menuStyle, setMenuStyle] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));
  const availableProjects = projects.filter(p => 
    !selectedProjectIds.includes(p.id) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProjectSelect = (projectId: string) => {
    onProjectToggle(projectId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleProjectRemove = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onProjectRemove(projectId);
  };

  const updateMenuPosition = React.useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8; // 8px gap
    const left = rect.left + window.scrollX - 155;
    const width = Math.max(rect.width, 300);
    setMenuStyle({ top, left, width });
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected Projects Display */}
      {selectedProjects.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">פרויקטים נבחרים:</p>
          <div className="flex flex-wrap gap-2">
            {selectedProjects.map((project) => (
              <span
                key={project.id}
                className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                <span className="truncate max-w-[120px]" title={project.name}>
                  {project.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleProjectRemove(project.id, e)}
                  className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown */}
      <div className="relative">
        <button
          type="button"
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[140px] justify-between"
        >
          <span>{placeholder}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && menuStyle && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[9990]" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Menu */}
            <div
              className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[10000] overflow-hidden"
              style={{ top: menuStyle?.top ?? 0, left: menuStyle?.left ?? 0, width: menuStyle?.width ?? 300 }}
            >
              {/* Search */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="חיפוש פרויקטים..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Projects List */}
              <div className="max-h-60 overflow-y-auto">
                {availableProjects.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchTerm ? 'לא נמצאו פרויקטים התואמים לחיפוש' : 'כל הפרויקטים כבר נבחרו'}
                  </div>
                ) : (
                  <div className="py-2">
                    {availableProjects.map(project => (
                      <button
                        type="button"
                        key={project.id}
                        onClick={() => handleProjectSelect(project.id)}
                        className="w-full text-right px-4 py-2 hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors text-sm"
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
