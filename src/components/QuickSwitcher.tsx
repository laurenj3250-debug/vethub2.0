'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, TableProperties, ListTodo, User, Zap, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  patients: any[];
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'patient' | 'page' | 'action';
}

export function QuickSwitcher({ isOpen, onClose, patients }: QuickSwitcherProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build search results
  const getSearchResults = useCallback((): SearchResult[] => {
    const results: SearchResult[] = [];

    // Pages
    const pages: SearchResult[] = [
      {
        id: 'home',
        title: 'Dashboard',
        subtitle: 'View all patients and tasks',
        icon: <ListTodo size={18} className="text-cyan-400" />,
        action: () => {
          router.push('/');
          onClose();
        },
        category: 'page',
      },
      {
        id: 'soap',
        title: 'SOAP Builder',
        subtitle: 'Create SOAP notes',
        icon: <FileText size={18} className="text-purple-400" />,
        action: () => {
          router.push('/soap');
          onClose();
        },
        category: 'page',
      },
      {
        id: 'rounding',
        title: 'Rounding Sheet',
        subtitle: 'Daily rounds',
        icon: <TableProperties size={18} className="text-emerald-400" />,
        action: () => {
          router.push('/rounding');
          onClose();
        },
        category: 'page',
      },
      {
        id: 'appointments',
        title: 'Appointment Schedule',
        subtitle: 'Today\'s appointments',
        icon: <TableProperties size={18} className="text-teal-400" />,
        action: () => {
          router.push('/appointments');
          onClose();
        },
        category: 'page',
      },
    ];

    // Patients - support both UnifiedPatient (demographics) and legacy (patient_info) structures
    const patientResults: SearchResult[] = patients
      .filter(p => p.status !== 'Discharged')
      .map(p => ({
        id: `patient-${p.id}`,
        title: p.demographics?.name || p.name || 'Unnamed',
        subtitle: `${p.demographics?.age || p.patient_info?.age || 'Unknown age'} ${p.demographics?.breed || p.patient_info?.breed || ''}${(p.demographics?.breed || p.patient_info?.breed) ? ' ' + (p.demographics?.species || p.patient_info?.species || 'canine') : ''}`,
        icon: <User size={18} className="text-blue-400" />,
        action: () => {
          // For now, go to dashboard and highlight patient
          // In future: go to patient detail page
          router.push(`/?patient=${p.id}`);
          onClose();
        },
        category: 'patient' as const,
      }));

    // Filter by query
    const lowerQuery = query.toLowerCase();
    if (!lowerQuery) {
      // Show all when no query
      return [...pages, ...patientResults];
    }

    // Search pages
    const matchedPages = pages.filter(
      p => p.title.toLowerCase().includes(lowerQuery) ||
           p.subtitle?.toLowerCase().includes(lowerQuery)
    );

    // Search patients
    const matchedPatients = patientResults.filter(
      p => p.title.toLowerCase().includes(lowerQuery) ||
           p.subtitle?.toLowerCase().includes(lowerQuery)
    );

    return [...matchedPages, ...matchedPatients];
  }, [query, patients, router, onClose]);

  const results = getSearchResults();

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = document.getElementById(`result-${selectedIndex}`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700">
          <Search size={20} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search patients, pages, or actions..."
            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-slate-500"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div>
              {/* Group by category */}
              {['page', 'patient'].map(category => {
                const categoryResults = results.filter(r => r.category === category);
                if (categoryResults.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide bg-slate-900/50">
                      {category === 'page' ? 'Pages' : 'Patients'}
                    </div>
                    {categoryResults.map((result, idx) => {
                      const globalIndex = results.indexOf(result);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <button
                          key={result.id}
                          id={`result-${globalIndex}`}
                          onClick={result.action}
                          className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                            isSelected
                              ? 'bg-cyan-500/20 border-l-4 border-cyan-500'
                              : 'hover:bg-slate-700/50 border-l-4 border-transparent'
                          }`}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="flex-shrink-0">
                            {result.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-white font-medium">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-slate-400 text-sm">{result.subtitle}</div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="text-xs text-cyan-400 font-bold flex items-center gap-1">
                              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">↵</kbd>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <Zap size={12} />
            <span>{results.length} results</span>
          </div>
        </div>
      </div>
    </div>
  );
}
