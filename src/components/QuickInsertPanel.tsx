'use client';

import React, { useState } from 'react';
import { getQuickInsertItems, quickInsertCategories } from '@/data/quick-insert-library';

interface QuickInsertPanelProps {
  field: 'therapeutics' | 'diagnostics' | 'concerns';
  onInsert: (text: string) => void;
}

/**
 * Quick-insert panel for rapid medication/protocol entry
 * Displays category tabs with clickable buttons that insert text into field
 */
export function QuickInsertPanel({ field, onInsert }: QuickInsertPanelProps) {
  const [activeCategory, setActiveCategory] = useState<'surgery' | 'seizures' | 'other'>('surgery');

  const items = getQuickInsertItems(activeCategory, field);

  // Handle button click - insert text into field
  const handleInsert = (text: string) => {
    onInsert(text);
  };

  return (
    <div className="w-full bg-slate-800/50 rounded border border-slate-700 p-2 mb-2">
      {/* Category Tabs */}
      <div className="flex gap-1 mb-2">
        {quickInsertCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`
              px-3 py-1 text-xs font-medium rounded transition-colors
              ${
                activeCategory === cat.id
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

      {/* Quick-Insert Buttons */}
      <div className="flex flex-wrap gap-1">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            No quick-insert items for this category
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleInsert(item.text)}
              className="
                px-2 py-1 text-xs font-medium
                bg-slate-700 hover:bg-slate-600
                text-slate-200 hover:text-white
                rounded border border-slate-600
                transition-colors
                whitespace-nowrap
              "
              title={item.text}
            >
              {item.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
