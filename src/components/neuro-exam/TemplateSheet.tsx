'use client';

import React from 'react';
import { X, Zap } from 'lucide-react';
import { getAllTemplates } from '@/lib/neuro-exam-templates';

interface TemplateSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: (templateId: string) => void;
  appliedTemplate: string | null;
  onClear: () => void;
}

export function TemplateSheet({ open, onClose, onApply, appliedTemplate, onClear }: TemplateSheetProps) {
  if (!open) return null;

  const templates = getAllTemplates();

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-h-[80vh] bg-[#FFF8F0] border-t-2 border-black rounded-t-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[#FFF8F0] border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-gray-900" size={20} />
            <h2 className="text-lg font-black text-gray-900">Quick Templates</h2>
          </div>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {appliedTemplate && (
            <div className="flex items-center justify-between p-3 bg-[#B8E6D4] border-2 border-black rounded-xl shadow-[2px_2px_0_#000]">
              <span className="text-sm font-bold text-gray-900">
                {templates.find(t => t.id === appliedTemplate)?.name} applied
              </span>
              <button
                onClick={onClear}
                className="text-sm font-bold text-gray-700 underline"
              >
                Clear All
              </button>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Pre-fill exam with common findings. You can still customize after.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => onApply(template.id)}
                className="p-4 bg-white border-2 border-black rounded-xl text-left shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] hover:-translate-y-[1px] transition-all active:scale-95 active:shadow-[1px_1px_0_#000]"
              >
                <div className="text-2xl mb-2">{template.icon}</div>
                <div className="text-sm font-black text-gray-900 mb-1">{template.name}</div>
                <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
