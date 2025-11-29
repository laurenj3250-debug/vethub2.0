'use client';

import React, { useState, useMemo } from 'react';
import { Pencil, Plus, X, Check, RotateCcw, Loader2, Grid3X3 } from 'lucide-react';
import { useQuickInsert } from '@/hooks/use-quick-insert';
import { quickInsertCategories } from '@/data/quick-insert-library';
import { ConfirmDialog } from './ConfirmDialog';
import { QuickOptionsBrowser } from './QuickOptionsBrowser';

// Neo-pop styling constants
const NEO_BORDER = '2px solid #000';
const NEO_SHADOW_SM = '4px 4px 0 #000';
const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

interface QuickInsertPanelProps {
  field: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems';
  onInsert: (text: string) => void;
}

/**
 * Quick-insert panel for rapid medication/protocol entry
 * Improved with compact grid layout for better visibility
 */
export function QuickInsertPanel({ field, onInsert }: QuickInsertPanelProps) {
  const [activeCategory, setActiveCategory] = useState<'surgery' | 'seizures' | 'other'>('surgery');
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editText, setEditText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Browse all modal state
  const [browserOpen, setBrowserOpen] = useState(false);

  const { items, getItems, addItem, updateItem, deleteItem, resetToDefaults, isLoading } = useQuickInsert();
  const filteredItems = getItems(activeCategory, field);

  // Count items per category for badges
  const categoryCounts = useMemo(() => {
    return {
      surgery: items.filter(i => i.category === 'surgery' && i.field === field).length,
      seizures: items.filter(i => i.category === 'seizures' && i.field === field).length,
      other: items.filter(i => i.category === 'other' && i.field === field).length,
    };
  }, [items, field]);

  const handleInsert = (text: string) => {
    if (!editMode) {
      onInsert(text);
    }
  };

  const startEdit = (id: string, label: string, text: string) => {
    setEditingId(id);
    setEditLabel(label);
    setEditText(text);
  };

  const saveEdit = async () => {
    if (editingId && editLabel.trim() && editText.trim()) {
      setIsSaving(true);
      try {
        await updateItem(editingId, { label: editLabel.trim(), text: editText.trim() });
        setEditingId(null);
        setEditLabel('');
        setEditText('');
      } catch (e) {
        console.error('Failed to update:', e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditText('');
  };

  const handleAdd = async () => {
    if (newLabel.trim() && newText.trim()) {
      setIsSaving(true);
      try {
        await addItem({
          label: newLabel.trim(),
          text: newText.trim(),
          category: activeCategory,
          field: field,
        });
        setNewLabel('');
        setNewText('');
        setShowAddForm(false);
      } catch (e) {
        console.error('Failed to add:', e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsSaving(true);
    try {
      await deleteItem(itemToDelete);
    } catch (e) {
      console.error('Failed to delete:', e);
    } finally {
      setIsSaving(false);
      setItemToDelete(null);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await resetToDefaults();
    } catch (e) {
      console.error('Failed to reset:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="w-full rounded-xl p-3 mb-2"
        style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
      >
        {/* Header with Category Tabs + Edit Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5">
            {quickInsertCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 flex items-center gap-1`}
                style={{
                  backgroundColor: activeCategory === cat.id ? COLORS.lavender : '#E5E7EB',
                  border: NEO_BORDER,
                  boxShadow: activeCategory === cat.id ? '2px 2px 0 #000' : 'none',
                }}
              >
                <span>{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
                {/* Count badge */}
                <span
                  className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-medium"
                  style={{
                    backgroundColor: activeCategory === cat.id ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  {categoryCounts[cat.id]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Loading indicator */}
            {(isLoading || isSaving) && (
              <Loader2 size={14} className="animate-spin text-gray-500" />
            )}

            {/* Browse All button */}
            <button
              onClick={() => setBrowserOpen(true)}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 transition"
              style={{ border: '1px solid #ccc' }}
              title="Browse all options"
            >
              <Grid3X3 size={14} />
            </button>

            {/* Edit mode controls */}
            {editMode && (
              <>
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={showAddForm}
                  className="px-2 py-1 text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 flex items-center gap-1 disabled:opacity-50"
                  style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                  title="Add new phrase"
                >
                  <Plus size={12} />
                  Add
                </button>
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-orange-600 transition"
                  style={{ border: '1px solid #ccc' }}
                  title="Reset to defaults"
                >
                  <RotateCcw size={14} />
                </button>
              </>
            )}

            {/* Edit toggle */}
            <button
              onClick={() => {
                setEditMode(!editMode);
                setEditingId(null);
                setShowAddForm(false);
              }}
              className="px-2 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1"
              style={{
                backgroundColor: editMode ? COLORS.mint : 'white',
                border: NEO_BORDER,
              }}
              title={editMode ? 'Done editing' : 'Edit phrases'}
            >
              {editMode ? (
                <>
                  <Check size={12} />
                  Done
                </>
              ) : (
                <Pencil size={12} className="text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Add form at top when active */}
        {showAddForm && (
          <div
            className="flex items-center gap-2 rounded-lg p-2 mb-3"
            style={{ backgroundColor: COLORS.cream, border: NEO_BORDER }}
          >
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Button label"
                className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                style={{ border: '1px solid #000', backgroundColor: 'white' }}
                autoFocus
              />
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Text to insert"
                className="flex-[2] min-w-0 px-2 py-1.5 text-xs rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                style={{ border: '1px solid #000', backgroundColor: 'white' }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim() || !newText.trim() || isSaving}
              className="p-1.5 rounded-lg transition disabled:opacity-50"
              style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-gray-900" />}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewLabel('');
                setNewText('');
              }}
              className="p-1.5 rounded-lg transition"
              style={{ backgroundColor: COLORS.pink, border: '1px solid #000' }}
            >
              <X size={14} className="text-gray-900" />
            </button>
          </div>
        )}

        {/* Quick-Insert Buttons - Compact Grid */}
        <div
          className="grid gap-1.5 max-h-[200px] overflow-y-auto pr-1"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          }}
        >
          {filteredItems.length === 0 && !showAddForm ? (
            <p className="text-xs text-gray-500 italic col-span-full py-2">
              No phrases for this category/field.
              {editMode && ' Click "Add" above to create one.'}
            </p>
          ) : (
            filteredItems.map((item) => (
              editingId === item.id ? (
                // Edit form for this item
                <div
                  key={item.id}
                  className="col-span-full flex items-center gap-2 rounded-lg p-2"
                  style={{ backgroundColor: COLORS.cream, border: NEO_BORDER }}
                >
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Label"
                    className="flex-1 min-w-0 px-2 py-1 text-xs rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                    style={{ border: '1px solid #000', backgroundColor: 'white' }}
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Text to insert"
                    className="flex-[2] min-w-0 px-2 py-1 text-xs rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                    style={{ border: '1px solid #000', backgroundColor: 'white' }}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <button
                    onClick={saveEdit}
                    disabled={isSaving}
                    className="p-1 rounded-lg transition"
                    style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-gray-900" />}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 rounded-lg transition"
                    style={{ backgroundColor: COLORS.pink, border: '1px solid #000' }}
                  >
                    <X size={14} className="text-gray-900" />
                  </button>
                </div>
              ) : (
                // Compact button with delete in edit mode
                <div key={item.id} className="relative group">
                  <button
                    onClick={() => handleInsert(item.text)}
                    className={`w-full px-2 py-1.5 text-xs font-medium rounded-lg transition-all hover:-translate-y-0.5 text-left truncate`}
                    style={{
                      backgroundColor: '#F3F4F6',
                      border: '1px solid #000',
                      boxShadow: '2px 2px 0 #000',
                    }}
                    title={`${item.label}: ${item.text}`}
                  >
                    {item.label}
                  </button>
                  {editMode && (
                    <div className="absolute -top-1 -right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(item.id, item.label, item.text);
                        }}
                        className="p-1 rounded-full bg-white shadow-sm hover:bg-gray-100"
                        style={{ border: '1px solid #000' }}
                        title="Edit"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(item.id);
                        }}
                        className="p-1 rounded-full bg-white shadow-sm hover:bg-red-100"
                        style={{ border: '1px solid #000' }}
                        title="Delete"
                      >
                        <X size={10} className="text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              )
            ))
          )}
        </div>

        {/* Field indicator */}
        <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-400 text-right">
          inserting into: {field}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Phrase"
        description="Are you sure you want to delete this quick option? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset to Defaults"
        description="This will remove all your custom phrases and restore the default options. Are you sure?"
        confirmLabel="Reset All"
        variant="destructive"
        onConfirm={handleReset}
      />

      {/* Browse All Modal */}
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
