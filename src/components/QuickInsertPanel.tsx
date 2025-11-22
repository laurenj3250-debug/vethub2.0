'use client';

import React, { useState } from 'react';
import { Pencil, Plus, X, Check, Trash2, RotateCcw } from 'lucide-react';
import { useQuickInsert } from '@/hooks/use-quick-insert';
import { quickInsertCategories } from '@/data/quick-insert-library';

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
    <div className="w-full bg-slate-800/95 backdrop-blur rounded border border-slate-700 p-2 mb-2 shadow-xl">
      {/* Header with Edit Toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          {quickInsertCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                px-3 py-1 text-xs font-medium rounded transition-colors
                ${activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              `}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {editMode && (
            <button
              onClick={handleReset}
              className="p-1 text-slate-400 hover:text-orange-400 transition"
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
            className={`p-1 rounded transition ${editMode ? 'text-emerald-400 bg-emerald-900/30' : 'text-slate-400 hover:text-white'}`}
            title={editMode ? 'Done editing' : 'Edit phrases'}
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {/* Quick-Insert Buttons */}
      <div className="flex flex-wrap gap-1">
        {items.length === 0 && !showAddForm ? (
          <p className="text-xs text-slate-400 italic">
            No phrases for this category. {editMode && 'Click + to add one.'}
          </p>
        ) : (
          items.map((item) => (
            editingId === item.id ? (
              // Edit form for this item
              <div key={item.id} className="flex items-center gap-1 bg-slate-900 rounded p-1 border border-emerald-500/50">
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Label"
                  className="w-20 px-2 py-1 text-xs bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Text to insert"
                  className="w-40 px-2 py-1 text-xs bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button onClick={saveEdit} className="p-1 text-emerald-400 hover:text-emerald-300">
                  <Check size={14} />
                </button>
                <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            ) : (
              // Normal button
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleInsert(item.text)}
                  className={`
                    px-2 py-1 text-xs font-medium
                    bg-slate-700 hover:bg-slate-600
                    text-slate-200 hover:text-white
                    rounded border border-slate-600
                    transition-colors whitespace-nowrap
                    ${editMode ? 'pr-12' : ''}
                  `}
                  title={item.text}
                >
                  {item.label}
                </button>
                {editMode && (
                  <div className="absolute right-0 top-0 h-full flex items-center gap-0.5 pr-1">
                    <button
                      onClick={() => startEdit(item.id, item.label, item.text)}
                      className="p-0.5 text-slate-400 hover:text-emerald-400"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-0.5 text-slate-400 hover:text-red-400"
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
            className="px-2 py-1 text-xs font-medium bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-400 rounded border border-emerald-500/50 transition flex items-center gap-1"
          >
            <Plus size={12} />
            Add
          </button>
        )}

        {/* Add form */}
        {showAddForm && (
          <div className="flex items-center gap-1 bg-slate-900 rounded p-1 border border-emerald-500/50">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              className="w-20 px-2 py-1 text-xs bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Text to insert"
              className="w-40 px-2 py-1 text-xs bg-slate-800 text-white rounded border border-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim() || !newText.trim()}
              className="p-1 text-emerald-400 hover:text-emerald-300 disabled:text-slate-600"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewLabel('');
                setNewText('');
              }}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
