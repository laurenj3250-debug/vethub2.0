'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, AlertCircle, Circle, Copy, Zap, X, MessageSquare, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { getAllTemplates, applyTemplateToSections } from '@/lib/neuro-exam-templates';

interface SectionData {
  status: 'normal' | 'abnormal' | null;
  expanded: boolean;
  data: Record<string, any>;
  notes?: string;
}

interface Sections {
  [key: number]: SectionData;
}

// Section metadata
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

// Abnormal findings options
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

// Template categories for organized display
const TEMPLATE_CATEGORIES = {
  'SPINAL': ['t3-l3-ivdd', 'c1-c5-myelopathy', 'c6-t2-myelopathy', 'l4-s3-lesion', 'fce', 'dm', 'wobbler', 'cauda-equina'],
  'VESTIBULAR': ['peripheral-vestibular', 'central-vestibular'],
  'BRAIN': ['forebrain', 'post-ictal', 'meningitis'],
  'NEUROMUSCULAR': ['polyneuropathy', 'myasthenia'],
  'FOCAL': ['horners', 'facial-paralysis'],
  'QUICK': ['normal-exam'],
};

export default function NeuroExamCompact() {
  const { toast } = useToast();
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bottomSheetSection, setBottomSheetSection] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [longPressId, setLongPressId] = useState<number | null>(null);

  const initSections = (): Sections => {
    const s: Sections = {};
    for (let i = 1; i <= 18; i++) {
      s[i] = { status: null, expanded: false, data: {}, notes: '' };
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

  // Tap = toggle between null and normal, or open sheet if abnormal
  const handleTap = (id: number) => {
    const section = sections[id];
    if (section.status === 'abnormal') {
      // Open bottom sheet to edit
      setBottomSheetSection(id);
    } else if (section.status === 'normal') {
      // Toggle back to null
      setSections(prev => ({
        ...prev,
        [id]: { ...prev[id], status: null, data: {} }
      }));
    } else {
      // null -> normal
      setSections(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'normal' }
      }));
    }
  };

  // Long press = set abnormal and open sheet
  const handleTouchStart = (id: number) => {
    setLongPressId(id);
    longPressTimer.current = setTimeout(() => {
      setSections(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'abnormal' }
      }));
      setBottomSheetSection(id);
      setLongPressId(null);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressId(null);
  };

  const setStatus = (id: number, status: 'normal' | 'abnormal' | null) => {
    setSections(prev => ({
      ...prev,
      [id]: { ...prev[id], status, data: status === 'abnormal' ? prev[id].data : {} }
    }));
    if (status !== 'abnormal') {
      setBottomSheetSection(null);
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

  const updateNotes = (sectionId: number, notes: string) => {
    setSections(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], notes }
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
    setBottomSheetSection(null);
    toast({ title: 'Cleared', duration: 1500 });
  };

  // Generate clinical summary
  const generateSummary = useCallback(() => {
    const lines: string[] = ['**NEUROLOGIC EXAM**'];

    // Mental Status
    if (sections[1].status === 'normal') {
      lines.push('**Mental Status**: Bright, alert, and responsive');
    } else if (sections[1].status === 'abnormal') {
      const findings = Object.entries(sections[1].data).filter(([_, v]) => v).map(([k]) => {
        const opt = ABNORMAL_OPTIONS[1].find(o => o.id === k);
        return opt?.label || k;
      });
      lines.push(`**Mental Status**: ${findings.join(', ') || 'Abnormal'}`);
      if (sections[1].notes) lines.push(`  - Note: ${sections[1].notes}`);
    }

    // Gait & Posture
    if (sections[2].status === 'normal' && sections[3].status === 'normal') {
      lines.push('**Gait & posture**: Ambulatory with no ataxia or paresis noted');
    } else {
      const findings: string[] = [];
      [2, 3].forEach(id => {
        if (sections[id].status === 'abnormal') {
          Object.entries(sections[id].data).filter(([_, v]) => v).forEach(([k]) => {
            const opt = ABNORMAL_OPTIONS[id].find(o => o.id === k);
            if (opt) findings.push(opt.label);
          });
          if (sections[id].notes) findings.push(`(${sections[id].notes})`);
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
      lines.push('**Cranial nerves**: No cranial nerve deficits detected');
    } else {
      const findings: string[] = [];
      cnIds.forEach(id => {
        if (sections[id].status === 'abnormal') {
          const sectionName = SECTION_INFO[id].short;
          const abnormals = Object.entries(sections[id].data).filter(([_, v]) => v).map(([k]) => {
            const opt = ABNORMAL_OPTIONS[id].find(o => o.id === k);
            return opt?.label || k;
          });
          if (abnormals.length > 0) {
            findings.push(`${sectionName}: ${abnormals.join(', ')}`);
          }
        }
      });
      if (findings.length > 0) {
        lines.push(`**Cranial nerves**: ${findings.join('; ')}`);
      }
    }

    // Postural Reactions
    if (sections[12].status === 'normal') {
      lines.push('**Postural reactions**: Normal proprioceptive positioning all four limbs');
    } else if (sections[12].status === 'abnormal') {
      const findings = Object.entries(sections[12].data).filter(([_, v]) => v).map(([k]) => {
        const opt = ABNORMAL_OPTIONS[12].find(o => o.id === k);
        return opt?.label || k;
      });
      lines.push(`**Postural reactions**: ${findings.join(', ') || 'Abnormal'}`);
    }

    // Spinal Reflexes
    if (sections[13].status === 'normal' && sections[14].status === 'normal') {
      lines.push('**Spinal reflexes**: Within normal limits all four limbs');
    } else {
      const findings: string[] = [];
      if (sections[13].status === 'abnormal') {
        const tl = Object.entries(sections[13].data).filter(([_, v]) => v).map(([k]) => {
          const opt = ABNORMAL_OPTIONS[13].find(o => o.id === k);
          return opt?.label || k;
        });
        if (tl.length > 0) findings.push(`Thoracic limbs: ${tl.join(', ')}`);
      }
      if (sections[14].status === 'abnormal') {
        const pl = Object.entries(sections[14].data).filter(([_, v]) => v).map(([k]) => {
          const opt = ABNORMAL_OPTIONS[14].find(o => o.id === k);
          return opt?.label || k;
        });
        if (pl.length > 0) findings.push(`Pelvic limbs: ${pl.join(', ')}`);
      }
      if (findings.length > 0) {
        lines.push(`**Spinal reflexes**: ${findings.join('; ')}`);
      }
    }

    // Tone
    if (sections[15].status === 'normal') {
      lines.push('**Tone**: Normal perineal reflex and anal tone');
    } else if (sections[15].status === 'abnormal') {
      const findings = Object.entries(sections[15].data).filter(([_, v]) => v).map(([k]) => {
        const opt = ABNORMAL_OPTIONS[15].find(o => o.id === k);
        return opt?.label || k;
      });
      lines.push(`**Tone**: ${findings.join(', ') || 'Abnormal'}`);
    }

    // Palpation
    if (sections[16].status === 'normal' && sections[17].status === 'normal') {
      lines.push('**Palpation**: No spinal hyperesthesia or limb pain on palpation');
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
      lines.push('**Nociception**: Deep pain perception intact all four limbs');
    } else if (sections[18].status === 'abnormal') {
      const findings = Object.entries(sections[18].data).filter(([_, v]) => v).map(([k]) => {
        const opt = ABNORMAL_OPTIONS[18].find(o => o.id === k);
        return opt?.label || k;
      });
      lines.push(`**Nociception**: ABSENT - ${findings.join(', ')}`);
    }

    return lines.join('\n');
  }, [sections]);

  const copySummary = async () => {
    const summary = generateSummary();
    try {
      await navigator.clipboard.writeText(summary);
      toast({ title: 'Copied to clipboard!', duration: 1500 });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const completed = Object.values(sections).filter(s => s.status).length;
  const abnormalCount = Object.values(sections).filter(s => s.status === 'abnormal').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  // Section Pill Component
  const SectionPill = ({ id }: { id: number }) => {
    const section = sections[id];
    const info = SECTION_INFO[id];
    const isLongPressing = longPressId === id;

    return (
      <motion.button
        onTouchStart={() => handleTouchStart(id)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={() => handleTap(id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setSections(prev => ({ ...prev, [id]: { ...prev[id], status: 'abnormal' } }));
          setBottomSheetSection(id);
        }}
        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all select-none ${
          section.status === 'normal'
            ? 'bg-emerald-900/40 border-emerald-500/50'
            : section.status === 'abnormal'
            ? 'bg-fuchsia-900/40 border-fuchsia-500/50'
            : 'bg-slate-800/50 border-slate-600/50'
        }`}
        whileTap={{ scale: 0.95 }}
        animate={{
          scale: isLongPressing ? 0.9 : 1,
          backgroundColor: isLongPressing ? 'rgba(217, 70, 239, 0.3)' : undefined,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <motion.div
          initial={false}
          animate={{
            scale: section.status ? [1, 1.2, 1] : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {section.status === 'normal' ? (
            <Check size={12} className="text-emerald-400" />
          ) : section.status === 'abnormal' ? (
            <AlertCircle size={12} className="text-fuchsia-400" />
          ) : (
            <Circle size={12} className="text-slate-500" />
          )}
        </motion.div>
        <span className={
          section.status === 'normal' ? 'text-emerald-200' :
          section.status === 'abnormal' ? 'text-fuchsia-200' :
          'text-slate-300'
        }>
          {info.short}
        </span>
        {section.notes && <MessageSquare size={10} className="text-slate-400" />}
      </motion.button>
    );
  };

  // Category Row Component
  const CategoryRow = ({ title, ids, showBulk = true }: { title: string; ids: number[]; showBulk?: boolean }) => (
    <motion.div
      className="bg-slate-900/30 rounded-lg p-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500 font-medium">{title}</span>
        <div className="flex gap-2">
          {showBulk && ids.length > 1 && (
            <button
              onClick={() => markCategoryNormal(ids)}
              className="text-xs text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all"
            >
              All Normal
            </button>
          )}
          <button
            onClick={() => setShowNotes(prev => ({ ...prev, [title]: !prev[title] }))}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            <MessageSquare size={12} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ids.map(id => <SectionPill key={id} id={id} />)}
      </div>
      <AnimatePresence>
        {showNotes[title] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <textarea
              value={ids.map(id => sections[id].notes).filter(Boolean).join('; ') || ''}
              onChange={(e) => {
                // Apply note to first section in category
                updateNotes(ids[0], e.target.value);
              }}
              className="w-full mt-2 p-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
              rows={2}
              placeholder={`Notes for ${title.toLowerCase()}...`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-40 px-3 py-2 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-purple-100">Neuro Exam</h1>
            {isSaving && (
              <motion.span
                className="text-xs text-purple-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                saving...
              </motion.span>
            )}
          </div>
          <div className="flex gap-1.5">
            <motion.button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-2 py-1 rounded bg-purple-900/50 text-purple-300 text-xs flex items-center gap-1"
              whileTap={{ scale: 0.95 }}
            >
              <Zap size={12} />
            </motion.button>
            <motion.button
              onClick={clearAll}
              className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs"
              whileTap={{ scale: 0.95 }}
            >
              Clear
            </motion.button>
          </div>
        </div>

        {/* Neural Network Progress */}
        <div className="mt-2">
          <svg viewBox="0 0 320 24" className="w-full h-6">
            {/* Connection lines */}
            {[...Array(17)].map((_, i) => (
              <motion.line
                key={`line-${i}`}
                x1={10 + i * 18}
                y1={12}
                x2={28 + i * 18}
                y2={12}
                stroke={sections[i + 1]?.status && sections[i + 2]?.status ? 'rgba(168, 85, 247, 0.6)' : 'rgba(100, 116, 139, 0.3)'}
                strokeWidth="1"
              />
            ))}
            {/* Nodes */}
            {Object.entries(sections).map(([id, section]) => {
              const x = 10 + (parseInt(id) - 1) * 18;
              return (
                <motion.circle
                  key={id}
                  cx={x}
                  cy={12}
                  r={section.status ? 5 : 4}
                  fill={
                    section.status === 'normal' ? 'rgba(16, 185, 129, 0.8)' :
                    section.status === 'abnormal' ? 'rgba(217, 70, 239, 0.8)' :
                    'rgba(100, 116, 139, 0.4)'
                  }
                  initial={false}
                  animate={{
                    scale: section.status ? [1, 1.3, 1] : 1,
                    filter: section.status ? 'drop-shadow(0 0 4px currentColor)' : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}
          </svg>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{completed}/18 assessed</span>
            {abnormalCount > 0 && <span className="text-fuchsia-400">{abnormalCount} abnormal</span>}
          </div>
        </div>
      </div>

      {/* Templates Panel */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-800"
          >
            <div className="p-3 space-y-2">
              {Object.entries(TEMPLATE_CATEGORIES).map(([category, templateIds]) => (
                <div key={category}>
                  <div className="text-xs text-slate-500 mb-1">{category}</div>
                  <div className="flex flex-wrap gap-1">
                    {templateIds.map(tid => {
                      const template = getAllTemplates().find(t => t.id === tid);
                      if (!template) return null;
                      return (
                        <motion.button
                          key={tid}
                          onClick={() => handleApplyTemplate(tid)}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-purple-900/50"
                          whileTap={{ scale: 0.95 }}
                        >
                          {template.icon} {template.name}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <div className="px-3 py-2">
        <p className="text-xs text-slate-500">
          Tap = normal • Hold = abnormal • Tap again to edit
        </p>
      </div>

      {/* Sections Grid */}
      <div className="px-3 space-y-2">
        <CategoryRow title="MENTAL" ids={[1]} showBulk={false} />
        <CategoryRow title="GAIT & POSTURE" ids={[2, 3]} />
        <CategoryRow title="CRANIAL NERVES" ids={[4, 5, 6, 7, 8, 9, 10, 11]} />
        <CategoryRow title="POSTURAL REACTIONS" ids={[12]} showBulk={false} />
        <CategoryRow title="SPINAL REFLEXES" ids={[13, 14]} />
        <CategoryRow title="TONE" ids={[15]} showBulk={false} />
        <CategoryRow title="PALPATION" ids={[16, 17]} />

        {/* Nociception - Critical */}
        <motion.div
          className="bg-red-950/30 border border-red-500/20 rounded-lg p-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-xs text-red-400 mb-1.5 font-medium flex items-center gap-1">
            <AlertCircle size={12} /> NOCICEPTION (critical)
          </div>
          <div className="flex flex-wrap gap-1.5">
            <SectionPill id={18} />
          </div>
        </motion.div>
      </div>

      {/* Floating Copy Button */}
      <motion.button
        onClick={() => setShowSummary(true)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center z-50"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
      >
        <Copy size={22} />
      </motion.button>

      {/* Bottom Sheet for Abnormal Details */}
      <AnimatePresence>
        {bottomSheetSection !== null && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBottomSheetSection(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl z-50 max-h-[70vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-4">
                {/* Handle */}
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-fuchsia-200">
                    {SECTION_INFO[bottomSheetSection].full}
                  </h3>
                  <button
                    onClick={() => setBottomSheetSection(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Findings */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {ABNORMAL_OPTIONS[bottomSheetSection]?.map(opt => (
                    <motion.button
                      key={opt.id}
                      onClick={() => toggleFinding(bottomSheetSection, opt.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        sections[bottomSheetSection].data[opt.id]
                          ? 'bg-fuchsia-600 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>

                {/* Notes */}
                <textarea
                  value={sections[bottomSheetSection].notes || ''}
                  onChange={(e) => updateNotes(bottomSheetSection, e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                  rows={2}
                  placeholder="Additional notes..."
                />

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <motion.button
                    onClick={() => setStatus(bottomSheetSection, 'normal')}
                    className="flex-1 py-2 rounded-lg bg-emerald-900/50 text-emerald-300 text-sm font-medium"
                    whileTap={{ scale: 0.98 }}
                  >
                    Mark Normal
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setStatus(bottomSheetSection, null);
                      setBottomSheetSection(null);
                    }}
                    className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium"
                    whileTap={{ scale: 0.98 }}
                  >
                    Clear
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSummary(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl z-50 max-h-[80vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="p-4">
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-200">Summary</h3>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={copySummary}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-1"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Copy size={14} /> Copy
                    </motion.button>
                    <button
                      onClick={() => setShowSummary(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-800/50 rounded-lg p-3">
                  {generateSummary()}
                </pre>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
