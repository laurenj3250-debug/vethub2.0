'use client';

import { useState } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';

interface PastePreviewData {
  patientId: number;
  patientName: string;
  fields: { [key: string]: string };
  rowIndex: number;
}

interface PastePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: PastePreviewData[];
  fieldNames: string[];
}

export function PastePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  fieldNames
}: PastePreviewModalProps) {
  if (!isOpen) return null;

  const excessRows = previewData.filter(p => !p.patientId).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Check className="text-emerald-400" size={24} />
              Paste Preview
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {previewData.length} row{previewData.length > 1 ? 's' : ''} • {fieldNames.length} field{fieldNames.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="text-slate-400" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {excessRows > 0 && (
            <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg flex items-start gap-2">
              <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-yellow-200">
                <strong>Warning:</strong> {excessRows} row{excessRows > 1 ? 's' : ''} will be ignored (not enough patients to fill)
              </div>
            </div>
          )}

          <div className="space-y-3">
            {previewData.map((preview, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  preview.patientId
                    ? 'bg-slate-900/50 border-slate-700'
                    : 'bg-red-900/20 border-red-700/50'
                }`}
              >
                <div className="text-sm font-medium text-white mb-2">
                  Row {preview.rowIndex + 1}
                  {preview.patientId ? (
                    <span className="text-emerald-400 ml-2">→ {preview.patientName}</span>
                  ) : (
                    <span className="text-red-400 ml-2">→ No patient available (will be skipped)</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(preview.fields).map(([field, value]) => (
                    <div key={field} className="flex gap-2">
                      <span className="text-slate-400 font-medium">{field}:</span>
                      <span className="text-white truncate">{value || '(empty)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Check size={18} />
            Apply Paste ({previewData.filter(p => p.patientId).length} patients)
          </button>
        </div>
      </div>
    </div>
  );
}
