'use client';

import { useState, useRef, useEffect } from 'react';
import { Scissors } from 'lucide-react';

interface QuickSurgeryButtonProps {
  patientName: string;
  patientType: string;
  caseId?: string; // Patient ID or case number for ACVIM tracking
  onSurgeryAdded?: () => void;
}

// Common neurology surgery procedures
const SURGERY_OPTIONS = [
  { name: 'Hemilaminectomy', emoji: '🦴' },
  { name: 'Ventral Slot', emoji: '🦴' },
  { name: 'Craniotomy', emoji: '🧠' },
  { name: 'VP Shunt', emoji: '💧' },
  { name: 'Biopsy', emoji: '🔬' },
  { name: 'Other', emoji: '✂️' },
] as const;

// Participation levels
const PARTICIPATION_OPTIONS = [
  { code: 'S', label: 'Surgeon', color: '#DC2626' },
  { code: 'O', label: 'Observed', color: '#9333EA' },
  { code: 'C', label: 'Consult', color: '#2563EB' },
  { code: 'D', label: 'Discussed', color: '#059669' },
  { code: 'K', label: 'Knew About', color: '#6B7280' },
] as const;

export function QuickSurgeryButton({ patientName, patientType, caseId, onSurgeryAdded }: QuickSurgeryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Only show for Surgery-type patients
  if (patientType !== 'Surgery') {
    return null;
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedSurgery(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSurgerySelect = (surgeryName: string) => {
    setSelectedSurgery(surgeryName);
  };

  const handleParticipationSelect = async (participation: string) => {
    if (!selectedSurgery) return;

    setIsSubmitting(true);
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // 1. Ensure today's daily entry exists
      const entryRes = await fetch('/api/residency/daily-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          mriCount: 0,
          recheckCount: 0,
          newCount: 0,
        }),
      });

      if (!entryRes.ok) {
        throw new Error('Failed to create daily entry');
      }

      const dailyEntry = await entryRes.json();

      // 2. Create the surgery with case ID for ACVIM tracking
      const surgeryRes = await fetch('/api/residency/surgery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyEntryId: dailyEntry.id,
          procedureName: selectedSurgery,
          participation,
          patientName: caseId ? `${patientName} (${caseId})` : patientName,
        }),
      });

      if (!surgeryRes.ok) {
        throw new Error('Failed to log surgery');
      }

      // Success!
      setIsOpen(false);
      setSelectedSurgery(null);
      onSurgeryAdded?.();

    } catch (error) {
      console.error('Error logging surgery:', error);
      alert('Failed to log surgery. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block z-[100]" ref={popoverRef}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
          setSelectedSurgery(null);
        }}
        className="p-1.5 rounded-lg transition hover:-translate-y-0.5"
        style={{ backgroundColor: '#FFBDBD', border: '1.5px solid #000' }}
        title={`Log surgery for ${patientName}`}
        disabled={isSubmitting}
      >
        <Scissors size={16} className="text-gray-900" />
      </button>

      {isOpen && (
        <div
          className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
          style={{ minWidth: '200px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />

          {!selectedSurgery ? (
            <>
              <div className="text-xs font-bold text-gray-700 mb-2 text-center">
                Select Surgery Type
              </div>
              <div className="space-y-1">
                {SURGERY_OPTIONS.map((surgery) => (
                  <button
                    key={surgery.name}
                    onClick={() => handleSurgerySelect(surgery.name)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition flex items-center gap-2 text-sm"
                  >
                    <span>{surgery.emoji}</span>
                    <span>{surgery.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-bold text-gray-700 mb-2 text-center">
                Your Role: {selectedSurgery}
              </div>
              <div className="space-y-1">
                {PARTICIPATION_OPTIONS.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => handleParticipationSelect(p.code)}
                    disabled={isSubmitting}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.code}
                    </span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSelectedSurgery(null)}
                className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700"
              >
                ← Back to surgery types
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
