'use client';

import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Sparkles className="text-cyan-400" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Paste Patient Data</h2>
              <p className="text-sm text-slate-400">AI will extract patient information for your rounding table</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
            className="w-full h-96 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition resize-none"
            disabled={isProcessing}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-900/50">
          <div className="text-sm text-slate-400">
            {pastedText.trim() ? (
              <span className="text-cyan-400">Ready to parse</span>
            ) : (
              <span>Paste your patient data above</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!pastedText.trim() || isProcessing}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
