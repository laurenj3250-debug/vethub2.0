'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Pencil, Trash2, Plus, Check, RotateCcw, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuickInsert } from '@/hooks/use-quick-insert';
import { quickInsertCategories } from '@/data/quick-insert-library';
import { ConfirmDialog } from './ConfirmDialog';

// Neo-pop styling constants
const NEO_BORDER = '2px solid #000';
const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

const FIELD_LABELS: Record<string, string> = {
  therapeutics: 'Therapeutics',
  diagnostics: 'Diagnostics',
  concerns: 'Concerns',
  problems: 'Problems',
};

interface QuickOptionsBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: 'therapeutics' | 'diagnostics' | 'concerns' | 'problems';
  onInsert: (text: string) => void;
}

/**
 * Full-screen modal to browse ALL quick options
 * With search, category tabs, field filter, and edit/delete functionality
 */
export function QuickOptionsBrowser({
  open,
  onOpenChange,
  field,
  onInsert,
}: QuickOptionsBrowserProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'surgery' | 'seizures' | 'other' | 'all'>('all');
  const [activeField, setActiveField] = useState<'therapeutics' | 'diagnostics' | 'concerns' | 'problems' | 'all'>(field);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Add new form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<'surgery' | 'seizures' | 'other'>('surgery');
  const [newField, setNewField] = useState<'therapeutics' | 'diagnostics' | 'concerns' | 'problems'>(field);

  // Confirmation dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { items, addItem, updateItem, deleteItem, resetToDefaults } = useQuickInsert();

  // Filter items based on search, category, and field
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (activeField !== 'all' && item.field !== activeField) return false;
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        return item.label.toLowerCase().includes(searchLower) || item.text.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [items, search, activeCategory, activeField]);

  // Count by category for badges
  const categoryCounts = useMemo(() => {
    const baseItems = items.filter((i) => {
      if (activeField !== 'all' && i.field !== activeField) return false;
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        return i.label.toLowerCase().includes(searchLower) || i.text.toLowerCase().includes(searchLower);
      }
      return true;
    });

    return {
      all: baseItems.length,
      surgery: baseItems.filter((i) => i.category === 'surgery').length,
      seizures: baseItems.filter((i) => i.category === 'seizures').length,
      other: baseItems.filter((i) => i.category === 'other').length,
    };
  }, [items, activeField, search]);

  const startEdit = (id: string, label: string, text: string) => {
    setEditingId(id);
    setEditLabel(label);
    setEditText(text);
  };

  const saveEdit = async () => {
    if (!editingId || !editLabel.trim() || !editText.trim()) return;
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditText('');
  };

  const handleAddNew = async () => {
    if (!newLabel.trim() || !newText.trim()) return;
    setIsSaving(true);
    try {
      await addItem({
        label: newLabel.trim(),
        text: newText.trim(),
        category: newCategory,
        field: newField,
      });
      setNewLabel('');
      setNewText('');
      setShowAddForm(false);
    } catch (e) {
      console.error('Failed to add:', e);
    } finally {
      setIsSaving(false);
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

  // Reset filters when modal opens
  React.useEffect(() => {
    if (open) {
      setSearch('');
      setActiveCategory('all');
      setActiveField(field);
      setEditingId(null);
      setShowAddForm(false);
      setNewField(field);
    }
  }, [open, field]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0"
          style={{
            backgroundColor: 'white',
            border: NEO_BORDER,
            boxShadow: '8px 8px 0 #000',
          }}
        >
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b-2 border-black shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold text-gray-900">
                Quick Options Manager
              </DialogTitle>
              <div className="flex gap-2">
                {isSaving && <Loader2 size={16} className="animate-spin text-gray-500" />}
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="px-2 py-1 text-xs font-medium rounded flex items-center gap-1 hover:bg-orange-100 transition"
                  style={{ border: '1px solid #D1D5DB' }}
                  title="Reset all to defaults"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={showAddForm}
                  className="px-2 py-1 text-xs font-bold rounded flex items-center gap-1 disabled:opacity-50 transition hover:-translate-y-0.5"
                  style={{ backgroundColor: COLORS.mint, border: NEO_BORDER }}
                >
                  <Plus size={12} />
                  Add New
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Add New Form */}
          {showAddForm && (
            <div className="p-4 border-b-2 border-black" style={{ backgroundColor: COLORS.cream }}>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Button label"
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                  style={{ border: NEO_BORDER, backgroundColor: 'white' }}
                  autoFocus
                />
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Text to insert when clicked"
                  className="flex-[2] px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                  style={{ border: NEO_BORDER, backgroundColor: 'white' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Category:</span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
                  className="px-2 py-1 text-xs rounded border border-gray-300"
                >
                  <option value="surgery">Surgery</option>
                  <option value="seizures">Seizures</option>
                  <option value="other">Other</option>
                </select>
                <span className="text-xs text-gray-600 ml-2">Field:</span>
                <select
                  value={newField}
                  onChange={(e) => setNewField(e.target.value as typeof newField)}
                  className="px-2 py-1 text-xs rounded border border-gray-300"
                >
                  <option value="therapeutics">Therapeutics</option>
                  <option value="diagnostics">Diagnostics</option>
                  <option value="concerns">Concerns</option>
                  <option value="problems">Problems</option>
                </select>
                <div className="flex-1" />
                <button
                  onClick={() => { setShowAddForm(false); setNewLabel(''); setNewText(''); }}
                  className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNew}
                  disabled={!newLabel.trim() || !newText.trim() || isSaving}
                  className="px-3 py-1 text-xs font-bold rounded disabled:opacity-50"
                  style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
                >
                  {isSaving ? '...' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="p-4 pb-3 space-y-3 shrink-0 border-b border-gray-200">
            {/* Search + Field Filter Row */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                  style={{ border: NEO_BORDER, backgroundColor: 'white' }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X size={14} className="text-gray-500" />
                  </button>
                )}
              </div>
              <select
                value={activeField}
                onChange={(e) => setActiveField(e.target.value as typeof activeField)}
                className="px-3 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                style={{ border: NEO_BORDER, backgroundColor: 'white' }}
              >
                <option value="all">All Fields</option>
                <option value="therapeutics">Therapeutics</option>
                <option value="diagnostics">Diagnostics</option>
                <option value="concerns">Concerns</option>
                <option value="problems">Problems</option>
              </select>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 flex items-center gap-1"
                style={{
                  backgroundColor: activeCategory === 'all' ? COLORS.lavender : '#E5E7EB',
                  border: NEO_BORDER,
                  boxShadow: activeCategory === 'all' ? '2px 2px 0 #000' : 'none',
                }}
              >
                All
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-medium" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                  {categoryCounts.all}
                </span>
              </button>
              {quickInsertCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 flex items-center gap-1"
                  style={{
                    backgroundColor: activeCategory === cat.id ? COLORS.lavender : '#E5E7EB',
                    border: NEO_BORDER,
                    boxShadow: activeCategory === cat.id ? '2px 2px 0 #000' : 'none',
                  }}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                  <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-medium" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                    {categoryCounts[cat.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium">No options found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters, or add a new option</p>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {filteredItems.map((item) => (
                  editingId === item.id ? (
                    // Edit form
                    <div
                      key={item.id}
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: COLORS.cream, border: NEO_BORDER }}
                    >
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Label"
                        className="w-full px-2 py-1.5 text-sm rounded mb-2 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                        style={{ border: '1px solid #000', backgroundColor: 'white' }}
                        autoFocus
                      />
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder="Text to insert"
                        className="w-full px-2 py-1.5 text-sm rounded mb-2 focus:outline-none focus:ring-2 focus:ring-[#6BB89D] resize-none"
                        style={{ border: '1px solid #000', backgroundColor: 'white' }}
                        rows={3}
                      />
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded hover:bg-gray-200"
                          style={{ border: '1px solid #000' }}
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="p-1.5 rounded"
                          style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
                        >
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display card
                    <div
                      key={item.id}
                      className="p-3 rounded-lg relative group cursor-pointer hover:-translate-y-0.5 transition-all"
                      style={{
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #000',
                        boxShadow: '2px 2px 0 #000',
                      }}
                      onClick={() => onInsert(item.text)}
                    >
                      <div className="font-bold text-sm truncate pr-14">{item.label}</div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{item.text}</div>
                      <div className="flex gap-1 mt-2">
                        <span className="px-1.5 py-0.5 text-[9px] rounded font-medium" style={{ backgroundColor: COLORS.lavender }}>
                          {item.category}
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] rounded font-medium" style={{ backgroundColor: COLORS.mint }}>
                          {item.field}
                        </span>
                      </div>
                      {/* Edit/Delete buttons - always visible */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(item.id, item.label, item.text);
                          }}
                          className="p-1.5 rounded bg-white hover:bg-blue-50 transition-colors"
                          style={{ border: '1px solid #D1D5DB' }}
                          title="Edit"
                        >
                          <Pencil size={12} className="text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(item.id);
                          }}
                          className="p-1.5 rounded bg-white hover:bg-red-50 transition-colors"
                          style={{ border: '1px solid #D1D5DB' }}
                          title="Delete"
                        >
                          <Trash2 size={12} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 text-xs text-gray-500 text-center shrink-0">
            Click any option to insert into <strong>{FIELD_LABELS[field]}</strong> • Hover to edit or delete
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Option"
        description="Are you sure you want to delete this quick option? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Reset Confirmation */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset to Defaults"
        description="This will remove all your custom options and restore the defaults. Are you sure?"
        confirmLabel="Reset All"
        variant="destructive"
        onConfirm={handleReset}
      />
    </>
  );
}
