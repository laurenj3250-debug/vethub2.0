'use client';

import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Circle, Copy, Zap, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { getAllTemplates, applyTemplateToSections, NEURO_EXAM_TEMPLATES } from '@/lib/neuro-exam-templates';

interface SectionData {
  status: 'normal' | 'abnormal' | null;
  expanded: boolean;
  data: Record<string, any>;
}

interface Sections {
  [key: number]: SectionData;
}

// Section metadata for compact display
const SECTION_INFO: Record<number, { short: string; full: string; category: string }> = {
  1: { short: 'Mental', full: 'Mentation & Behavior', category: 'mental' },
  2: { short: 'Posture', full: 'Posture & Position', category: 'gait' },
  3: { short: 'Gait', full: 'Gait Evaluation', category: 'gait' },
  4: { short: 'Menace', full: 'Menace Response', category: 'cn' },
  5: { short: 'Pupils', full: 'Pupil Evaluation', category: 'cn' },
  6: { short: 'Eyes', full: 'Eye Position & Nystagmus', category: 'cn' },
  7: { short: 'Palpebral', full: 'Palpebral Reflex', category: 'cn' },
  8: { short: 'FacSens', full: 'Facial Sensation', category: 'cn' },
  9: { short: 'Jaw', full: 'Jaw & Facial Motor', category: 'cn' },
  10: { short: 'Tongue', full: 'Tongue Assessment', category: 'cn' },
  11: { short: 'Gag', full: 'Gag Reflex', category: 'cn' },
  12: { short: 'Postural', full: 'Postural Reactions', category: 'postural' },
  13: { short: 'TL Reflex', full: 'Thoracic Limb Reflexes', category: 'reflex' },
  14: { short: 'PL Reflex', full: 'Pelvic Limb Reflexes', category: 'reflex' },
  15: { short: 'Perineal', full: 'Perineal & Anal', category: 'tone' },
  16: { short: 'Spine', full: 'Spinal Palpation', category: 'pain' },
  17: { short: 'Limbs', full: 'Limb Palpation', category: 'pain' },
  18: { short: 'Deep Pain', full: 'Nociception', category: 'noci' },
};

