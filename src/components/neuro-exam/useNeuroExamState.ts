'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getAllTemplates, applyTemplateToSections } from '@/lib/neuro-exam-templates';
import { type Sections } from './types';
import { INITIAL_SECTIONS } from './constants';

export function useNeuroExamState() {
  const { toast } = useToast();
  const [sections, setSections] = useState<Sections>(INITIAL_SECTIONS());
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
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
              setCurrentExamId(exam.id);
              setSections(exam.sections);
            } else {
              await createNewExam();
            }
          } catch (fetchError) {
            // DB fetch failed — try localStorage backup
            console.warn('DB fetch failed, trying localStorage backup:', fetchError);
            const backup = localStorage.getItem(`neuro-exam-backup-${draftId}`);
            if (backup) {
              setCurrentExamId(draftId);
              setSections(JSON.parse(backup));
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
  }, [toast]);

  // --- localStorage backup for offline resilience ---
  useEffect(() => {
    if (!currentExamId || isLoading) return;
    try {
      localStorage.setItem(`neuro-exam-backup-${currentExamId}`, JSON.stringify(sections));
    } catch {
      // localStorage full or unavailable — silently skip
    }
  }, [sections, currentExamId, isLoading]);

  // --- Auto-save with error toast ---
  useEffect(() => {
    if (!currentExamId || isLoading) return;

    const saveToDatabase = async () => {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/neuro-exams/${currentExamId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections }),
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
    };

    const timeoutId = setTimeout(saveToDatabase, 1000);
    return () => clearTimeout(timeoutId);
  }, [sections, currentExamId, isLoading, toast]);

  // --- Section state helpers ---
  const toggleSection = useCallback((id: number) => {
    setSections(prev => ({
      ...prev,
      [id]: { ...prev[id], expanded: !prev[id].expanded },
    }));
  }, []);

  const setStatus = useCallback((id: number, status: 'normal' | 'abnormal') => {
    setSections(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status,
        expanded: status === 'abnormal' ? true : prev[id].expanded,
      },
    }));
  }, []);

  const updateData = useCallback((id: number, field: string, value: any) => {
    setSections(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        data: { ...prev[id].data, [field]: value },
      },
    }));
  }, []);

  // --- Bulk-mark helpers ---
  const markGroupNormal = useCallback((sectionIds: number[]) => {
    setSections(prev => {
      const updated = { ...prev };
      for (const id of sectionIds) {
        updated[id] = { ...updated[id], status: 'normal', data: {} };
      }
      return updated;
    });
  }, []);

  // --- Template handling ---
  const handleApplyTemplate = useCallback((templateId: string) => {
    const newSections = applyTemplateToSections(templateId, sections);
    setSections(newSections);
    setAppliedTemplate(templateId);
    const template = getAllTemplates().find(t => t.id === templateId);
    toast({
      title: 'Template applied!',
      description: `${template?.name} findings pre-filled. You can still customize any section.`,
      duration: 3000,
    });
  }, [sections, toast]);

  const handleClearTemplate = useCallback(() => {
    setSections(INITIAL_SECTIONS());
    setAppliedTemplate(null);
    toast({ title: 'Exam cleared', description: 'All sections reset' });
  }, [toast]);

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
        body: JSON.stringify({ sections }),
      });
      toast({ title: 'Draft saved!', description: 'Your exam has been saved' });
    } catch (error) {
      toast({ title: 'Save failed', description: 'Could not save exam', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [currentExamId, sections, toast]);

  const handleComplete = useCallback(async () => {
    const incomplete = Object.entries(sections).filter(([_, s]) => !s.status);
    if (incomplete.length > 0) {
      const proceed = confirm(`${incomplete.length} sections incomplete. Complete anyway?`);
      if (!proceed) return;
    } else {
      const proceed = confirm('All sections complete. Finalize and submit this exam?');
      if (!proceed) return;
    }
    if (!currentExamId) {
      toast({ title: 'Error', description: 'No active exam to complete', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await fetch(`/api/neuro-exams/${currentExamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      localStorage.removeItem('neuro-exam-draft-id');
      localStorage.removeItem(`neuro-exam-backup-${currentExamId}`);
      toast({ title: 'Exam completed!', description: 'Your neuro exam has been saved to the database' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save exam', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [currentExamId, sections, toast]);

  // --- Summary Generation ---
  const generateSummary = useCallback(() => {
    const generateMentalStatus = () => {
      const s1 = sections[1];
      if (s1.status === 'normal') return 'Bright Alert and Responsive';
      if (s1.status === 'abnormal') {
        const findings: string[] = [];
        if (s1.data.mentation && s1.data.mentation !== 'Alert') findings.push(s1.data.mentation);
        const behaviors: string[] = [];
        if (s1.data.circlingL) behaviors.push('circling left');
        if (s1.data.circlingR) behaviors.push('circling right');
        if (s1.data.headPressing) behaviors.push('head pressing');
        if (s1.data.aggression) behaviors.push('aggression');
        if (s1.data.disorientation) behaviors.push('disorientation');
        if (s1.data.vocalization) behaviors.push('vocalization');
        if (behaviors.length > 0) findings.push(behaviors.join(', '));
        if (s1.data.notes) findings.push(s1.data.notes);
        return findings.length > 0 ? findings.join('; ') : 'Abnormal mentation';
      }
      return 'Not assessed';
    };

    const generateGaitPosture = () => {
      const s2 = sections[2];
      const s3 = sections[3];
      if (s2.status === 'normal' && s3.status === 'normal') return 'Ambulatory no ataxia or paresis';
      const findings: string[] = [];
      if (s2.status === 'abnormal') {
        const posture: string[] = [];
        if (s2.data.headTilt === 'L') posture.push('head tilt to left');
        if (s2.data.headTilt === 'R') posture.push('head tilt to right');
        if (s2.data.headTurn === 'L') posture.push('head turn to left');
        if (s2.data.headTurn === 'R') posture.push('head turn to right');
        if (s2.data.ventroflexion) posture.push('ventroflexion');
        if (s2.data.wideExcursionTremor) posture.push('wide excursion head tremor');
        if (s2.data.fineIntentionTremor) posture.push('fine intention tremor');
        const facialAsymm: string[] = [];
        if (s2.data.facialAsymmetryL) facialAsymm.push('left');
        if (s2.data.facialAsymmetryR) facialAsymm.push('right');
        if (facialAsymm.length > 0) posture.push(`facial asymmetry (${facialAsymm.join(', ')})`);
        const earAbn: string[] = [];
        if (s2.data.earAbnormalL) earAbn.push('left');
        if (s2.data.earAbnormalR) earAbn.push('right');
        if (earAbn.length > 0) posture.push(`abnormal ear position (${earAbn.join(', ')})`);
        if (posture.length > 0) findings.push(posture.join(', '));
        if (s2.data.notes) findings.push(s2.data.notes);
      }
      if (s3.status === 'abnormal') {
        const gait: string[] = [];
        if (s3.data.ambulatoryStatus) {
          gait.push(s3.data.ambulatoryStatus);
          if (s3.data.paresis && s3.data.paresis.length > 0) gait.push(`affecting ${s3.data.paresis.join(', ')}`);
        }
        if (s3.data.ataxiaType) gait.push(`${s3.data.ataxiaType.toLowerCase()} ataxia`);
        if (s3.data.hypermetria) gait.push('hypermetria');
        if (s3.data.hypometria) gait.push('hypometria');
        if (s3.data.circlingL) gait.push('circling left');
        if (s3.data.circlingR) gait.push('circling right');
        if (s3.data.wideBasedStance) gait.push('wide-based stance');
        if (s3.data.bunnyHopping) gait.push('bunny hopping');
        if (s3.data.dysmetria) gait.push('dysmetria');
        if (gait.length > 0) findings.push(gait.join(', '));
        if (s3.data.notes) findings.push(s3.data.notes);
      }
      if (s2.status === null && s3.status === null) return 'Not assessed';
      return findings.length > 0 ? findings.join('; ') : 'Ambulatory no ataxia or paresis';
    };

    const generateCranialNerves = () => {
      const cnSections = [4, 5, 6, 7, 8, 9, 10, 11];
      if (cnSections.every(id => sections[id].status === 'normal')) return 'No CN deficits';
      if (cnSections.every(id => sections[id].status === null)) return 'Not assessed';
      const findings: string[] = [];

      if (sections[4].status === 'abnormal' && sections[4].data.affectedSide) {
        findings.push(`absent menace response in ${sections[4].data.affectedSide.toLowerCase()}`);
        if (sections[4].data.notes) findings.push(sections[4].data.notes);
      }
      if (sections[5].status === 'abnormal') {
        const pupil: string[] = [];
        if (sections[5].data.anisocoria) pupil.push('anisocoria present');
        if (sections[5].data.mydriasisL) pupil.push('mydriasis in left eye');
        if (sections[5].data.mydriasisR) pupil.push('mydriasis in right eye');
        if (sections[5].data.miosisL) pupil.push('miosis in left eye');
        if (sections[5].data.miosisR) pupil.push('miosis in right eye');
        if (sections[5].data.poorPLRL) pupil.push('poor PLR in left eye');
        if (sections[5].data.poorPLRR) pupil.push('poor PLR in right eye');
        if (pupil.length > 0) findings.push(pupil.join(', '));
        if (sections[5].data.notes) findings.push(sections[5].data.notes);
      }
      if (sections[6].status === 'abnormal') {
        const eye: string[] = [];
        if (sections[6].data.strabismusL) eye.push('strabismus in left eye');
        if (sections[6].data.strabismusR) eye.push('strabismus in right eye');
        if (sections[6].data.ventrolateralL) eye.push('ventrolateral position left eye');
        if (sections[6].data.ventrolateralR) eye.push('ventrolateral position right eye');
        if (sections[6].data.horizontalNystagmus) eye.push('horizontal nystagmus');
        if (sections[6].data.verticalNystagmus) eye.push('vertical nystagmus');
        if (sections[6].data.rotaryNystagmus) eye.push('rotary nystagmus');
        if (sections[6].data.positionalNystagmus) eye.push('positional nystagmus');
        if (eye.length > 0) findings.push(eye.join(', '));
        if (sections[6].data.notes) findings.push(sections[6].data.notes);
      }
      if (sections[7].status === 'abnormal' && sections[7].data.affectedSide) {
        findings.push(`decreased palpebral reflex ${sections[7].data.affectedSide.toLowerCase()}`);
        if (sections[7].data.notes) findings.push(sections[7].data.notes);
      }
      if (sections[8].status === 'abnormal' && sections[8].data.affectedSide) {
        findings.push(`decreased facial sensation ${sections[8].data.affectedSide.toLowerCase()}`);
        if (sections[8].data.notes) findings.push(sections[8].data.notes);
      }
      if (sections[9].status === 'abnormal') {
        const jaw: string[] = [];
        if (sections[9].data.droppedJaw) jaw.push('dropped jaw');
        if (sections[9].data.reducedJawTone) jaw.push('reduced jaw tone');
        if (sections[9].data.facialParalysisL) jaw.push('facial paralysis left');
        if (sections[9].data.facialParalysisR) jaw.push('facial paralysis right');
        if (sections[9].data.lipDroopL) jaw.push('lip droop left');
        if (sections[9].data.lipDroopR) jaw.push('lip droop right');
        if (jaw.length > 0) findings.push(jaw.join(', '));
        if (sections[9].data.notes) findings.push(sections[9].data.notes);
      }
      if (sections[10].status === 'abnormal') {
        const tongue: string[] = [];
        if (sections[10].data.deviationL) tongue.push('tongue deviation to left');
        if (sections[10].data.deviationR) tongue.push('tongue deviation to right');
        if (sections[10].data.atrophy) tongue.push('tongue atrophy');
        if (sections[10].data.weakness) tongue.push('tongue weakness');
        if (tongue.length > 0) findings.push(tongue.join(', '));
        if (sections[10].data.notes) findings.push(sections[10].data.notes);
      }
      if (sections[11].status === 'abnormal' && sections[11].data.responseLevel) {
        findings.push(`${sections[11].data.responseLevel.toLowerCase()} gag reflex`);
        if (sections[11].data.notes) findings.push(sections[11].data.notes);
      }
      return findings.length > 0 ? findings.join('; ') : 'No CN deficits';
    };

    const generatePosturalReactions = () => {
      const s12 = sections[12];
      if (s12.status === 'normal') return 'No deficits. Hopping and Paw replacement normal';
      if (s12.status === 'abnormal') {
        const findings: string[] = [];
        if (s12.data.affectedLimbs && s12.data.affectedLimbs.length > 0) {
          const limbText = s12.data.affectedLimbs.join(', ');
          findings.push(s12.data.severity ? `${s12.data.severity} in ${limbText}` : `Deficits in ${limbText}`);
        } else if (s12.data.severity) {
          findings.push(s12.data.severity);
        }
        if (s12.data.notes) findings.push(s12.data.notes);
        return findings.length > 0 ? findings.join('; ') : 'Postural reaction deficits present';
      }
      return 'Not assessed';
    };

    const generateSpinalReflexes = () => {
      const s13 = sections[13];
      const s14 = sections[14];
      if (s13.status === 'normal' && s14.status === 'normal') return 'All reflexes normal, no deficits';
      if (s13.status === null && s14.status === null) return 'Not assessed';
      const findings: string[] = [];
      if (s13.status === 'abnormal') {
        const thoracic: string[] = [];
        if (s13.data.leftForelimb && s13.data.leftForelimb !== 'Normal') thoracic.push(`LF ${s13.data.leftForelimb.toLowerCase()}`);
        if (s13.data.rightForelimb && s13.data.rightForelimb !== 'Normal') thoracic.push(`RF ${s13.data.rightForelimb.toLowerCase()}`);
        if (thoracic.length > 0) findings.push(`Thoracic limbs: ${thoracic.join(', ')}`);
        if (s13.data.notes) findings.push(s13.data.notes);
      }
      if (s14.status === 'abnormal') {
        const pelvic: string[] = [];
        if (s14.data.leftHindlimb && s14.data.leftHindlimb !== 'Normal') pelvic.push(`LH ${s14.data.leftHindlimb.toLowerCase()}`);
        if (s14.data.rightHindlimb && s14.data.rightHindlimb !== 'Normal') pelvic.push(`RH ${s14.data.rightHindlimb.toLowerCase()}`);
        if (pelvic.length > 0) findings.push(`Pelvic limbs: ${pelvic.join(', ')}`);
        if (s14.data.notes) findings.push(s14.data.notes);
      }
      return findings.length > 0 ? findings.join('; ') : 'All reflexes normal, no deficits';
    };

    const generateTone = () => {
      const s15 = sections[15];
      const s16 = sections[16];
      if (s15.status === 'normal' && s16.status === 'normal') return 'Normal Tone';
      if (s15.status === null && s16.status === null) return 'Not assessed';
      const findings: string[] = [];
      if (s15.status === 'abnormal') {
        const tone: string[] = [];
        if (s15.data.decreased) tone.push('decreased perineal reflex');
        if (s15.data.absent) tone.push('absent perineal reflex');
        if (s15.data.toneLoss) tone.push('loss of anal tone');
        if (tone.length > 0) findings.push(tone.join(', '));
        if (s15.data.notes) findings.push(s15.data.notes);
      }
      if (s16.status === 'abnormal') {
        const pain: string[] = [];
        if (s16.data.cervicalPain) pain.push('cervical pain on palpation');
        if (s16.data.thoracicPain) pain.push('thoracic pain on palpation');
        if (s16.data.lumbarPain) pain.push('lumbar pain on palpation');
        if (s16.data.lumbosacralPain) pain.push('lumbosacral pain on palpation');
        if (s16.data.paraspinalPain) pain.push('paraspinal muscle pain');
        if (pain.length > 0) findings.push(pain.join(', '));
        if (s16.data.notes) findings.push(s16.data.notes);
      }
      return findings.length > 0 ? findings.join('; ') : 'Normal Tone';
    };

    const generateMuscleMass = () => {
      const s17 = sections[17];
      if (s17.status === 'normal') return 'Normal mass, no atrophy or excessive hypertrophy';
      if (s17.status === 'abnormal') {
        const findings: string[] = [];
        if (s17.data.muscleAtrophy && s17.data.muscleAtrophy.length > 0) findings.push(`Muscle atrophy in ${s17.data.muscleAtrophy.join(', ')}`);
        if (s17.data.jointSwelling) findings.push('joint swelling');
        if (s17.data.painOnPalpation) findings.push('pain on palpation');
        if (s17.data.decreasedROM) findings.push('decreased range of motion');
        if (s17.data.notes) findings.push(s17.data.notes);
        return findings.length > 0 ? findings.join('; ') : 'Muscle abnormalities present';
      }
      return 'Not assessed';
    };

    const generateNociception = () => {
      const s18 = sections[18];
      if (s18.status === 'normal') return 'Pain Perception intact, no hyperpathia on palpation.';
      if (s18.status === 'abnormal') {
        const absent: string[] = [];
        if (s18.data.lf) absent.push('LF');
        if (s18.data.rf) absent.push('RF');
        if (s18.data.lh) absent.push('LH');
        if (s18.data.rh) absent.push('RH');
        if (s18.data.tail) absent.push('tail');
        if (s18.data.perineum) absent.push('perineum');
        const findings: string[] = [];
        if (absent.length > 0) {
          findings.push(`Absent nociception in ${absent.join(', ')}`);
          const allLimbs = ['LF', 'RF', 'LH', 'RH'];
          const intact = allLimbs.filter(limb => !absent.includes(limb));
          if (intact.length > 0) {
            const limbType = intact.every(l => l.endsWith('F')) ? 'thoracic limbs' :
                            intact.every(l => l.endsWith('H')) ? 'pelvic limbs' :
                            intact.join(', ');
            findings.push(`Pain perception intact in ${limbType}`);
          }
        }
        if (s18.data.notes) findings.push(s18.data.notes);
        return findings.length > 0 ? findings.join('. ') + '.' : 'Pain perception abnormalities present.';
      }
      return 'Not assessed';
    };

    let summary = '**NEUROLOGIC EXAM**\n';
    summary += `**Mental Status**: ${generateMentalStatus()}\n`;
    summary += `**Gait & posture**: ${generateGaitPosture()}\n`;
    summary += `**Cranial nerves**: ${generateCranialNerves()}\n`;
    summary += `**Postural reactions**: ${generatePosturalReactions()}\n`;
    summary += `**Spinal reflexes**: ${generateSpinalReflexes()}\n`;
    summary += `**Tone**: ${generateTone()}\n`;
    summary += `**Muscle mass**: ${generateMuscleMass()}\n`;
    summary += `**Nociception**: ${generateNociception()}`;
    return summary;
  }, [sections]);

  const summary = useMemo(() => generateSummary(), [generateSummary]);

  const copySummary = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast({ title: 'Summary copied!', description: 'Neuro exam summary copied to clipboard' });
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = summary;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast({ title: 'Summary copied!', description: 'Neuro exam summary copied to clipboard' });
    }
  }, [summary, toast]);

  // Computed values
  const completed = Object.values(sections).filter(s => s.status).length;
  const total = Object.keys(sections).length;
  const progress = (completed / total) * 100;

  return {
    sections,
    setSections,
    currentExamId,
    isLoading,
    isSaving,
    appliedTemplate,
    showSummary,
    setShowSummary,
    toggleSection,
    setStatus,
    updateData,
    markGroupNormal,
    handleApplyTemplate,
    handleClearTemplate,
    handleSaveDraft,
    handleComplete,
    summary,
    generateSummary,
    copySummary,
    completed,
    total,
    progress,
  };
}
