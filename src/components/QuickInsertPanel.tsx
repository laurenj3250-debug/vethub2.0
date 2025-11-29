'use client';

import React, { useState, useMemo } from 'react';
import { Grid3X3, Loader2, Save } from 'lucide-react';
import { useQuickInsert } from '@/hooks/use-quick-insert';
import { quickInsertCategories } from '@/data/quick-insert-library';
import { QuickOptionsBrowser } from './QuickOptionsBrowser';

// Neo-pop styling constants
const NEO_BORDER = '2px solid #000';
const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
};

interface QuickInsertPanelProps {
  field: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems';
  onInsert: (text: string) => void;
  currentValue?: string; // For "save as option" feature
}

/**
 * Quick-insert panel - simplified for fast insertion only
 * Edit/delete functionality lives in the browser modal
 */
export function QuickInsertPanel({ field, onInsert, currentValue }: QuickInsertPanelProps) {
  const [activeCategory, setActiveCategory] = useState<'surgery' | 'seizures' | 'other'>('surgery');
  const [browserOpen, setBrowserOpen] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { items, getItems, addItem, isLoading } = useQuickInsert();
  const filteredItems = getItems(activeCategory, field);

  // Count items per category for badges
  const categoryCounts = useMemo(() => {
    return {
      surgery: items.filter(i => i.category === 'surgery' && i.field === field).length,
      seizures: items.filter(i => i.category === 'seizures' && i.field === field).length,
      other: items.filter(i => i.category === 'other' && i.field === field).length,
    };
  }, [items, field]);

  // Check if current value could be saved (non-empty, not just whitespace)
  const canSaveCurrentValue = currentValue && currentValue.trim().length > 5;

  const handleSaveAsOption = async () => {
    if (!currentValue?.trim() || !saveLabel.trim()) return;

    setIsSaving(true);
    try {
      await addItem({
        label: saveLabel.trim(),
        text: currentValue.trim(),
        category: activeCategory,
        field: field,
      });
      setSaveLabel('');
      setShowSaveForm(false);
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="w-full rounded-lg p-2"
        style={{ backgroundColor: '#FAFAFA', border: '1px solid #E5E7EB' }}
      >
        {/* Header Row: Category tabs + Browse */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1">
            {quickInsertCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2 py-1 text-[11px] font-semibold rounded transition-all flex items-center gap-1`}
                style={{
                  backgroundColor: activeCategory === cat.id ? COLORS.lavender : 'white',
                  border: activeCategory === cat.id ? NEO_BORDER : '1px solid #D1D5DB',
                  boxShadow: activeCategory === cat.id ? '2px 2px 0 #000' : 'none',
                }}
              >
                <span>{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
                <span className="px-1 text-[9px] rounded-full bg-black/10">
                  {categoryCounts[cat.id]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {isLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
            {canSaveCurrentValue && !showSaveForm && (
              <button
                onClick={() => setShowSaveForm(true)}
                className="px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 hover:bg-green-50 transition"
                style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
                title="Save current text as quick option"
              >
                <Save size={12} />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}
            <button
              onClick={() => setBrowserOpen(true)}
              className="px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 hover:bg-gray-100 transition"
              style={{ border: '1px solid #D1D5DB' }}
              title="Browse all & edit options"
            >
              <Grid3X3 size={12} />
              <span className="hidden sm:inline">All</span>
            </button>
          </div>
        </div>

        {/* Quick Insert Buttons - Clean Grid */}
        <div
          className="grid gap-1 max-h-[140px] overflow-y-auto"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))' }}
        >
          {filteredItems.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic col-span-full py-2 text-center">
              No options. Click "All" to add some.
            </p>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onInsert(item.text)}
                className="px-1.5 py-1 text-[11px] font-medium rounded hover:bg-white hover:-translate-y-0.5 transition-all text-left truncate"
                style={{
                  backgroundColor: '#F3F4F6',
                  border: '1px solid #000',
                  boxShadow: '1px 1px 0 #000',
                }}
                title={item.text}
              >
                {item.label}
              </button>
            ))
          )}
        </div>

        {/* Save form (appears when Save button clicked) */}
        {showSaveForm && canSaveCurrentValue && (
          <div className="mt-2 pt-2 border-t border-gray-200 flex gap-1.5 items-center">
            <input
              type="text"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder="Button label..."
              className="flex-1 px-2 py-1 text-[11px] rounded border border-gray-300 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveAsOption()}
            />
            <button
              onClick={handleSaveAsOption}
              disabled={!saveLabel.trim() || isSaving}
              className="px-2 py-1 text-[10px] font-semibold rounded disabled:opacity-50"
              style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
            >
              {isSaving ? '...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowSaveForm(false); setSaveLabel(''); }}
              className="px-2 py-1 text-[10px] rounded border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Browser Modal (with edit/delete) */}
      <QuickOptionsBrowser
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        field={field}
        onInsert={(text) => {
          onInsert(text);
          setBrowserOpen(false);
        }}
      />
    </>
  );
}