// Abnormal findings options for each section
const ABNORMAL_OPTIONS: Record<number, { id: string; label: string }[]> = {
  1: [
    { id: 'depressed', label: 'Depressed' },
    { id: 'obtunded', label: 'Obtunded' },
    { id: 'stuporous', label: 'Stuporous' },
    { id: 'circlingL', label: 'Circling L' },
    { id: 'circlingR', label: 'Circling R' },
    { id: 'headPressing', label: 'Head pressing' },
    { id: 'disorientation', label: 'Disoriented' },
  ],
  2: [
    { id: 'headTiltL', label: 'Head tilt L' },
    { id: 'headTiltR', label: 'Head tilt R' },
    { id: 'headTurnL', label: 'Head turn L' },
    { id: 'headTurnR', label: 'Head turn R' },
    { id: 'ventroflexion', label: 'Ventroflexion' },
    { id: 'tremor', label: 'Tremor' },
  ],
  3: [
    { id: 'nonAmbPara', label: 'Non-amb paraparesis' },
    { id: 'ambPara', label: 'Amb paraparesis' },
    { id: 'nonAmbTetra', label: 'Non-amb tetraparesis' },
    { id: 'ambTetra', label: 'Amb tetraparesis' },
    { id: 'hemiparesis', label: 'Hemiparesis' },
    { id: 'monoparesis', label: 'Monoparesis' },
    { id: 'propAtaxia', label: 'GP ataxia' },
    { id: 'vestAtaxia', label: 'Vestibular ataxia' },
    { id: 'cerebellarAtaxia', label: 'Cerebellar ataxia' },
    { id: 'hypermetria', label: 'Hypermetria' },
  ],
  4: [
    { id: 'absentL', label: 'Absent L' },
    { id: 'absentR', label: 'Absent R' },
    { id: 'absentBilat', label: 'Absent bilateral' },
  ],
  5: [
    { id: 'anisocoria', label: 'Anisocoria' },
    { id: 'mydriasisL', label: 'Mydriasis L' },
    { id: 'mydriasisR', label: 'Mydriasis R' },
    { id: 'miosisL', label: 'Miosis L' },
    { id: 'miosisR', label: 'Miosis R' },
    { id: 'plrAbsentL', label: 'PLR absent L' },
    { id: 'plrAbsentR', label: 'PLR absent R' },
  ],
  6: [
    { id: 'strabismusL', label: 'Strabismus L' },
    { id: 'strabismusR', label: 'Strabismus R' },
    { id: 'horizNystagmus', label: 'Horiz nystagmus' },
    { id: 'vertNystagmus', label: 'Vert nystagmus' },
    { id: 'rotaryNystagmus', label: 'Rotary nystagmus' },
    { id: 'positionalNystagmus', label: 'Positional nystagmus' },
  ],
  7: [
    { id: 'decreasedL', label: 'Decreased L' },
    { id: 'decreasedR', label: 'Decreased R' },
    { id: 'absentL', label: 'Absent L' },
    { id: 'absentR', label: 'Absent R' },
  ],
  8: [
    { id: 'decreasedL', label: 'Decreased L' },
    { id: 'decreasedR', label: 'Decreased R' },
    { id: 'absentL', label: 'Absent L' },
    { id: 'absentR', label: 'Absent R' },
  ],
  9: [
    { id: 'droppedJaw', label: 'Dropped jaw' },
    { id: 'facialParL', label: 'Facial paralysis L' },
    { id: 'facialParR', label: 'Facial paralysis R' },
    { id: 'lipDroopL', label: 'Lip droop L' },
    { id: 'lipDroopR', label: 'Lip droop R' },
  ],
  10: [
    { id: 'deviationL', label: 'Deviation L' },
    { id: 'deviationR', label: 'Deviation R' },
    { id: 'atrophy', label: 'Atrophy' },
  ],
  11: [
    { id: 'decreased', label: 'Decreased' },
    { id: 'absent', label: 'Absent' },
  ],
  12: [
    { id: 'delayedLF', label: 'Delayed LF' },
    { id: 'delayedRF', label: 'Delayed RF' },
    { id: 'delayedLH', label: 'Delayed LH' },
    { id: 'delayedRH', label: 'Delayed RH' },
    { id: 'absentLF', label: 'Absent LF' },
    { id: 'absentRF', label: 'Absent RF' },
    { id: 'absentLH', label: 'Absent LH' },
    { id: 'absentRH', label: 'Absent RH' },
  ],
  13: [
    { id: 'decreasedL', label: 'Decreased L' },
    { id: 'decreasedR', label: 'Decreased R' },
    { id: 'increasedL', label: 'Increased L' },
    { id: 'increasedR', label: 'Increased R' },
    { id: 'absentL', label: 'Absent L' },
    { id: 'absentR', label: 'Absent R' },
  ],
  14: [
    { id: 'decreasedL', label: 'Decreased L' },
    { id: 'decreasedR', label: 'Decreased R' },
    { id: 'increasedL', label: 'Increased L' },
    { id: 'increasedR', label: 'Increased R' },
    { id: 'absentL', label: 'Absent L' },
    { id: 'absentR', label: 'Absent R' },
  ],
  15: [
    { id: 'decreased', label: 'Decreased' },
    { id: 'absent', label: 'Absent' },
    { id: 'toneLoss', label: 'Loss anal tone' },
  ],
  16: [
    { id: 'cervicalPain', label: 'Cervical pain' },
    { id: 'thoracicPain', label: 'Thoracic pain' },
    { id: 'lumbarPain', label: 'Lumbar pain' },
    { id: 'lsPain', label: 'LS pain' },
  ],
  17: [
    { id: 'atrophyLF', label: 'Atrophy LF' },
    { id: 'atrophyRF', label: 'Atrophy RF' },
    { id: 'atrophyLH', label: 'Atrophy LH' },
    { id: 'atrophyRH', label: 'Atrophy RH' },
    { id: 'painLF', label: 'Pain LF' },
    { id: 'painRF', label: 'Pain RF' },
    { id: 'painLH', label: 'Pain LH' },
    { id: 'painRH', label: 'Pain RH' },
  ],
  18: [
    { id: 'absentLF', label: 'Absent LF' },
    { id: 'absentRF', label: 'Absent RF' },
    { id: 'absentLH', label: 'Absent LH' },
    { id: 'absentRH', label: 'Absent RH' },
  ],
};

