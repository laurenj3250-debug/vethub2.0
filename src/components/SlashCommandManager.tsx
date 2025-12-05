'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Search, Download, Upload } from 'lucide-react';
import { useSlashCommands, type SlashCommand } from '@/hooks/use-slash-commands';

// Field definitions for the rounding sheet
const ROUNDING_FIELDS = [
  { id: 'problems', label: 'Problems', color: '#DCC4F5' },
  { id: 'diagnosticFindings', label: 'Dx Findings', color: '#B8E6D4' },
  { id: 'therapeutics', label: 'Therapeutics', color: '#FFBDBD' },
  { id: 'overnightDx', label: 'O/N Dx', color: '#FEF3C7' },
  { id: 'concerns', label: 'O/N Concerns', color: '#DBEAFE' },
  { id: 'comments', label: 'Comments', color: '#F3F4F6' },
] as const;

type FieldId = typeof ROUNDING_FIELDS[number]['id'];

const NEO_BORDER = '2px solid #000';
const NEO_SHADOW = '4px 4px 0 #000';

export function SlashCommandManager() {
  const {
    commands,
    customCommands,
    builtInCommands,
    isLoaded,
    addCommand,
    updateCommand,
    deleteCommand,
    exportCommands,
  } = useSlashCommands();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState<FieldId | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBuiltIn, setShowBuiltIn] = useState(true);

  // Form state for adding/editing
  const [formData, setFormData] = useState<{
    trigger: string;
    label: string;
    text: string;
    field: string;
  }>({
    trigger: '',
    label: '',
    text: '',
    field: 'therapeutics',
  });

  // Filter commands by field and search
  const filteredCommands = useMemo(() => {
    if (!commands) return [];

    let result = showBuiltIn ? commands : customCommands;

    if (selectedField !== 'all') {
      result = result.filter(cmd => cmd.field === selectedField);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(cmd =>
        cmd.trigger.toLowerCase().includes(q) ||
        cmd.label.toLowerCase().includes(q) ||
        cmd.text.toLowerCase().includes(q)
      );
    }

    return result;
  }, [commands, customCommands, selectedField, searchQuery, showBuiltIn]);

  // Group by field for display
  const commandsByField = useMemo(() => {
    const grouped: Record<string, SlashCommand[]> = {};
    ROUNDING_FIELDS.forEach(field => {
      grouped[field.id] = filteredCommands.filter(cmd => cmd.field === field.id);
    });
    return grouped;
  }, [filteredCommands]);

  const handleAdd = () => {
    if (!formData.trigger || !formData.text || !formData.field) return;

    addCommand({
      trigger: formData.trigger.replace(/^\//, '').replace(/\s/g, ''),
      label: formData.label || formData.trigger,
      text: formData.text,
      field: formData.field,
    });

    setFormData({ trigger: '', label: '', text: '', field: 'therapeutics' });
    setShowAddForm(false);
  };

  const handleEdit = (cmd: SlashCommand) => {
    setEditingId(cmd.id);
    setFormData({
      trigger: cmd.trigger,
      label: cmd.label,
      text: cmd.text,
      field: cmd.field,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !formData.trigger || !formData.text) return;

    updateCommand(editingId, {
      trigger: formData.trigger.replace(/^\//, '').replace(/\s/g, ''),
      label: formData.label || formData.trigger,
      text: formData.text,
      field: formData.field,
    });

    setEditingId(null);
    setFormData({ trigger: '', label: '', text: '', field: 'therapeutics' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this command?')) {
      deleteCommand(id);
    }
  };

  const handleExport = () => {
    const data = exportCommands();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slash-commands.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading commands...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Slash Commands</h2>
            <p className="text-sm text-gray-500">
              Type <code className="bg-gray-100 px-1 rounded">/trigger</code> in any text field to quickly insert text
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-2 rounded-xl font-bold text-sm text-gray-700 transition hover:-translate-y-0.5 flex items-center gap-1.5"
              style={{ backgroundColor: '#F3F4F6', border: NEO_BORDER, boxShadow: '2px 2px 0 #000' }}
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-2"
              style={{ backgroundColor: '#B8E6D4', border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
            >
              <Plus size={16} />
              Add Command
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border-2 border-gray-200 focus:border-gray-900 focus:outline-none"
            />
          </div>

          {/* Field filter */}
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value as FieldId | 'all')}
            className="px-3 py-2 rounded-xl text-sm border-2 border-gray-200 focus:border-gray-900 focus:outline-none font-medium"
          >
            <option value="all">All Fields</option>
            {ROUNDING_FIELDS.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>

          {/* Show built-in toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showBuiltIn}
              onChange={(e) => setShowBuiltIn(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="font-medium text-gray-700">Show built-in</span>
          </label>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingId) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full"
            style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
          >
            <h3 className="text-lg font-bold mb-4">
              {editingId ? 'Edit Command' : 'Add New Command'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trigger <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">/</span>
                    <input
                      type="text"
                      value={formData.trigger}
                      onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value }))}
                      placeholder="gaba300"
                      className="w-full pl-7 pr-3 py-2 rounded-lg text-sm border-2 border-gray-200 focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">What you type to activate</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Gabapentin 300mg"
                    className="w-full px-3 py-2 rounded-lg text-sm border-2 border-gray-200 focus:border-gray-900 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Display name in menu</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text to Insert <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Gabapentin 300mg PO q8h"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm border-2 border-gray-200 focus:border-gray-900 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.field}
                  onChange={(e) => setFormData(prev => ({ ...prev, field: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border-2 border-gray-200 focus:border-gray-900 focus:outline-none"
                >
                  {ROUNDING_FIELDS.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData({ trigger: '', label: '', text: '', field: 'therapeutics' });
                }}
                className="px-4 py-2 rounded-xl font-bold text-gray-700 transition hover:-translate-y-0.5"
                style={{ border: NEO_BORDER }}
              >
                Cancel
              </button>
              <button
                onClick={editingId ? handleSaveEdit : handleAdd}
                disabled={!formData.trigger || !formData.text}
                className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 disabled:opacity-50"
                style={{ backgroundColor: '#B8E6D4', border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
              >
                {editingId ? 'Save Changes' : 'Add Command'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commands by Field */}
      <div className="space-y-4">
        {ROUNDING_FIELDS.map(field => {
          const fieldCommands = commandsByField[field.id] || [];
          if (selectedField !== 'all' && selectedField !== field.id) return null;
          if (fieldCommands.length === 0) return null;

          return (
            <div
              key={field.id}
              className="rounded-2xl overflow-hidden"
              style={{ border: NEO_BORDER, boxShadow: NEO_SHADOW }}
            >
              {/* Field Header */}
              <div
                className="px-4 py-2 font-bold text-gray-900 flex items-center justify-between"
                style={{ backgroundColor: field.color }}
              >
                <span>{field.label}</span>
                <span className="text-sm font-normal text-gray-600">
                  {fieldCommands.length} command{fieldCommands.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Commands List */}
              <div className="bg-white divide-y divide-gray-100">
                {fieldCommands.map(cmd => (
                  <div
                    key={cmd.id}
                    className="px-4 py-3 flex items-start gap-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code
                          className="px-2 py-0.5 rounded text-sm font-mono font-bold"
                          style={{ backgroundColor: field.color }}
                        >
                          /{cmd.trigger}
                        </code>
                        <span className="text-sm font-medium text-gray-700">{cmd.label}</span>
                        {cmd.isOverride ? (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            modified
                          </span>
                        ) : !cmd.isCustom ? (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            built-in
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{cmd.text}</p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(cmd)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      {cmd.isCustom && (
                        <button
                          onClick={() => handleDelete(cmd.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
                          title={cmd.isOverride ? "Reset to default" : "Delete"}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredCommands.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
          >
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? `No commands match "${searchQuery}"`
                : 'No commands yet'}
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 inline-flex items-center gap-2"
              style={{ backgroundColor: '#B8E6D4', border: NEO_BORDER, boxShadow: '3px 3px 0 #000' }}
            >
              <Plus size={16} />
              Add Your First Command
            </button>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: '#FEF3C7', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
      >
        <h3 className="font-bold text-gray-900 mb-2">How to Use</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>Type <code className="bg-white px-1 rounded">/</code> in any text field to see available commands</li>
          <li>Continue typing to filter commands (e.g., <code className="bg-white px-1 rounded">/gaba</code>)</li>
          <li>Use arrow keys to navigate, Enter to insert</li>
          <li>Commands are field-specific - only relevant ones appear in each column</li>
        </ul>
      </div>
    </div>
  );
}
