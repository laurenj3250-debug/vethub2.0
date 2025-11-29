'use client';

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuickInsert } from '@/hooks/use-quick-insert';
import { quickInsertCategories } from '@/data/quick-insert-library';

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
 * With search, category tabs, and field filter
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

  const { items } = useQuickInsert();

  // Filter items based on search, category, and field
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      // Field filter
      if (activeField !== 'all' && item.field !== activeField) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        return (
          item.label.toLowerCase().includes(searchLower) ||
          item.text.toLowerCase().includes(searchLower)
        );
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

  const handleInsert = (text: string) => {
    onInsert(text);
  };

  // Reset filters when modal opens
  React.useEffect(() => {
    if (open) {
      setSearch('');
      setActiveCategory('all');
      setActiveField(field);
    }
  }, [open, field]);

  return (
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
          <DialogTitle className="text-lg font-bold text-gray-900">
            Browse All Quick Options
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="p-4 pb-3 space-y-3 shrink-0 border-b border-gray-200">
          {/* Search + Field Filter Row */}
          <div className="flex gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search options..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#6BB89D]"
                style={{ border: NEO_BORDER, backgroundColor: 'white' }}
                autoFocus
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

            {/* Field Filter */}
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
              <span
                className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-medium"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
              >
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
                <span
                  className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                >
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
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              }}
            >
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleInsert(item.text)}
                  className="px-3 py-2 text-xs font-medium rounded-lg transition-all hover:-translate-y-0.5 text-left"
                  style={{
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #000',
                    boxShadow: '2px 2px 0 #000',
                  }}
                  title={`${item.label}: ${item.text}\n\nCategory: ${item.category}\nField: ${FIELD_LABELS[item.field]}`}
                >
                  <div className="font-bold truncate">{item.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {item.text}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <span
                      className="px-1.5 py-0.5 text-[9px] rounded font-medium"
                      style={{ backgroundColor: COLORS.lavender }}
                    >
                      {item.category}
                    </span>
                    <span
                      className="px-1.5 py-0.5 text-[9px] rounded font-medium"
                      style={{ backgroundColor: COLORS.mint }}
                    >
                      {item.field}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 text-xs text-gray-500 text-center shrink-0">
          Click any option to insert into <strong>{FIELD_LABELS[field]}</strong>
        </div>
      </DialogContent>
    </Dialog>
  );
}
