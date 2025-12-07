import React from 'react';
import { createPortal } from 'react-dom';
import { useCategoriesStore } from '@/stores/categoriesStore';
import { useProgramsStore } from '@/stores/programsStore';


interface CategoriesFieldProps {
  // Selected category IDs
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  // Optional explicit program id (otherwise falls back to the globally selected program)
  programId?: string | null | string[];
  disable?: string;
  error?: boolean;
}

// Static categories; replace with API data by program_id when available



export function CategoriesField({ selectedCategories, onChange, programId, error }: CategoriesFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const controlRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const categoriesByProgram = useCategoriesStore(s => s.categoriesByProgram);
  const fetchForProgram = useCategoriesStore(s => s.fetchForProgram);
  const selectedProgramId = useProgramsStore(s => s.selectedProgramId);
  const programs = useProgramsStore(s => s.programs);

  const pickProgramId = (val: any): string | undefined => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val.length ? String(val[0]) : undefined;
    return String(val);
  };

  // Pick program for categories:
  // - If prop exists and looks like a real id (not Airtable rec) -> use it
  // - If prop looks like recId but store has non-rec id -> prefer store (admin view may select numeric program)
  // - Else prop -> else selected -> else single/first program
  const effectiveProgramId = React.useMemo(() => {
    const fromProp = pickProgramId(programId);
    const fromStore = pickProgramId(selectedProgramId);

    const propLooksRec = fromProp?.startsWith('rec');
    const storeLooksRec = fromStore?.startsWith('rec');

    if (fromProp && !propLooksRec) return fromProp;
    if (propLooksRec && fromStore && !storeLooksRec) return fromStore;

    if (fromProp) return fromProp;
    if (fromStore) return fromStore;
    if (programs.length === 1) return pickProgramId(programs[0].id);
    return programs[0]?.id ? String(programs[0].id) : undefined;
  }, [programId, selectedProgramId, programs]);

  const programCats = effectiveProgramId ? categoriesByProgram[effectiveProgramId] : undefined;
  const categories = programCats?.items || [];
  const loading = programCats?.loading || false;
  React.useEffect(() => {
    if (!effectiveProgramId) return;
    const entry = categoriesByProgram[effectiveProgramId];
    const hasFetched = Boolean(entry?.lastFetched);
    if (!entry || (!entry.loading && !hasFetched)) {
      fetchForProgram(effectiveProgramId);
    }
  }, [effectiveProgramId, categoriesByProgram, fetchForProgram]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (controlRef.current && controlRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const updatePosition = React.useCallback(() => {
    if (!controlRef.current) return;
    const rect = controlRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom, left: rect.left, width: rect.width });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (!o && !next) return next;
      setTimeout(updatePosition, 0);
      return next;
    });
  };
  const close = () => setOpen(false);

  const filtered = categories.filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase()));

  const normalizeId = (id: string | number) => String(id);
  const isSelected = (id: string | number) => selectedCategories.includes(normalizeId(id));
  const toggleSelect = (id: string | number) => {
    const normalized = normalizeId(id);
    if (isSelected(normalized)) onChange(selectedCategories.filter((c) => c !== normalized));
    else onChange([...selectedCategories, normalized]);
  };

  const summaryLabel = selectedCategories.length === 0 ? 'בחרו קטגוריות' : `${selectedCategories.length} נבחרו`;

  return (
    <div className="relative">
      {/* Control */}
      <button
        type="button"
        onClick={toggle}
        ref={controlRef}
        className={`w-full text-right px-4 py-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'}`}
      >
        <span className={selectedCategories.length === 0 ? 'text-gray-500' : 'text-gray-900'}>{summaryLabel}</span>
      </button>

      {/* Dropdown */}
      {open && coords &&
        createPortal(
          <div
            ref={panelRef}
            className="z-[60] fixed bg-white border border-gray-200 rounded-lg shadow-lg"
            style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
          >
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש קטגוריות..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="max-h-56 overflow-auto p-1">
              {loading && (
                <div className="px-3 py-2 text-sm text-gray-500">טוען קטגוריות...</div>
              )}
              {filtered.map((cat) => (
                <label
                  key={cat.recId}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer hover:bg-gray-50 ${isSelected(cat.recId) ? 'bg-blue-50' : ''
                    }`}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span className="text-sm text-gray-900">{cat.name}</span>
                  <input
                    type="checkbox"
                    checked={isSelected(cat.recId)}
                    onChange={() => toggleSelect(cat.recId)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button onClick={close} className="text-sm text-gray-700 hover:text-gray-900">
                סגור
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

