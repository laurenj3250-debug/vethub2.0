'use client';

import React from 'react';
import { X, Zap } from 'lucide-react';
import { LOC_TEMPLATES } from './loc-templates';
import { LOC_NAMES } from './constants';
import { type LocTemplate } from './types';

interface LocTemplateSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: (template: LocTemplate) => void;
}

export function LocTemplateSheet({ open, onClose, onApply }: LocTemplateSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-h-[70vh] bg-[#FFF8F0] border-t-2 border-black rounded-t-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[#FFF8F0] border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-gray-900" size={20} />
            <h2 className="text-lg font-black text-gray-900">Quick Templates</h2>
          </div>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOC_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onApply(template)}
              className="text-left p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:-translate-y-[1px] active:scale-[0.98] active:shadow-[1px_1px_0_#000] transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{template.icon}</span>
                <span className="text-sm font-black text-gray-900">{template.name}</span>
              </div>
              <p className="text-xs text-gray-500 font-medium mb-2">{template.description}</p>
              <span className="inline-block text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                {LOC_NAMES[template.localization] || template.localization}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
