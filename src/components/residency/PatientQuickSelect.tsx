'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSurgeryPatients, type SurgeryPatient } from '@/hooks/use-surgery-patients';
import { ChevronDown, X, Search, User, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientQuickSelectProps {
  value: number | null; // patientId
  onChange: (patientId: number | null, patientName: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md'; // sm for compact forms, md for full forms
}

export function PatientQuickSelect({
  value,
  onChange,
  placeholder = 'Select patient...',
  className,
  size = 'md',
}: PatientQuickSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { patients, isLoading, error } = useSurgeryPatients();

  // Find selected patient
  const selectedPatient = patients.find((p) => p.id === value);

  // Filter patients by search
  const filteredPatients = search
    ? patients.filter((p) =>
        p.displayLabel.toLowerCase().includes(search.toLowerCase())
      )
    : patients;

  // Update position when opening (for Portal)
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (patient: SurgeryPatient) => {
    onChange(patient.id, patient.name);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, '');
  };

  const sizeClasses = {
    sm: 'text-xs py-1.5 px-2',
    md: 'text-sm py-2 px-3',
  };

  // Dropdown content (rendered via Portal)
  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white dark:bg-slate-900 rounded-md border shadow-lg max-h-60 overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        minWidth: 200,
      }}
    >
      {/* Search Input */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            className={cn(
              'w-full pl-7 pr-2 py-1.5 text-xs rounded border-0 bg-slate-50 dark:bg-slate-800',
              'focus:outline-none focus:ring-1 focus:ring-purple-500'
            )}
          />
        </div>
      </div>

      {/* Options List */}
      <div className="max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            Loading patients...
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-center text-xs text-red-500 flex items-center justify-center gap-2">
            <AlertCircle className="w-3 h-3" />
            Failed to load patients
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            {search ? 'No patients match your search' : 'No hospitalized patients'}
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelect(patient)}
              className={cn(
                'w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800',
                'transition-colors flex items-center gap-2 min-h-[44px]', // 44px touch target
                value === patient.id && 'bg-purple-50 dark:bg-purple-900/20'
              )}
            >
              <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{patient.displayLabel}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'w-full flex items-center justify-between rounded-md border bg-white dark:bg-slate-900',
          'hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1',
          'min-h-[44px]', // 44px touch target
          sizeClasses[size]
        )}
      >
        <span className={cn('flex items-center gap-2 truncate', !selectedPatient && 'text-muted-foreground')}>
          <User className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
          {selectedPatient ? selectedPatient.displayLabel : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedPatient && (
            <X
              className={cn(
                'hover:text-red-500 cursor-pointer',
                size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
              )}
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={cn(
              'transition-transform',
              isOpen && 'rotate-180',
              size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
            )}
          />
        </div>
      </button>

      {/* Dropdown via Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}