export default function NeuroExamCompact() {
  const { toast } = useToast();
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const initSections = (): Sections => {
    const s: Sections = {};
    for (let i = 1; i <= 18; i++) {
      s[i] = { status: null, expanded: false, data: {} };
    }
    return s;
  };

  const [sections, setSections] = useState<Sections>(initSections());

  // Load or create exam on mount
  useEffect(() => {
    const loadExam = async () => {
      try {
        const draftId = localStorage.getItem('neuro-exam-draft-id');
        if (draftId) {
          const response = await fetch(`/api/neuro-exams/${draftId}`);
          if (response.ok) {
            const exam = await response.json();
            setCurrentExamId(exam.id);
            setSections(exam.sections);
          } else {
            await createNewExam();
          }
        } else {
          await createNewExam();
        }
      } catch (error) {
        console.error('Error loading exam:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const createNewExam = async () => {
      try {
        const response = await fetch('/api/neuro-exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: {} }),
        });
        if (response.ok) {
          const exam = await response.json();
          setCurrentExamId(exam.id);
          localStorage.setItem('neuro-exam-draft-id', exam.id);
        }
      } catch (error) {
        console.error('Error creating exam:', error);
      }
    };

    loadExam();
  }, []);

  // Auto-save
  useEffect(() => {
    if (!currentExamId || isLoading) return;
    const saveToDatabase = async () => {
      setIsSaving(true);
      try {
        await fetch(`/api/neuro-exams/${currentExamId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections }),
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    };
    const timeoutId = setTimeout(saveToDatabase, 1000);
    return () => clearTimeout(timeoutId);
  }, [sections, currentExamId, isLoading]);

  const cycleStatus = (id: number) => {
    setSections(prev => {
      const current = prev[id].status;
      let newStatus: 'normal' | 'abnormal' | null;
      if (current === null) newStatus = 'normal';
      else if (current === 'normal') newStatus = 'abnormal';
      else newStatus = null;

      return {
        ...prev,
        [id]: { ...prev[id], status: newStatus, data: newStatus === 'abnormal' ? prev[id].data : {} }
      };
    });

    // If setting to abnormal, expand it
    setSections(prev => {
      if (prev[id].status === 'abnormal') {
        setExpandedSection(id);
      }
      return prev;
    });
  };

  const setStatus = (id: number, status: 'normal' | 'abnormal') => {
    setSections(prev => ({
      ...prev,
      [id]: { ...prev[id], status, data: status === 'abnormal' ? prev[id].data : {} }
    }));
    if (status === 'abnormal') {
      setExpandedSection(id);
    }
  };

  const toggleFinding = (sectionId: number, findingId: string) => {
    setSections(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        data: {
          ...prev[sectionId].data,
          [findingId]: !prev[sectionId].data[findingId]
        }
      }
    }));
  };

  const markCategoryNormal = (sectionIds: number[]) => {
    setSections(prev => {
      const updated = { ...prev };
      sectionIds.forEach(id => {
        updated[id] = { ...updated[id], status: 'normal', data: {} };
      });
      return updated;
    });
    toast({ title: 'Marked normal', duration: 1500 });
  };

  const handleApplyTemplate = (templateId: string) => {
    const newSections = applyTemplateToSections(templateId, sections);
    setSections(newSections);
    setShowTemplates(false);
    const template = getAllTemplates().find(t => t.id === templateId);
    toast({ title: `${template?.name} applied`, duration: 2000 });
  };

  const clearAll = () => {
    setSections(initSections());
    setExpandedSection(null);
    toast({ title: 'Cleared', duration: 1500 });
  };

  // Generate summary for clipboard
  const generateSummary = () => {
    const lines: string[] = ['**NEUROLOGIC EXAM**'];

    // Mental Status
    if (sections[1].status === 'normal') {
      lines.push('**Mental Status**: BAR');
    } else if (sections[1].status === 'abnormal') {
      const findings = Object.entries(sections[1].data).filter(([_, v]) => v).map(([k]) => {
        const opt = ABNORMAL_OPTIONS[1].find(o => o.id === k);
        return opt?.label || k;
      });
      lines.push(`**Mental Status**: ${findings.join(', ') || 'Abnormal'}`);
    }

    // Gait & Posture
    if (sections[2].status === 'normal' && sections[3].status === 'normal') {
      lines.push('**Gait & posture**: Ambulatory, no ataxia or paresis');
    } else {
      const findings: string[] = [];
      [2, 3].forEach(id => {
        if (sections[id].status === 'abnormal') {
          Object.entries(sections[id].data).filter(([_, v]) => v).forEach(([k]) => {
            const opt = ABNORMAL_OPTIONS[id].find(o => o.id === k);
            if (opt) findings.push(opt.label);
          });
        }
      });
      if (findings.length > 0) {
        lines.push(`**Gait & posture**: ${findings.join(', ')}`);
      }
    }

    // Cranial Nerves
    const cnIds = [4, 5, 6, 7, 8, 9, 10, 11];
    const allCnNormal = cnIds.every(id => sections[id].status === 'normal');
    if (allCnNormal) {
      lines.push('**Cranial nerves**: No deficits');
    } else {
      const findings: string[] = [];
      cnIds.forEach(id => {
        if (sections[id].status === 'abnormal') {
          Object.entries(sections[id].data).filter(([_, v]) => v).forEach(([k]) => {
            const opt = ABNORMAL_OPTIONS[id].find(o => o.id === k);
            if (opt) findings.push(opt.label);
          });
        }
      });
      if (findings.length > 0) {
        lines.push(`**Cranial nerves**: ${findings.join(', ')}`);
      }
    }

    // Postural Reactions
    if (sections[12].status === 'normal') {
      lines.push('**Postural reactions**: Normal all 4 limbs');
    } else if (sections[12].status === 'abnormal') {
      const findings = Object.entries(sections[12].data).filter(([_, v]) => v).map(([k]) => {
        const opt = ABNORMAL_OPTIONS[12].find(o => o.id === k);
        return opt?.label || k;
      });
      lines.push(`**Postural reactions**: ${findings.join(', ') || 'Abnormal'}`);
    }

    // Spinal Reflexes
    if (sections[13].status === 'normal' && sections[14].status === 'normal') {
      lines.push('**Spinal reflexes**: Normal all 4 limbs');
    } else {
      const findings: string[] = [];
      [13, 14].forEach(id => {
        if (sections[id].status === 'abnormal') {
          const limb = id === 13 ? 'TL' : 'PL';
          Object.entries(sections[id].data).filter(([_, v]) => v).forEach(([k]) => {
            const opt = ABNORMAL_OPTIONS[id].find(o => o.id === k);
            if (opt) findings.push(`${limb}: ${opt.label}`);
          });
        }
      });
      if (findings.length > 0) {
        lines.push(`**Spinal reflexes**: ${findings.join(', ')}`);
      }
    }

    // Tone (Perineal)
    if (sections[15].status === 'normal') {
      lines.push('**Tone**: Normal');
    } else if (sections[15].status === 'abnormal') {
      const findings = Object.entries(sections[15].data).filter(([_, v]) => v).map(([k]) => {
        const opt = ABNORMAL_OPTIONS[15].find(o => o.id === k);
        return opt?.label || k;
      });
      lines.push(`**Tone**: ${findings.join(', ') || 'Abnormal perineal'}`);
    }

    // Pain (Palpation)
    if (sections[16].status === 'normal' && sections[17].status === 'normal') {
      lines.push('**Palpation**: No spinal or limb pain');
    } else {
      const findings: string[] = [];
      [16, 17].forEach(id => {
        if (sections[id].status === 'abnormal') {
          Object.entries(sections[id].data).filter(([_, v]) => v).forEach(([k]) => {
            const opt = ABNORMAL_OPTIONS[id].find(o => o.id === k);
            if (opt) findings.push(opt.label);
          });
        }
      });
      if (findings.length > 0) {
        lines.push(`**Palpation**: ${findings.join(', ')}`);
      }
    }

    // Nociception
    if (sections[18].status === 'normal') {
      lines.push('**Nociception**: Deep pain intact all 4 limbs');
    } else if (sections[18].status === 'abnormal') {
      const findings = Object.entries(sections[18].data).filter(([_, v]) => v).map(([k]) => {
        const opt = ABNORMAL_OPTIONS[18].find(o => o.id === k);
        return opt?.label || k;
      });
      lines.push(`**Nociception**: ${findings.join(', ') || 'ABSENT'}`);
    }

    return lines.join('\n');
  };

  const copySummary = async () => {
    const summary = generateSummary();
    try {
      await navigator.clipboard.writeText(summary);
      toast({ title: 'Copied!', duration: 1500 });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const completed = Object.values(sections).filter(s => s.status).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const SectionPill = ({ id }: { id: number }) => {
    const section = sections[id];
    const info = SECTION_INFO[id];
    const isExpanded = expandedSection === id;

    const bgColor = section.status === 'normal'
      ? 'bg-emerald-900/40 border-emerald-500/50'
      : section.status === 'abnormal'
      ? 'bg-fuchsia-900/40 border-fuchsia-500/50'
      : 'bg-slate-800/50 border-slate-600/50';

    const icon = section.status === 'normal'
      ? <Check size={12} className="text-emerald-400" />
      : section.status === 'abnormal'
      ? <AlertCircle size={12} className="text-fuchsia-400" />
      : <Circle size={12} className="text-slate-500" />;

    return (
      <div className="relative">
        <button
          onClick={() => {
            if (section.status === 'abnormal') {
              setExpandedSection(isExpanded ? null : id);
            } else {
              cycleStatus(id);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setStatus(id, 'abnormal');
          }}
          className={`px-2 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${bgColor}`}
        >
          {icon}
          <span className={section.status === 'normal' ? 'text-emerald-200' : section.status === 'abnormal' ? 'text-fuchsia-200' : 'text-slate-300'}>
            {info.short}
          </span>
        </button>

        {/* Expanded abnormal options */}
        <AnimatePresence>
          {isExpanded && section.status === 'abnormal' && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 mt-1 z-50 bg-slate-900 border border-fuchsia-500/30 rounded-lg p-2 min-w-[200px] shadow-xl"
            >
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-700">
                <span className="text-xs font-medium text-fuchsia-200">{info.full}</span>
                <button onClick={() => setExpandedSection(null)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {ABNORMAL_OPTIONS[id]?.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => toggleFinding(id, opt.id)}
                    className={`px-2 py-1 rounded text-xs transition-all ${
                      sections[id].data[opt.id]
                        ? 'bg-fuchsia-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-1 border-t border-slate-700 flex gap-1">
                <button
                  onClick={() => setStatus(id, 'normal')}
                  className="px-2 py-1 rounded text-xs bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900"
                >
                  Mark Normal
                </button>
                <button
                  onClick={() => {
                    setSections(prev => ({
                      ...prev,
                      [id]: { status: null, expanded: false, data: {} }
                    }));
                    setExpandedSection(null);
                  }}
                  className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-purple-100">Neuro Exam</h1>
          <span className="text-xs text-slate-500">{completed}/18</span>
          {isSaving && <span className="text-xs text-purple-400">saving...</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-2 py-1 rounded bg-purple-900/50 text-purple-300 text-xs flex items-center gap-1 hover:bg-purple-900"
          >
            <Zap size={12} /> Templates
          </button>
          <button
            onClick={copySummary}
            className="px-2 py-1 rounded bg-emerald-900/50 text-emerald-300 text-xs flex items-center gap-1 hover:bg-emerald-900"
          >
            <Copy size={12} /> Copy
          </button>
          <button
            onClick={clearAll}
            className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs hover:bg-slate-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Templates dropdown */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-2">
              <div className="flex flex-wrap gap-1">
                {getAllTemplates().map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyTemplate(t.id)}
                    className="px-2 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-purple-900/50 hover:text-purple-200 transition-colors"
                  >
                    {t.icon} {t.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <p className="text-xs text-slate-500 mb-3">
        Tap = cycle (○ → ✓ → ⚠) • Long press / right-click = abnormal • Tap ⚠ to add findings
      </p>

      {/* Compact Grid Layout */}
      <div className="space-y-3">
        {/* Mental */}
        <div className="bg-slate-900/30 rounded-lg p-2">
          <div className="text-xs text-slate-500 mb-1.5 font-medium">MENTAL</div>
          <div className="flex flex-wrap gap-1.5">
            <SectionPill id={1} />
          </div>
        </div>

        {/* Gait & Posture */}
        <div className="bg-slate-900/30 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 font-medium">GAIT & POSTURE</span>
            <button
              onClick={() => markCategoryNormal([2, 3])}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              All Normal
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <SectionPill id={2} />
            <SectionPill id={3} />
          </div>
        </div>

        {/* Cranial Nerves */}
        <div className="bg-slate-900/30 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 font-medium">CRANIAL NERVES</span>
            <button
              onClick={() => markCategoryNormal([4, 5, 6, 7, 8, 9, 10, 11])}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              All CNs Normal
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[4, 5, 6, 7, 8, 9, 10, 11].map(id => (
              <SectionPill key={id} id={id} />
            ))}
          </div>
        </div>

        {/* Postural Reactions */}
        <div className="bg-slate-900/30 rounded-lg p-2">
          <div className="text-xs text-slate-500 mb-1.5 font-medium">POSTURAL REACTIONS</div>
          <div className="flex flex-wrap gap-1.5">
            <SectionPill id={12} />
          </div>
        </div>

        {/* Spinal Reflexes */}
        <div className="bg-slate-900/30 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 font-medium">SPINAL REFLEXES</span>
            <button
              onClick={() => markCategoryNormal([13, 14])}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              All Normal
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <SectionPill id={13} />
            <SectionPill id={14} />
          </div>
        </div>

        {/* Tone & Perineal */}
        <div className="bg-slate-900/30 rounded-lg p-2">
          <div className="text-xs text-slate-500 mb-1.5 font-medium">TONE</div>
          <div className="flex flex-wrap gap-1.5">
            <SectionPill id={15} />
          </div>
        </div>

        {/* Palpation */}
        <div className="bg-slate-900/30 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 font-medium">PALPATION</span>
            <button
              onClick={() => markCategoryNormal([16, 17])}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              All Normal
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <SectionPill id={16} />
            <SectionPill id={17} />
          </div>
        </div>

        {/* Nociception - Critical */}
        <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-2">
          <div className="text-xs text-red-400 mb-1.5 font-medium">⚠️ NOCICEPTION (critical)</div>
          <div className="flex flex-wrap gap-1.5">
            <SectionPill id={18} />
          </div>
        </div>
      </div>

      {/* Quick Summary Preview */}
      <div className="mt-4 bg-slate-900/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium">SUMMARY PREVIEW</span>
          <button
            onClick={copySummary}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Copy size={12} /> Copy
          </button>
        </div>
        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
          {generateSummary()}
        </pre>
      </div>
    </div>
  );
}
