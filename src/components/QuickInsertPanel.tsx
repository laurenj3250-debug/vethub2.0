'use client';

import React, { useState } from 'react';
import { Pencil, Plus, X, Check, Trash2, RotateCcw } from 'lucide-react';
import { useQuickInsert } from '@/hooks/use-quick-insert';
import { quickInsertCategories } from '@/data/quick-insert-library';

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
  field: 'therapeutics' | 'diagnostics' | 'concerns';
  onInsert: (text: string) => void;
}

/**
 * Quick-insert panel for rapid medication/protocol entry
 * Now with edit mode to add/edit/delete phrases
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

  const { getItems, addItem, updateItem, deleteItem, resetToDefaults } = useQuickInsert();
  const items = getItems(activeCategory, field);

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

  const saveEdit = () => {
    if (editingId && editLabel.trim() && editText.trim()) {
      updateItem(editingId, { label: editLabel.trim(), text: editText.trim() });
      setEditingId(null);
      setEditLabel('');
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditText('');
  };

  const handleAdd = () => {
    if (newLabel.trim() && newText.trim()) {
      addItem({
        label: newLabel.trim(),
        text: newText.trim(),
        category: activeCategory,
        field: field,
      });
      setNewLabel('');
      setNewText('');
      setShowAddForm(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this phrase?')) {
      deleteItem(id);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all phrases to defaults? Your custom phrases will be lost.')) {
      resetToDefaults();
    }
  };

  return (
    <div
      className="w-full rounded-xl p-3 mb-2"
      style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
    >
      {/* Header with Edit Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {quickInsertCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5`}
              style={{
                backgroundColor: activeCategory === cat.id ? COLORS.lavender : '#E5E7EB',
                border: NEO_BORDER,
                boxShadow: activeCategory === cat.id ? '2px 2px 0 #000' : 'none',
              }}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-gray-600 hover:text-orange-600 transition"
              style={{ border: '1px solid #ccc' }}
              title="Reset to defaults"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={() => {
              setEditMode(!editMode);
              setEditingId(null);
              setShowAddForm(false);
            }}
            className="p-1.5 rounded-lg transition"
            style={{
              backgroundColor: editMode ? COLORS.mint : 'white',
              border: NEO_BORDER,
            }}
            title={editMode ? 'Done editing' : 'Edit phrases'}
          >
            <Pencil size={14} className={editMode ? 'text-gray-900' : 'text-gray-600'} />
          </button>
        </div>
      </div>

      {/* Quick-Insert Buttons */}
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && !showAddForm ? (
          <p className="text-xs text-gray-500 italic">
            No phrases for this category. {editMode && 'Click + to add one.'}
          </p>
        ) : (
          items.map((item) => (
            editingId === item.id ? (
              // Edit form for this item
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg p-2"
                style={{ backgroundColor: COLORS.cream, border: NEO_BORDER }}
              >
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Label"
                  className="w-20 px-2 py-1 text-xs rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                  style={{ border: '1px solid #000', backgroundColor: 'white' }}
                />
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Text to insert"
                  className="w-40 px-2 py-1 text-xs rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                  style={{ border: '1px solid #000', backgroundColor: 'white' }}
                />
                <button
                  onClick={saveEdit}
                  className="p-1 rounded-lg transition"
                  style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
                >
                  <Check size={14} className="text-gray-900" />
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
              // Normal button
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleInsert(item.text)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 whitespace-nowrap ${editMode ? 'pr-14' : ''}`}
                  style={{
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #000',
                    boxShadow: '2px 2px 0 #000',
                  }}
                  title={item.text}
                >
                  {item.label}
                </button>
                {editMode && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => startEdit(item.id, item.label, item.text)}
                      className="p-0.5 text-gray-500 hover:text-gray-900"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-0.5 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            )
          ))
        )}

        {/* Add button in edit mode */}
        {editMode && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 flex items-center gap-1"
            style={{ backgroundColor: COLORS.mint, border: NEO_BORDER, boxShadow: '2px 2px 0 #000' }}
          >
            <Plus size={12} />
            Add
          </button>
        )}

        {/* Add form */}
        {showAddForm && (
          <div
            className="flex items-center gap-2 rounded-lg p-2"
            style={{ backgroundColor: COLORS.cream, border: NEO_BORDER }}
          >
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              className="w-20 px-2 py-1 text-xs rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
              style={{ border: '1px solid #000', backgroundColor: 'white' }}
              autoFocus
            />
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Text to insert"
              className="w-40 px-2 py-1 text-xs rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
              style={{ border: '1px solid #000', backgroundColor: 'white' }}
            />
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim() || !newText.trim()}
              className="p-1 rounded-lg transition disabled:opacity-50"
              style={{ backgroundColor: COLORS.mint, border: '1px solid #000' }}
            >
              <Check size={14} className="text-gray-900" />
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewLabel('');
                setNewText('');
              }}
              className="p-1 rounded-lg transition"
              style={{ backgroundColor: COLORS.pink, border: '1px solid #000' }}
            >
              <X size={14} className="text-gray-900" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
