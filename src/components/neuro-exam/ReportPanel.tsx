'use client';

import React from 'react';
import { Copy, ClipboardCheck, FileText } from 'lucide-react';

interface ReportPanelProps {
  report: string;
  reportLocked: boolean;
  onReportChange: (text: string) => void;
  onReportLock: (locked: boolean) => void;
  onCopy: () => void;
  copied: boolean;
  locLabel: string;
  problemCount: number;
  ddxList: string[];
  ddxSelections: Record<string, boolean>;
  onDdxToggle: (ddx: string) => void;
  onDdxToggleAll: () => void;
}

export function ReportPanel({
  report,
  reportLocked,
  onReportChange,
  onReportLock,
  onCopy,
  copied,
  locLabel,
  problemCount,
  ddxList,
  ddxSelections,
  onDdxToggle,
  onDdxToggleAll,
}: ReportPanelProps) {
  const selectedDdxCount = Object.values(ddxSelections).filter(Boolean).length;

  return (
    <div className="bg-white border-2 border-black rounded-xl shadow-[2px_2px_0_#000] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-100">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-500" />
          <span className="text-sm font-bold text-gray-900">Final Report</span>
        </div>
        <div className="flex items-center gap-2">
          {reportLocked && (
            <button
              type="button"
              onClick={() => onReportLock(false)}
              className="min-h-[36px] px-3 rounded-lg border-2 border-amber-300 bg-[#FFF3CD] text-xs font-bold text-amber-800 transition-all active:scale-95"
            >
              Resume auto-update
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="min-h-[36px] px-3 rounded-lg border-2 border-black bg-[#B8E6D4] text-xs font-bold text-gray-900 shadow-[2px_2px_0_#000] transition-all active:scale-95 flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <ClipboardCheck size={14} />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Locked editing badge */}
      {reportLocked && (
        <div className="px-4 py-2 bg-[#FFF3CD] border-b-2 border-amber-200">
          <span className="text-xs font-semibold text-amber-700">
            Editing — auto-update paused
          </span>
        </div>
      )}

      {/* Textarea */}
      <textarea
        value={report}
        onChange={(e) => {
          if (!reportLocked) {
            onReportLock(true);
          }
          onReportChange(e.target.value);
        }}
        className="w-full p-4 font-mono text-sm text-gray-900 bg-transparent border-0 outline-none resize-vertical min-h-[300px]"
      />

      {/* DDx section */}
      {ddxList.length > 0 && (
        <div className="border-t-2 border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
              Differential Diagnoses
            </span>
            <button
              type="button"
              onClick={onDdxToggleAll}
              className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              {selectedDdxCount === ddxList.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {ddxList.map((ddx) => (
              <label
                key={ddx}
                className="flex items-center gap-2.5 min-h-[36px] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={ddxSelections[ddx] ?? false}
                  onChange={() => onDdxToggle(ddx)}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <span className="text-sm text-gray-700">{ddx}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t-2 border-gray-100 bg-gray-50">
        <span className="text-[11px] font-semibold text-gray-400">
          {locLabel}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-gray-400">
            {problemCount} {problemCount === 1 ? 'finding' : 'findings'}
          </span>
          {ddxList.length > 0 && (
            <span className="text-[11px] font-semibold text-gray-400">
              {selectedDdxCount}/{ddxList.length} DDx
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
