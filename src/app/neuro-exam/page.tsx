'use client';

import React, { useState } from 'react';
import { Brain, FileText, Loader2, ArrowLeft, Zap } from 'lucide-react';
import { useNeuroExamState } from '@/components/neuro-exam/useNeuroExamState';
import { NeuroLocFilter } from '@/components/neuro-exam/NeuroLocFilter';
import { ExamSummarySheet } from '@/components/neuro-exam/ExamSummarySheet';
import { LocTemplateSheet } from '@/components/neuro-exam/LocTemplateSheet';

export default function NeuroExamPage() {
  const {
    examState,
    isLoading,
    isSaving,
    setActiveLoc,
    setSpecies,
    updateData,
    updateDataBatch,
    updateCheckbox,
    setReportLocked,
    setReport,
    setDdxSelections,
    resetToNormal,
    handleApplyTemplate,
    handleSaveDraft,
    handleComplete,
    handleNewExam,
    copySummary,
  } = useNeuroExamState();

  const [showSummary, setShowSummary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 bg-[#FFF8F0] border-b-2 border-black">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:scale-95 transition-all"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={20} className="text-gray-900" />
            </a>
            <Brain size={20} className="text-gray-900" />
            <h1 className="text-lg font-black text-gray-900">Neuro Localization</h1>
            {isSaving && (
              <span className="text-xs font-semibold text-gray-400 ml-1">Saving...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* New Exam button */}
            <button
              onClick={handleNewExam}
              className="min-h-[44px] px-3 flex items-center gap-1 rounded-lg border-2 border-black bg-white text-gray-900 font-bold text-xs shadow-[2px_2px_0_#000] active:scale-95 active:shadow-[1px_1px_0_#000] transition-all"
            >
              New
            </button>

            {/* Templates button */}
            <button
              onClick={() => setShowTemplates(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border-2 border-black bg-white shadow-[2px_2px_0_#000] active:scale-95 active:shadow-[1px_1px_0_#000] transition-all"
              title="Templates"
            >
              <Zap size={18} className="text-gray-900" />
            </button>

            {/* Summary button */}
            {examState.report && (
              <button
                onClick={() => setShowSummary(true)}
                className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-lg border-2 border-black bg-white shadow-[2px_2px_0_#000] active:scale-95 active:shadow-[1px_1px_0_#000] transition-all"
              >
                <FileText size={16} className="text-gray-900" />
                <span className="text-xs font-bold text-gray-900">Summary</span>
              </button>
            )}

            {/* Save button */}
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="min-h-[44px] px-3 flex items-center gap-1 rounded-lg border-2 border-black bg-[#B8E6D4] text-gray-900 font-bold text-xs shadow-[2px_2px_0_#000] active:scale-95 active:shadow-[1px_1px_0_#000] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="px-4 py-4 pb-28">
        <NeuroLocFilter
          examState={examState}
          setActiveLoc={setActiveLoc}
          setSpecies={setSpecies}
          updateData={updateData}
          updateDataBatch={updateDataBatch}
          updateCheckbox={updateCheckbox}
          setReportLocked={setReportLocked}
          setReport={setReport}
          setDdxSelections={setDdxSelections}
          resetToNormal={resetToNormal}
        />
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-[#FFF8F0] border-t-2 border-black px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleComplete}
          disabled={isSaving}
          className="w-full min-h-[52px] rounded-xl border-2 border-black bg-[#B8E6D4] text-gray-900 font-black text-base shadow-[4px_4px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-[1px] active:scale-[0.98] active:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Complete Exam'}
        </button>
      </div>

      {/* ─── Summary Sheet ─── */}
      <ExamSummarySheet
        open={showSummary}
        onClose={() => setShowSummary(false)}
        summary={examState.report}
        onCopy={copySummary}
        completed={examState.report ? 1 : 0}
        total={1}
      />

      {/* ─── Template Sheet ─── */}
      <LocTemplateSheet
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApply={(template) => {
          handleApplyTemplate(template);
          setShowTemplates(false);
        }}
      />
    </div>
  );
}
