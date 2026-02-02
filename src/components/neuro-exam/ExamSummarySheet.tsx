'use client';

import React from 'react';
import { X, Copy, FileText } from 'lucide-react';

interface ExamSummarySheetProps {
  open: boolean;
  onClose: () => void;
  summary: string;
  onCopy: () => void;
  completed: number;
  total: number;
}

export function ExamSummarySheet({ open, onClose, summary, onCopy, completed, total }: ExamSummarySheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-h-[80vh] bg-[#FFF8F0] border-t-2 border-black rounded-t-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[#FFF8F0] border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-gray-900" size={20} />
            <h2 className="text-lg font-black text-gray-900">Exam Summary</h2>
            <span className="text-xs font-semibold text-gray-400">{completed}/{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCopy}
              className="min-h-[44px] px-4 py-2 bg-[#B8E6D4] border-2 border-black rounded-lg text-sm font-bold shadow-[2px_2px_0_#000] active:scale-95 active:shadow-[1px_1px_0_#000] transition-all flex items-center gap-1.5"
            >
              <Copy size={14} />
              Copy
            </button>
            <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <pre className="p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_#000] text-sm font-mono text-gray-900 whitespace-pre-wrap overflow-x-auto">
            {summary}
          </pre>
        </div>
      </div>
    </div>
  );
}
