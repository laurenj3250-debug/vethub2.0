'use client';

import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';

// Neo-pop styling constants
const NEO_BORDER = '2px solid #000';
const NEO_SHADOW = '6px 6px 0 #000';
const NEO_SHADOW_SM = '4px 4px 0 #000';
const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParse: (text: string) => Promise<void>;
  isProcessing: boolean;
}

export function PasteModal({ isOpen, onClose, onParse, isProcessing }: PasteModalProps) {
  const [pastedText, setPastedText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!pastedText.trim()) return;
    await onParse(pastedText);
    setPastedText('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div
        className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col my-auto rounded-2xl"
        style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6"
          style={{ borderBottom: NEO_BORDER, backgroundColor: COLORS.lavender }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: 'white', border: NEO_BORDER }}
            >
              <Sparkles className="text-gray-900" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Paste Patient Data</h2>
              <p className="text-sm text-gray-700">AI will extract patient information for your rounding table</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition hover:-translate-y-0.5"
            style={{ backgroundColor: 'white', border: NEO_BORDER }}
          >
            <X size={24} className="text-gray-900" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: COLORS.cream }}>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste patient information here...

Examples:
- EMR exports from EzyVet/Vet Radar
- Handwritten notes about multiple patients
- Copy/paste from hospital rounds list

The AI will automatically extract:
• Patient names & ages
• Appointment times
• Presenting complaints
• Last visit info
• MRI/bloodwork results
• Current medications
• Changes since last visit
• Other notes"
            className="w-full h-96 px-4 py-3 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-[#6BB89D] focus:outline-none transition resize-none"
            style={{ border: NEO_BORDER, backgroundColor: 'white' }}
            disabled={isProcessing}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between p-6"
          style={{ borderTop: NEO_BORDER, backgroundColor: 'white' }}
        >
          <div className="text-sm font-medium">
            {pastedText.trim() ? (
              <span style={{ color: '#6BB89D' }} className="font-bold">Ready to parse</span>
            ) : (
              <span className="text-gray-500">Paste your patient data above</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5"
              style={{ backgroundColor: '#E5E7EB', border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!pastedText.trim() || isProcessing}
              className="px-6 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center gap-2"
              style={{ backgroundColor: COLORS.mint, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Parse with AI
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
