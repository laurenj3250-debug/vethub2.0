'use client';

import React, { useState } from 'react';
import { Brain, Zap, FileText, Copy, Loader2 } from 'lucide-react';
import { useNeuroExamState } from '@/components/neuro-exam/useNeuroExamState';
import { SECTION_GROUPS } from '@/components/neuro-exam/constants';
import { StepperProgress } from '@/components/neuro-exam/StepperProgress';
import { SectionGroup } from '@/components/neuro-exam/SectionGroup';
import { SectionRow } from '@/components/neuro-exam/SectionRow';
import { SectionDetail } from '@/components/neuro-exam/SectionDetail';
import { StepperNavigation } from '@/components/neuro-exam/StepperNavigation';
import { TemplateSheet } from '@/components/neuro-exam/TemplateSheet';
import { ExamSummarySheet } from '@/components/neuro-exam/ExamSummarySheet';

export default function NeuroExamMobile() {
  const {
    sections,
    isLoading,
    isSaving,
    appliedTemplate,
    toggleSection,
    setStatus,
    updateData,
    markGroupNormal,
    handleApplyTemplate,
    handleClearTemplate,
    handleSaveDraft,
    handleComplete,
    summary,
    copySummary,
    completed,
    total,
  } = useNeuroExamState();

  const [currentStep, setCurrentStep] = useState(1);
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const [showSummarySheet, setShowSummarySheet] = useState(false);

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

  // Current step's group
  const currentGroup = SECTION_GROUPS[currentStep - 1];

  // Mobile: show only current step. Desktop: show all groups.
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* ─── Compact Header (~80px) ─── */}
      <div className="sticky top-0 z-20 bg-[#FFF8F0] border-b-2 border-black">
        <div className="px-4 py-3">
          {/* Top row: title + actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-gray-900" />
              <h1 className="text-lg font-black text-gray-900">Neuro Exam</h1>
              {isSaving && (
                <span className="text-xs font-semibold text-gray-400 ml-1">Saving...</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Template button */}
              <button
                onClick={() => setShowTemplateSheet(true)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border-2 border-black bg-white shadow-[2px_2px_0_#000] active:scale-95 active:shadow-[1px_1px_0_#000] transition-all"
                title="Templates"
              >
                <Zap size={18} className="text-gray-900" />
              </button>

              {/* Summary button */}
              {completed > 0 && (
                <button
                  onClick={() => setShowSummarySheet(true)}
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

          {/* Stepper progress bar */}
          <StepperProgress
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            sections={sections}
          />

          {/* Progress text */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs font-bold text-gray-400">{completed}/{total} sections</span>
            {appliedTemplate && (
              <button
                onClick={handleClearTemplate}
                className="text-xs font-bold text-gray-500 underline"
              >
                Clear template
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="px-4 py-4 pb-36">
        {/* Mobile: show current step only */}
        <div className="md:hidden">
          <SectionGroup
            group={currentGroup}
            sections={sections}
            onBulkNormal={(ids) => markGroupNormal(ids)}
          >
            {currentGroup.sectionIds.map(sectionId => (
              <SectionRow
                key={sectionId}
                sectionId={sectionId}
                section={sections[sectionId]}
                onSetStatus={(status) => setStatus(sectionId, status)}
                onToggleExpand={() => toggleSection(sectionId)}
              >
                <SectionDetail
                  sectionId={sectionId}
                  section={sections[sectionId]}
                  updateData={(field, value) => updateData(sectionId, field, value)}
                />
              </SectionRow>
            ))}
          </SectionGroup>
        </div>

        {/* Desktop: show all groups in scrollable view */}
        <div className="hidden md:block space-y-8 max-w-3xl mx-auto">
          {SECTION_GROUPS.map(group => (
            <SectionGroup
              key={group.id}
              group={group}
              sections={sections}
              onBulkNormal={(ids) => markGroupNormal(ids)}
            >
              {group.sectionIds.map(sectionId => (
                <SectionRow
                  key={sectionId}
                  sectionId={sectionId}
                  section={sections[sectionId]}
                  onSetStatus={(status) => setStatus(sectionId, status)}
                  onToggleExpand={() => toggleSection(sectionId)}
                >
                  <SectionDetail
                    sectionId={sectionId}
                    section={sections[sectionId]}
                    updateData={(field, value) => updateData(sectionId, field, value)}
                  />
                </SectionRow>
              ))}
            </SectionGroup>
          ))}
        </div>
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-[#FFF8F0] border-t-2 border-black px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Stepper nav (mobile only) */}
        <div className="mb-3">
          <StepperNavigation
            currentStep={currentStep}
            onPrev={() => setCurrentStep(s => Math.max(1, s - 1))}
            onNext={() => setCurrentStep(s => Math.min(SECTION_GROUPS.length, s + 1))}
          />
        </div>

        {/* Complete button */}
        <button
          onClick={handleComplete}
          disabled={isSaving}
          className="w-full min-h-[52px] rounded-xl border-2 border-black bg-[#B8E6D4] text-gray-900 font-black text-base shadow-[4px_4px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-[1px] active:scale-[0.98] active:shadow-[2px_2px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : `Complete Exam (${completed}/${total})`}
        </button>
      </div>

      {/* ─── Bottom Sheets ─── */}
      <TemplateSheet
        open={showTemplateSheet}
        onClose={() => setShowTemplateSheet(false)}
        onApply={(id) => {
          handleApplyTemplate(id);
          setShowTemplateSheet(false);
        }}
        appliedTemplate={appliedTemplate}
        onClear={() => {
          handleClearTemplate();
          setShowTemplateSheet(false);
        }}
      />

      <ExamSummarySheet
        open={showSummarySheet}
        onClose={() => setShowSummarySheet(false)}
        summary={summary}
        onCopy={copySummary}
        completed={completed}
        total={total}
      />
    </div>
  );
}
