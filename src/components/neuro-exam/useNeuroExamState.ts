'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type LocId, type LocExamState, type LocTemplate, type NeuroExamData } from './types';
import { INITIAL_LOC_STATE, getDefaultData } from './constants';

function validateExamState(raw: unknown): LocExamState {
  const defaults = INITIAL_LOC_STATE();
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 2) return defaults;
  return {
    version: 2,
    activeLoc: (typeof obj.activeLoc === 'string' && ['prosencephalon','brainstem','cerebellum','periph_vest','c1c5','c6t2','t3l3','l4s3','multifocal'].includes(obj.activeLoc))
      ? obj.activeLoc as LocId : defaults.activeLoc,
    species: obj.species === 'Cat' ? 'Cat' : 'Dog',
    data: (obj.data && typeof obj.data === 'object') ? { ...getDefaultData(), ...(obj.data as Record<string,unknown>) } : defaults.data,
    reportLocked: Boolean(obj.reportLocked),
    report: typeof obj.report === 'string' ? obj.report : '',
    ddxSelections: (obj.ddxSelections && typeof obj.ddxSelections === 'object') ? obj.ddxSelections as Record<string,boolean> : {},
  };
}

export function useNeuroExamState() {
  const { toast } = useToast();
  const [examState, setExamState] = useState<LocExamState>(INITIAL_LOC_STATE());
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const hasLoadedRef = useRef(false);

  // --- Load / Create exam ---
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadExam = async () => {
      try {
        const draftId = localStorage.getItem('neuro-exam-draft-id');
        if (draftId) {
          try {
            const response = await fetch(`/api/neuro-exams/${draftId}`);
            if (response.ok) {
              const exam = await response.json();
              const loaded = exam.sections;
              // Detect old 18-section format (no version field) — start fresh
              if (!loaded || loaded.version !== 2) {
                setCurrentExamId(exam.id);
                setExamState(INITIAL_LOC_STATE());
              } else {
                setCurrentExamId(exam.id);
                setExamState(validateExamState(loaded));
              }
            } else {
              await createNewExam();
            }
          } catch (fetchError) {
            // DB fetch failed — try localStorage backup
            console.warn('DB fetch failed, trying localStorage backup:', fetchError);
            const backup = localStorage.getItem(`neuro-exam-backup-${draftId}`);
            if (backup) {
              const parsed = JSON.parse(backup);
              if (parsed && parsed.version === 2) {
                setCurrentExamId(draftId);
                setExamState(validateExamState(parsed));
              } else {
                setCurrentExamId(draftId);
                setExamState(INITIAL_LOC_STATE());
              }
              toast({ title: 'Offline mode', description: 'Loaded from local backup. Changes will sync when connection restores.', variant: 'destructive' });
            } else {
              throw fetchError;
            }
          }
        } else {
          await createNewExam();
        }
      } catch (error) {
        console.error('Error loading exam:', error);
        toast({ title: 'Error', description: 'Failed to load exam. Starting fresh.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    const createNewExam = async () => {
      try {
        const response = await fetch('/api/neuro-exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: INITIAL_LOC_STATE() }),
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
  }, [toast]);

  // --- localStorage backup + auto-save with 1-second debounce ---
  useEffect(() => {
    if (!currentExamId || isLoading) return;

    // Immediate localStorage backup (cheap, synchronous)
    try {
      localStorage.setItem(`neuro-exam-backup-${currentExamId}`, JSON.stringify(examState));
    } catch {
      // localStorage full or unavailable
    }

    // Debounced DB save
    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/neuro-exams/${currentExamId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: examState }),
        });
        if (!response.ok) {
          throw new Error(`Auto-save returned ${response.status}`);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast({ title: 'Auto-save failed', description: 'Changes may not be saved. Check your connection.', variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [examState, currentExamId, isLoading, toast]);

  // --- State helpers ---

  const setActiveLoc = useCallback((loc: LocId) => {
    setExamState(prev => ({ ...prev, activeLoc: loc }));
  }, []);

  const setSpecies = useCallback((species: 'Dog' | 'Cat') => {
    setExamState(prev => ({ ...prev, species }));
  }, []);

  const updateData = useCallback((key: string, value: NeuroExamData[keyof NeuroExamData]) => {
    setExamState(prev => ({
      ...prev,
      data: { ...prev.data, [key]: value },
    }));
  }, []);

  const updateCheckbox = useCallback((group: 'pros_behavior' | 'mf_areas', key: string) => {
    setExamState(prev => {
      const current = prev.data[group] as unknown as Record<string, boolean>;
      return {
        ...prev,
        data: {
          ...prev.data,
          [group]: { ...current, [key]: !current?.[key] },
        },
      };
    });
  }, []);

  const setReportLocked = useCallback((locked: boolean) => {
    setExamState(prev => ({ ...prev, reportLocked: locked }));
  }, []);

  const setReport = useCallback((text: string) => {
    setExamState(prev => ({ ...prev, report: text }));
  }, []);

  const setDdxSelections = useCallback((selections: Record<string, boolean>) => {
    setExamState(prev => ({ ...prev, ddxSelections: selections }));
  }, []);

  const resetToNormal = useCallback(() => {
    const defaults = getDefaultData();
    setExamState(prev => ({
      ...prev,
      data: { ...prev.data, ...defaults },
    }));
  }, []);

  // --- Template handling ---
  const handleApplyTemplate = useCallback((template: LocTemplate) => {
    setExamState(prev => ({
      ...prev,
      activeLoc: template.localization,
      species: template.species ?? prev.species,
      data: { ...prev.data, ...template.data },
    }));
    toast({
      title: 'Template applied!',
      description: `${template.name} findings pre-filled. You can still customize any finding.`,
      duration: 3000,
    });
  }, [toast]);

  // --- New Exam ---
  const handleNewExam = useCallback(async () => {
    if (!confirm('Start a new exam? Current exam will be saved.')) return;

    // Save current exam first (don't rely on auto-save)
    if (currentExamId) {
      try {
        await fetch(`/api/neuro-exams/${currentExamId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: examState }),
        });
      } catch {
        // Best effort — exam was already auto-saved recently
      }
    }

    // Create new exam, then clean up old backup
    try {
      const response = await fetch('/api/neuro-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: INITIAL_LOC_STATE() }),
      });
      if (response.ok) {
        const exam = await response.json();
        // Only clean up old backup after new exam is successfully created
        if (currentExamId) {
          localStorage.removeItem(`neuro-exam-backup-${currentExamId}`);
        }
        setCurrentExamId(exam.id);
        localStorage.setItem('neuro-exam-draft-id', exam.id);
        setExamState(INITIAL_LOC_STATE());
        toast({ title: 'New exam started', description: 'Previous exam saved.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not create new exam', variant: 'destructive' });
    }
  }, [currentExamId, examState, toast]);

  // --- Save / Complete ---
  const handleSaveDraft = useCallback(async () => {
    if (!currentExamId) {
      toast({ title: 'Error', description: 'No active exam to save', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await fetch(`/api/neuro-exams/${currentExamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: examState }),
      });
      toast({ title: 'Draft saved!', description: 'Your exam has been saved' });
    } catch (error) {
      toast({ title: 'Save failed', description: 'Could not save exam', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [currentExamId, examState, toast]);

  const handleComplete = useCallback(async () => {
    if (!confirm('Finalize and submit this exam?')) return;
    if (!currentExamId) {
      toast({ title: 'Error', description: 'No active exam to complete', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/neuro-exams/${currentExamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: examState }),
      });
      if (!response.ok) throw new Error(`Save returned ${response.status}`);

      localStorage.removeItem('neuro-exam-draft-id');
      localStorage.removeItem(`neuro-exam-backup-${currentExamId}`);
      toast({ title: 'Exam completed!', description: 'Your neuro exam has been saved.' });

      // Create a fresh exam
      const newResponse = await fetch('/api/neuro-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: INITIAL_LOC_STATE() }),
      });
      if (newResponse.ok) {
        const newExam = await newResponse.json();
        setCurrentExamId(newExam.id);
        localStorage.setItem('neuro-exam-draft-id', newExam.id);
        setExamState(INITIAL_LOC_STATE());
      } else {
        // Exam was saved, but couldn't create a fresh draft — user can click "New"
        setCurrentExamId(null);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save exam', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [currentExamId, examState, toast]);

  // --- Summary (now just the report field) ---
  const summary = useMemo(() => examState.report, [examState.report]);

  const copySummary = useCallback(async () => {
    const text = examState.report;
    if (!text) {
      toast({ title: 'No report', description: 'Generate a report first before copying.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Summary copied!', description: 'Neuro exam summary copied to clipboard' });
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast({ title: 'Summary copied!', description: 'Neuro exam summary copied to clipboard' });
    }
  }, [examState.report, toast]);

  return {
    examState,
    isLoading,
    isSaving,
    setActiveLoc,
    setSpecies,
    updateData,
    updateCheckbox,
    setReportLocked,
    setReport,
    setDdxSelections,
    resetToNormal,
    handleApplyTemplate,
    handleNewExam,
    handleSaveDraft,
    handleComplete,
    copySummary,
  };
}
