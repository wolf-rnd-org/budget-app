import React, { useMemo, useState } from 'react';
import PettyCashDialog from './PettyCashDialog';
import SalaryDialog from './SalaryDialog';
import CheckDialog from './CheckDialog';
import ExpectedExpenseDialog from './ExpectedExpenseDialog';
import type { CategoryOption, MoreActionsPayload } from './types';

type Props = {
  categories?: CategoryOption[];
  onSubmit: (payload: MoreActionsPayload) => Promise<void> | void;
  // Optional: allow overriding the label/styles to match existing button styling
  buttonLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  buttonClassName?: string;
};

export default function MoreActionsButton({ categories = [], onSubmit, buttonLabel = 'פעולות נוספות', className, style, buttonClassName }: Props) {
  const [anchorOpen, setAnchorOpen] = useState(false);
  const [pettyOpen, setPettyOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [expectedOpen, setExpectedOpen] = useState(false);

  const menuItems = useMemo(
    () => [
      { key: 'petty', label: 'קופה קטנה', onClick: () => setPettyOpen(true) },
      { key: 'salary', label: 'דיווח שכר', onClick: () => setSalaryOpen(true) },
      { key: 'expected', label: 'הוצאה צפויה', onClick: () => setExpectedOpen(true) },
      // { key: 'check', label: 'צ׳ק', onClick: () => setCheckOpen(true) },
    ],
    []
  );

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block', ...style }} dir="rtl">
      <button
        type="button"
        className={buttonClassName || 'btn-secondary'}
        onClick={() => setAnchorOpen((v) => !v)}
      >
        {buttonLabel}
      </button>

      {anchorOpen && (
        <div className="menu" role="menu" onMouseLeave={() => setAnchorOpen(false)}>
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className="menu-item"
              onClick={() => {
                setAnchorOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <PettyCashDialog
        open={pettyOpen}
        categories={categories}
        onClose={() => setPettyOpen(false)}
        onSubmit={async (p) => {
          try {
            await onSubmit(p);   // חשוב: await כדי שהדיאלוג יחכה לתוצאה
          } catch (e) {
            throw e;             // חשוב: לא לבלוע — להחזיר לדיאלוג כדי שיציג באנר
          }
        }}
      />
      <SalaryDialog
        open={salaryOpen}
        categories={categories}
        onClose={() => setSalaryOpen(false)}
        onSubmit={async (p) => {
          try { await onSubmit(p); } catch (e) { throw e; }
        }}
      />
      <ExpectedExpenseDialog
        open={expectedOpen}
        onClose={() => setExpectedOpen(false)}
        onSubmit={async (p) => {
          try { await onSubmit(p); } catch (e) { throw e; }
        }}
      />
      <CheckDialog
        open={checkOpen}
        categories={categories}
        onClose={() => setCheckOpen(false)}
        onSubmit={async (p) => {
          try { await onSubmit(p); } catch (e) { throw e; }
        }}
      />

      <style>{`
        .btn-secondary {
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #d1d5db; /* gray-300 */
          background: #ffffff;
          color: #374151; /* gray-700 */
          font-weight: 500;
          cursor: pointer;
          transition: background-color .2s ease, box-shadow .2s ease, transform .2s ease;
          box-shadow: 0 6px 14px rgba(0,0,0,0.08);
        }
        .btn-secondary:hover {
          background: #f9fafb; /* gray-50 */
          box-shadow: 0 10px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
        .btn-secondary:active {
          transform: translateY(0);
        }
        .btn-secondary:focus {
          outline: 2px solid rgba(59,130,246,0.6); /* blue-500 */
          outline-offset: 2px;
        }
        .menu { position: absolute; top: calc(100% + 6px); inset-inline-end: 0; background: #fff; border: 1px solid #ddd; border-radius: 8px; min-width: 160px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 10; padding: 6px; }
        .menu-item { display: block; width: 100%; text-align: start; padding: 8px 10px; border: none; background: transparent; border-radius: 6px; }
        .menu-item:hover { background: #f5f5f5; }
      `}</style>
    </div>
  );
}
