'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check, AlertCircle, Circle, AlertTriangle, Copy, FileText, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { getAllTemplates, applyTemplateToSections } from '@/lib/neuro-exam-templates';

interface SectionData {
  status: 'normal' | 'abnormal' | null;
  expanded: boolean;
  data: Record<string, any>;
}

interface Sections {
  [key: number]: SectionData;
}

export default function NeuroExamMobile() {
  const { toast } = useToast();
  const [showSummary, setShowSummary] = useState(false);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [sections, setSections] = useState<Sections>({
    1: { status: null, expanded: false, data: {} },
    2: { status: null, expanded: false, data: {} },
    3: { status: null, expanded: false, data: {} },
    4: { status: null, expanded: false, data: {} },
    5: { status: null, expanded: false, data: {} },
    6: { status: null, expanded: false, data: {} },
    7: { status: null, expanded: false, data: {} },
    8: { status: null, expanded: false, data: {} },
    9: { status: null, expanded: false, data: {} },
    10: { status: null, expanded: false, data: {} },
    11: { status: null, expanded: false, data: {} },
    12: { status: null, expanded: false, data: {} },
    13: { status: null, expanded: false, data: {} },
    14: { status: null, expanded: false, data: {} },
    15: { status: null, expanded: false, data: {} },
    16: { status: null, expanded: false, data: {} },
    17: { status: null, expanded: false, data: {} },
    18: { status: null, expanded: false, data: {} },
  });

  // Load or create exam on mount
  useEffect(() => {
    const loadExam = async () => {
      try {
        // Check for draft in localStorage first
        const draftId = localStorage.getItem('neuro-exam-draft-id');

        if (draftId) {
          // Load existing draft from database
          const response = await fetch(`/api/neuro-exams/${draftId}`);
          if (response.ok) {
            const exam = await response.json();
            setCurrentExamId(exam.id);
            setSections(exam.sections);
            console.log('Loaded existing draft:', exam.id);
          } else {
            // Draft not found, create new
            await createNewExam();
          }
        } else {
          // No draft, create new exam
          await createNewExam();
        }
      } catch (error) {
        console.error('Error loading exam:', error);
        toast({
          title: 'Error',
          description: 'Failed to load exam. Starting fresh.',
          variant: 'destructive'
        });
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
          console.log('Created new exam:', exam.id);
        }
      } catch (error) {
        console.error('Error creating exam:', error);
      }
    };

    loadExam();
  }, [toast]);

  const toggleSection = (id: number) => {
    setSections(prev => ({
      ...prev,
      [id]: { ...prev[id], expanded: !prev[id].expanded }
    }));
  };

  const setStatus = (id: number, status: 'normal' | 'abnormal') => {
    setSections(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status,
        // Auto-expand when "Abnormal" is selected
        expanded: status === 'abnormal' ? true : prev[id].expanded
      }
    }));
  };

  const updateData = (id: number, field: string, value: any) => {
    setSections(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        data: { ...prev[id].data, [field]: value }
      }
    }));
  };

  // Bulk action handlers
  const markAllCranialNervesNormal = () => {
    setSections(prev => {
      const updated = { ...prev };
      // Mark sections 4-11 (all cranial nerve sections) as normal
      for (let i = 4; i <= 11; i++) {
        updated[i] = { ...updated[i], status: 'normal', data: {} };
      }
      return updated;
    });
    toast({
      title: 'All cranial nerves marked normal',
      description: 'Sections 4-11 set to normal status',
      duration: 2000
    });
  };

  const markAllPosturalReactionsNormal = () => {
    setSections(prev => ({
      ...prev,
      12: { ...prev[12], status: 'normal', data: {} }
    }));
    toast({
      title: 'All postural reactions marked normal',
      description: 'Section 12 set to normal status',
      duration: 2000
    });
  };

  const markAllReflexesNormal = () => {
    setSections(prev => ({
      ...prev,
      13: { ...prev[13], status: 'normal', data: {} },
      14: { ...prev[14], status: 'normal', data: {} }
    }));
    toast({
      title: 'All reflexes marked normal',
      description: 'Sections 13-14 set to normal status',
      duration: 2000
    });
  };

  const markAllToneNormal = () => {
    setSections(prev => ({
      ...prev,
      15: { ...prev[15], status: 'normal', data: {} },
      16: { ...prev[16], status: 'normal', data: {} }
    }));
    toast({
      title: 'All muscle tone marked normal',
      description: 'Sections 15-16 set to normal status',
      duration: 2000
    });
  };

  const markAllMassNormal = () => {
    setSections(prev => ({
      ...prev,
      17: { ...prev[17], status: 'normal', data: {} }
    }));
    toast({
      title: 'All muscle mass marked normal',
      description: 'Section 17 set to normal status',
      duration: 2000
    });
  };

  const getStatusIcon = (status: 'normal' | 'abnormal' | null) => {
    if (status === 'normal') {
      return (
        <div className="relative">
          <Check className="text-emerald-400" size={20} style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' }} />
        </div>
      );
    }
    if (status === 'abnormal') {
      return (
        <div className="relative">
          <AlertCircle className="text-fuchsia-400" size={20} style={{ filter: 'drop-shadow(0 0 8px rgba(217, 70, 239, 0.8))' }} />
        </div>
      );
    }
    return <Circle className="text-purple-500/50" size={20} />;
  };

  const completed = Object.values(sections).filter(s => s.status).length;
  const total = Object.keys(sections).length;
  const progress = (completed / total) * 100;

  // Auto-save to database when sections change
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
        console.log('Auto-saved to database');
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    };

    // Debounce auto-save by 1 second
    const timeoutId = setTimeout(saveToDatabase, 1000);
    return () => clearTimeout(timeoutId);
  }, [sections, currentExamId, isLoading]);

  const handleApplyTemplate = (templateId: string) => {
    const newSections = applyTemplateToSections(templateId, sections);
    setSections(newSections);
    setAppliedTemplate(templateId);
    setShowTemplates(false);

    const template = getAllTemplates().find(t => t.id === templateId);
    toast({
      title: 'Template applied!',
      description: `${template?.name} findings pre-filled. You can still customize any section.`,
      duration: 3000
    });
  };

  const handleClearTemplate = () => {
    const clearedSections: Sections = {};
    for (let i = 1; i <= 18; i++) {
      clearedSections[i] = { status: null, expanded: false, data: {} };
    }
    setSections(clearedSections);
    setAppliedTemplate(null);
    setShowTemplates(true);
    toast({
      title: 'Exam cleared',
      description: 'All sections reset'
    });
  };

  const handleSaveDraft = async () => {
    if (!currentExamId) {
      toast({
        title: 'Error',
        description: 'No active exam to save',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      await fetch(`/api/neuro-exams/${currentExamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      toast({
        title: 'Draft saved!',
        description: 'Your exam has been saved'
      });
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: 'Save failed',
        description: 'Could not save exam',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateSummary = () => {
    // Helper functions to generate clinical language for each field

    const generateMentalStatus = () => {
      const s1 = sections[1];
      if (s1.status === 'normal') {
        return 'Bright Alert and Responsive';
      } else if (s1.status === 'abnormal') {
        const findings: string[] = [];

        // Mentation level
        if (s1.data.mentation && s1.data.mentation !== 'Alert') {
          findings.push(s1.data.mentation);
        }

        // Behavior abnormalities
        const behaviors: string[] = [];
        if (s1.data.circlingL) behaviors.push('circling left');
        if (s1.data.circlingR) behaviors.push('circling right');
        if (s1.data.headPressing) behaviors.push('head pressing');
        if (s1.data.aggression) behaviors.push('aggression');
        if (s1.data.disorientation) behaviors.push('disorientation');
        if (s1.data.vocalization) behaviors.push('vocalization');

        if (behaviors.length > 0) {
          findings.push(behaviors.join(', '));
        }

        if (s1.data.notes) {
          findings.push(s1.data.notes);
        }

        return findings.length > 0 ? findings.join('; ') : 'Abnormal mentation';
      }
      return 'Not assessed';
    };

    const generateGaitPosture = () => {
      const s2 = sections[2];
      const s3 = sections[3];

      // If both are normal
      if (s2.status === 'normal' && s3.status === 'normal') {
        return 'Ambulatory no ataxia or paresis';
      }

      const findings: string[] = [];

      // Posture findings (Section 2)
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

      // Gait findings (Section 3)
      if (s3.status === 'abnormal') {
        const gait: string[] = [];

        // Ambulatory status
        if (s3.data.ambulatoryStatus) {
          gait.push(s3.data.ambulatoryStatus);

          // Add affected limbs for paresis
          if (s3.data.paresis && s3.data.paresis.length > 0) {
            gait.push(`affecting ${s3.data.paresis.join(', ')}`);
          }
        }

        // Ataxia type
        if (s3.data.ataxiaType) {
          gait.push(`${s3.data.ataxiaType.toLowerCase()} ataxia`);
        }

        // Other gait abnormalities
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

      if (s2.status === null && s3.status === null) {
        return 'Not assessed';
      }

      return findings.length > 0 ? findings.join('; ') : 'Ambulatory no ataxia or paresis';
    };

    const generateCranialNerves = () => {
      // Sections 4-11: Menace, Pupil, Eye Position, Palpebral, Facial Sensation, Jaw, Tongue, Gag
      const cnSections = [4, 5, 6, 7, 8, 9, 10, 11];
      const allNormal = cnSections.every(id => sections[id].status === 'normal');
      const allNotAssessed = cnSections.every(id => sections[id].status === null);

      if (allNormal) {
        return 'No CN deficits';
      }

      if (allNotAssessed) {
        return 'Not assessed';
      }

      const findings: string[] = [];

      // Section 4: Menace Response
      if (sections[4].status === 'abnormal' && sections[4].data.affectedSide) {
        findings.push(`absent menace response in ${sections[4].data.affectedSide.toLowerCase()}`);
        if (sections[4].data.notes) findings.push(sections[4].data.notes);
      }

      // Section 5: Pupil Evaluation
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

      // Section 6: Eye Position & Nystagmus
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

      // Section 7: Palpebral Reflex
      if (sections[7].status === 'abnormal' && sections[7].data.affectedSide) {
        findings.push(`decreased palpebral reflex ${sections[7].data.affectedSide.toLowerCase()}`);
        if (sections[7].data.notes) findings.push(sections[7].data.notes);
      }

      // Section 8: Facial Sensation
      if (sections[8].status === 'abnormal' && sections[8].data.affectedSide) {
        findings.push(`decreased facial sensation ${sections[8].data.affectedSide.toLowerCase()}`);
        if (sections[8].data.notes) findings.push(sections[8].data.notes);
      }

      // Section 9: Jaw & Facial Motor
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

      // Section 10: Tongue Assessment
      if (sections[10].status === 'abnormal') {
        const tongue: string[] = [];
        if (sections[10].data.deviationL) tongue.push('tongue deviation to left');
        if (sections[10].data.deviationR) tongue.push('tongue deviation to right');
        if (sections[10].data.atrophy) tongue.push('tongue atrophy');
        if (sections[10].data.weakness) tongue.push('tongue weakness');
        if (tongue.length > 0) findings.push(tongue.join(', '));
        if (sections[10].data.notes) findings.push(sections[10].data.notes);
      }

      // Section 11: Gag Reflex
      if (sections[11].status === 'abnormal' && sections[11].data.responseLevel) {
        findings.push(`${sections[11].data.responseLevel.toLowerCase()} gag reflex`);
        if (sections[11].data.notes) findings.push(sections[11].data.notes);
      }

      if (findings.length > 0) {
        return findings.join('; ');
      }

      return 'No CN deficits';
    };

    const generatePosturalReactions = () => {
      const s12 = sections[12];
      if (s12.status === 'normal') {
        return 'No deficits. Hopping and Paw replacement normal';
      } else if (s12.status === 'abnormal') {
        const findings: string[] = [];

        if (s12.data.affectedLimbs && s12.data.affectedLimbs.length > 0) {
          const limbText = s12.data.affectedLimbs.join(', ');
          if (s12.data.severity) {
            findings.push(`${s12.data.severity} in ${limbText}`);
          } else {
            findings.push(`Deficits in ${limbText}`);
          }
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

      if (s13.status === 'normal' && s14.status === 'normal') {
        return 'All reflexes normal, no deficits';
      }

      if (s13.status === null && s14.status === null) {
        return 'Not assessed';
      }

      const findings: string[] = [];

      // Thoracic limb reflexes
      if (s13.status === 'abnormal') {
        const thoracic: string[] = [];
        if (s13.data.leftForelimb && s13.data.leftForelimb !== 'Normal') {
          thoracic.push(`LF ${s13.data.leftForelimb.toLowerCase()}`);
        }
        if (s13.data.rightForelimb && s13.data.rightForelimb !== 'Normal') {
          thoracic.push(`RF ${s13.data.rightForelimb.toLowerCase()}`);
        }
        if (thoracic.length > 0) findings.push(`Thoracic limbs: ${thoracic.join(', ')}`);
        if (s13.data.notes) findings.push(s13.data.notes);
      }

      // Pelvic limb reflexes
      if (s14.status === 'abnormal') {
        const pelvic: string[] = [];
        if (s14.data.leftHindlimb && s14.data.leftHindlimb !== 'Normal') {
          pelvic.push(`LH ${s14.data.leftHindlimb.toLowerCase()}`);
        }
        if (s14.data.rightHindlimb && s14.data.rightHindlimb !== 'Normal') {
          pelvic.push(`RH ${s14.data.rightHindlimb.toLowerCase()}`);
        }
        if (pelvic.length > 0) findings.push(`Pelvic limbs: ${pelvic.join(', ')}`);
        if (s14.data.notes) findings.push(s14.data.notes);
      }

      return findings.length > 0 ? findings.join('; ') : 'All reflexes normal, no deficits';
    };

    const generateTone = () => {
      const s15 = sections[15]; // Perineal & Anal
      const s16 = sections[16]; // Palpation - Spine

      if (s15.status === 'normal' && s16.status === 'normal') {
        return 'Normal Tone';
      }

      if (s15.status === null && s16.status === null) {
        return 'Not assessed';
      }

      const findings: string[] = [];

      // Perineal & Anal tone
      if (s15.status === 'abnormal') {
        const tone: string[] = [];
        if (s15.data.decreased) tone.push('decreased perineal reflex');
        if (s15.data.absent) tone.push('absent perineal reflex');
        if (s15.data.toneLoss) tone.push('loss of anal tone');
        if (tone.length > 0) findings.push(tone.join(', '));
        if (s15.data.notes) findings.push(s15.data.notes);
      }

      // Spinal palpation (pain indicates hypertonicity/spasm)
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
      const s17 = sections[17]; // Limb Palpation

      if (s17.status === 'normal') {
        return 'Normal mass, no atrophy or excessive hypertrophy';
      } else if (s17.status === 'abnormal') {
        const findings: string[] = [];

        if (s17.data.muscleAtrophy && s17.data.muscleAtrophy.length > 0) {
          findings.push(`Muscle atrophy in ${s17.data.muscleAtrophy.join(', ')}`);
        }

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

      if (s18.status === 'normal') {
        return 'Pain Perception intact, no hyperpathia on palpation.';
      } else if (s18.status === 'abnormal') {
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

          // Determine which limbs are intact
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

    // Generate the clinical summary
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
  };

  const copySummary = async () => {
    const summary = generateSummary();
    try {
      await navigator.clipboard.writeText(summary);
      toast({ title: 'Summary copied!', description: 'Neuro exam summary copied to clipboard' });
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Summary copied to clipboard!');
    }
  };

  const handleComplete = async () => {
    const incomplete = Object.entries(sections).filter(([_, s]) => !s.status);
    if (incomplete.length > 0) {
      const proceed = confirm(`${incomplete.length} sections incomplete. Complete anyway?`);
      if (!proceed) return;
    }

    if (!currentExamId) {
      toast({
        title: 'Error',
        description: 'No active exam to complete',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Final save to database
      await fetch(`/api/neuro-exams/${currentExamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });

      // Clear draft ID to start fresh next time
      localStorage.removeItem('neuro-exam-draft-id');

      toast({
        title: 'Exam completed!',
        description: 'Your neuro exam has been saved to the database'
      });

      // Reset to start a new exam
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error completing exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exam',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-950 to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-slate-950 to-purple-950 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md shadow-lg shadow-purple-500/20 z-10 p-4 border-b border-purple-500/20">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl font-semibold text-purple-50" style={{ textShadow: '0 0 20px rgba(168, 85, 247, 0.6)' }}>
              Neuro Exam
            </h1>
            {isSaving && (
              <p className="text-xs text-purple-300 mt-1">Saving...</p>
            )}
          </div>
          <motion.button
            onClick={handleSaveDraft}
            whileTap={{ scale: 0.95 }}
            disabled={isSaving}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-shadow disabled:opacity-50"
            style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.2)' }}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </motion.button>
        </div>

        {/* Neural Network Progress Indicator */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-300">Progress</span>
            <span className="text-sm font-medium text-purple-200" style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.5)' }}>
              {completed}/{total}
            </span>
          </div>
          <svg viewBox="0 0 300 60" className="w-full h-12">
            {/* Background connections */}
            {[...Array(17)].map((_, i) => (
              <motion.line
                key={`conn-${i}`}
                x1={15 + (i * 17)}
                y1={30}
                x2={15 + ((i + 1) * 17)}
                y2={30}
                stroke="rgba(168, 85, 247, 0.2)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  stroke: sections[i + 1]?.status ? 'rgba(217, 70, 239, 0.6)' : 'rgba(168, 85, 247, 0.2)'
                }}
                transition={{ duration: 0.5 }}
              />
            ))}

            {/* Nodes for each section */}
            {Object.entries(sections).map(([id, section]) => {
              const nodeId = parseInt(id);
              const x = 15 + ((nodeId - 1) * 17);
              const isComplete = section.status !== null;
              const isNormal = section.status === 'normal';
              const isAbnormal = section.status === 'abnormal';

              return (
                <g key={`node-${id}`}>
                  {/* Outer glow */}
                  {isComplete && (
                    <motion.circle
                      cx={x}
                      cy={30}
                      r={6}
                      fill="none"
                      stroke={isNormal ? 'rgba(16, 185, 129, 0.6)' : 'rgba(217, 70, 239, 0.6)'}
                      strokeWidth="0"
                      initial={{ r: 4, opacity: 0 }}
                      animate={{ r: 8, opacity: 0.5, strokeWidth: 2 }}
                      transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                    />
                  )}

                  {/* Node circle */}
                  <motion.circle
                    cx={x}
                    cy={30}
                    r={4}
                    fill={
                      isNormal ? 'rgba(16, 185, 129, 0.8)' :
                      isAbnormal ? 'rgba(217, 70, 239, 0.8)' :
                      'rgba(168, 85, 247, 0.3)'
                    }
                    stroke={
                      isNormal ? 'rgba(16, 185, 129, 1)' :
                      isAbnormal ? 'rgba(217, 70, 239, 1)' :
                      'rgba(168, 85, 247, 0.5)'
                    }
                    strokeWidth="1.5"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{
                      scale: isComplete ? 1.2 : 1,
                      opacity: 1
                    }}
                    transition={{
                      scale: { duration: 0.3, type: 'spring', stiffness: 300 },
                      opacity: { duration: 0.2 }
                    }}
                    style={{
                      filter: isComplete
                        ? `drop-shadow(0 0 4px ${isNormal ? 'rgba(16, 185, 129, 0.8)' : 'rgba(217, 70, 239, 0.8)'})`
                        : 'none'
                    }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Quick Templates Section */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-b border-purple-500/20 bg-slate-900/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="text-purple-400" size={20} />
                  <h2 className="text-lg font-semibold text-purple-50">Quick Templates</h2>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-sm text-purple-300 hover:text-purple-200"
                >
                  Hide
                </button>
              </div>
              <p className="text-xs text-purple-300 mb-4">
                Pre-fill exam with common findings. You can still customize any section after applying.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {getAllTemplates().map((template) => (
                  <motion.button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template.id)}
                    whileTap={{ scale: 0.95 }}
                    className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-xl text-left hover:border-purple-400/50 transition-all active:scale-95"
                    style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.1)' }}
                  >
                    <div className="text-2xl mb-2">{template.icon}</div>
                    <div className="text-sm font-semibold text-purple-50 mb-1">
                      {template.name}
                    </div>
                    <div className="text-xs text-purple-300/80 line-clamp-2">
                      {template.description}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Applied Template Banner */}
      {appliedTemplate && (
        <div className="px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Check className="text-emerald-400" size={18} />
              <span className="text-sm text-emerald-200">
                {getAllTemplates().find(t => t.id === appliedTemplate)?.name} template applied
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs text-emerald-300 hover:text-emerald-200 px-2 py-1"
              >
                {showTemplates ? 'Hide' : 'Show'} Templates
              </button>
              <button
                onClick={handleClearTemplate}
                className="text-xs text-emerald-300 hover:text-emerald-200 px-2 py-1"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sections */}
      <div className="p-4 space-y-3">
        {/* Section 1: Mentation & Behavior */}
        <ExamSection
          id={1}
          title="Mentation & Behavior"
          section={sections[1]}
          toggleSection={() => toggleSection(1)}
          setStatus={(status) => setStatus(1, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Mentation Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Alert', 'Depressed', 'Obtunded', 'Stuporous', 'Comatose'].map(level => (
                  <button
                    key={level}
                    onClick={() => updateData(1, 'mentation', level)}
                    className={`py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[1].data.mentation === level
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Behavior Abnormalities
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'circlingL', label: 'Circling L' },
                  { id: 'circlingR', label: 'Circling R' },
                  { id: 'headPressing', label: 'Head Press' },
                  { id: 'aggression', label: 'Aggression' },
                  { id: 'disorientation', label: 'Disoriented' },
                  { id: 'vocalization', label: 'Vocalization' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[1].data[item.id]}
                      onChange={() => updateData(1, item.id, !sections[1].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[1].data.notes || ''}
                onChange={(e) => updateData(1, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 2: Posture & Position at Rest */}
        <ExamSection
          id={2}
          title="Posture & Position at Rest"
          section={sections[2]}
          toggleSection={() => toggleSection(2)}
          setStatus={(status) => setStatus(2, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Head Tilt
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateData(2, 'headTilt', sections[2].data.headTilt === 'L' ? null : 'L')}
                  className={`flex-1 py-3 rounded-lg font-medium active:scale-95 transition ${
                    sections[2].data.headTilt === 'L'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Left
                </button>
                <button
                  onClick={() => updateData(2, 'headTilt', sections[2].data.headTilt === 'R' ? null : 'R')}
                  className={`flex-1 py-3 rounded-lg font-medium active:scale-95 transition ${
                    sections[2].data.headTilt === 'R'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Right
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Head Turn
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateData(2, 'headTurn', sections[2].data.headTurn === 'L' ? null : 'L')}
                  className={`flex-1 py-3 rounded-lg font-medium active:scale-95 transition ${
                    sections[2].data.headTurn === 'L'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Left
                </button>
                <button
                  onClick={() => updateData(2, 'headTurn', sections[2].data.headTurn === 'R' ? null : 'R')}
                  className={`flex-1 py-3 rounded-lg font-medium active:scale-95 transition ${
                    sections[2].data.headTurn === 'R'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Right
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Other Findings
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'ventroflexion', label: 'Ventroflexion' },
                  { id: 'wideExcursionTremor', label: 'Head Tremor' },
                  { id: 'fineIntentionTremor', label: 'Intent Tremor' },
                  { id: 'facialAsymmetryL', label: 'Facial Asym L' },
                  { id: 'facialAsymmetryR', label: 'Facial Asym R' },
                  { id: 'earAbnormalL', label: 'Ear Drop L' },
                  { id: 'earAbnormalR', label: 'Ear Drop R' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[2].data[item.id]}
                      onChange={() => updateData(2, item.id, !sections[2].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[2].data.notes || ''}
                onChange={(e) => updateData(2, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 3: Gait Evaluation */}
        <ExamSection
          id={3}
          title="Gait Evaluation"
          section={sections[3]}
          toggleSection={() => toggleSection(3)}
          setStatus={(status) => setStatus(3, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Ambulatory Status
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { value: 'Ambulatory', label: 'Ambulatory' },
                  { value: 'Non-ambulatory paraparesis', label: 'Non-amb Para' },
                  { value: 'Non-ambulatory tetraparesis', label: 'Non-amb Tetra' },
                  { value: 'Paraplegia', label: 'Paraplegia' },
                  { value: 'Tetraplegia', label: 'Tetraplegia' }
                ].map(status => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="ambulatoryStatus"
                      checked={sections[3].data.ambulatoryStatus === status.value}
                      onChange={() => updateData(3, 'ambulatoryStatus', status.value)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Paresis (select limbs)
              </label>
              <div className="grid grid-cols-4 gap-x-2">
                {['LF', 'RF', 'LH', 'RH'].map(limb => (
                  <label
                    key={limb}
                    className="flex items-center gap-1.5 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(sections[3].data.paresis || []).includes(limb)}
                      onChange={() => {
                        const paresis = sections[3].data.paresis || [];
                        const newParesis = paresis.includes(limb)
                          ? paresis.filter((l: string) => l !== limb)
                          : [...paresis, limb];
                        updateData(3, 'paresis', newParesis);
                      }}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{limb}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Ataxia Type
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {['Proprioceptive', 'Vestibular', 'Cerebellar', 'General'].map(type => (
                  <label
                    key={type}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="ataxiaType"
                      checked={sections[3].data.ataxiaType === type}
                      onChange={() => updateData(3, 'ataxiaType', type)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Other Abnormalities
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'hypermetria', label: 'Hypermetria' },
                  { id: 'hypometria', label: 'Hypometria' },
                  { id: 'circlingL', label: 'Circling L' },
                  { id: 'circlingR', label: 'Circling R' },
                  { id: 'wideBasedStance', label: 'Wide Stance' },
                  { id: 'bunnyHopping', label: 'Bunny Hop' },
                  { id: 'dysmetria', label: 'Dysmetria' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[3].data[item.id]}
                      onChange={() => updateData(3, item.id, !sections[3].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[3].data.notes || ''}
                onChange={(e) => updateData(3, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 4: Menace Response */}
        <ExamSection
          id={4}
          title="Menace Response"
          section={sections[4]}
          toggleSection={() => toggleSection(4)}
          setStatus={(status) => setStatus(4, status)}
          getStatusIcon={getStatusIcon}
          bulkNormalButton={{
            label: 'All CN Normal',
            onClick: markAllCranialNervesNormal
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Affected Side
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Left Eye', 'Right Eye', 'Both Eyes'].map(side => (
                  <button
                    key={side}
                    onClick={() => updateData(4, 'affectedSide', side)}
                    className={`py-3 px-3 rounded-lg text-sm font-medium active:scale-95 transition ${
                      sections[4].data.affectedSide === side
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-slate-800/50 text-purple-200 border border-purple-500/30'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[4].data.notes || ''}
                onChange={(e) => updateData(4, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 5: Pupil Evaluation */}
        <ExamSection
          id={5}
          title="Pupil Evaluation"
          section={sections[5]}
          toggleSection={() => toggleSection(5)}
          setStatus={(status) => setStatus(5, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Pupil Findings
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'anisocoria', label: 'Anisocoria' },
                  { id: 'mydriasisL', label: 'Mydriasis L' },
                  { id: 'mydriasisR', label: 'Mydriasis R' },
                  { id: 'miosisL', label: 'Miosis L' },
                  { id: 'miosisR', label: 'Miosis R' },
                  { id: 'poorPLRL', label: 'Poor PLR L' },
                  { id: 'poorPLRR', label: 'Poor PLR R' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[5].data[item.id]}
                      onChange={() => updateData(5, item.id, !sections[5].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[5].data.notes || ''}
                onChange={(e) => updateData(5, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 6: Eye Position & Nystagmus */}
        <ExamSection
          id={6}
          title="Eye Position & Nystagmus"
          section={sections[6]}
          toggleSection={() => toggleSection(6)}
          setStatus={(status) => setStatus(6, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Eye Position
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'strabismusL', label: 'Strabismus L' },
                  { id: 'strabismusR', label: 'Strabismus R' },
                  { id: 'ventrolateralL', label: 'Ventrolat L' },
                  { id: 'ventrolateralR', label: 'Ventrolat R' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[6].data[item.id]}
                      onChange={() => updateData(6, item.id, !sections[6].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Nystagmus
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'horizontalNystagmus', label: 'Horizontal' },
                  { id: 'verticalNystagmus', label: 'Vertical' },
                  { id: 'rotaryNystagmus', label: 'Rotary' },
                  { id: 'positionalNystagmus', label: 'Positional' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[6].data[item.id]}
                      onChange={() => updateData(6, item.id, !sections[6].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[6].data.notes || ''}
                onChange={(e) => updateData(6, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 7: Palpebral Reflex */}
        <ExamSection
          id={7}
          title="Palpebral Reflex"
          section={sections[7]}
          toggleSection={() => toggleSection(7)}
          setStatus={(status) => setStatus(7, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Affected Side
              </label>
              <div className="flex gap-4">
                {['Left', 'Right', 'Both'].map(side => (
                  <label key={side} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="palpebralSide"
                      checked={sections[7].data.affectedSide === side}
                      onChange={() => updateData(7, 'affectedSide', side)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{side}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[7].data.notes || ''}
                onChange={(e) => updateData(7, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 8: Facial Sensation */}
        <ExamSection
          id={8}
          title="Facial Sensation"
          section={sections[8]}
          toggleSection={() => toggleSection(8)}
          setStatus={(status) => setStatus(8, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Affected Side
              </label>
              <div className="flex gap-4">
                {['Left', 'Right', 'Both'].map(side => (
                  <label key={side} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="facialSensationSide"
                      checked={sections[8].data.affectedSide === side}
                      onChange={() => updateData(8, 'affectedSide', side)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{side}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[8].data.notes || ''}
                onChange={(e) => updateData(8, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 9: Jaw & Facial Motor */}
        <ExamSection
          id={9}
          title="Jaw & Facial Motor"
          section={sections[9]}
          toggleSection={() => toggleSection(9)}
          setStatus={(status) => setStatus(9, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Findings
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'droppedJaw', label: 'Dropped Jaw' },
                  { id: 'reducedJawTone', label: 'Low Jaw Tone' },
                  { id: 'facialParalysisL', label: 'Facial L' },
                  { id: 'facialParalysisR', label: 'Facial R' },
                  { id: 'lipDroopL', label: 'Lip Droop L' },
                  { id: 'lipDroopR', label: 'Lip Droop R' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[9].data[item.id]}
                      onChange={() => updateData(9, item.id, !sections[9].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[9].data.notes || ''}
                onChange={(e) => updateData(9, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 10: Tongue Assessment */}
        <ExamSection
          id={10}
          title="Tongue Assessment"
          section={sections[10]}
          toggleSection={() => toggleSection(10)}
          setStatus={(status) => setStatus(10, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Findings
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'deviationL', label: 'Deviation L' },
                  { id: 'deviationR', label: 'Deviation R' },
                  { id: 'atrophy', label: 'Atrophy' },
                  { id: 'weakness', label: 'Weakness' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[10].data[item.id]}
                      onChange={() => updateData(10, item.id, !sections[10].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[10].data.notes || ''}
                onChange={(e) => updateData(10, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 11: Gag Reflex */}
        <ExamSection
          id={11}
          title="Gag Reflex"
          section={sections[11]}
          toggleSection={() => toggleSection(11)}
          setStatus={(status) => setStatus(11, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Response Level
              </label>
              <div className="flex gap-4">
                {['Absent', 'Decreased', 'Hyperactive'].map(level => (
                  <label key={level} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="gagResponseLevel"
                      checked={sections[11].data.responseLevel === level}
                      onChange={() => updateData(11, 'responseLevel', level)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[11].data.notes || ''}
                onChange={(e) => updateData(11, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 12: Postural Reactions */}
        <ExamSection
          id={12}
          title="Postural Reactions - Proprioceptive Positioning"
          section={sections[12]}
          toggleSection={() => toggleSection(12)}
          setStatus={(status) => setStatus(12, status)}
          getStatusIcon={getStatusIcon}
          bulkNormalButton={{
            label: 'All PR Normal',
            onClick: markAllPosturalReactionsNormal
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Affected Limbs
              </label>
              <div className="grid grid-cols-4 gap-x-2">
                {['LF', 'RF', 'LH', 'RH'].map(limb => (
                  <label key={limb} className="flex items-center gap-1.5 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(sections[12].data.affectedLimbs || []).includes(limb)}
                      onChange={() => {
                        const affected = sections[12].data.affectedLimbs || [];
                        const newAffected = affected.includes(limb)
                          ? affected.filter((l: string) => l !== limb)
                          : [...affected, limb];
                        updateData(12, 'affectedLimbs', newAffected);
                      }}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{limb}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Severity
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'Mild delay', label: 'Mild' },
                  { value: 'Moderate delay', label: 'Mod' },
                  { value: 'Severe delay', label: 'Severe' },
                  { value: 'Absent', label: 'Absent' }
                ].map(severity => (
                  <label key={severity.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="prSeverity"
                      checked={sections[12].data.severity === severity.value}
                      onChange={() => updateData(12, 'severity', severity.value)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{severity.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[12].data.notes || ''}
                onChange={(e) => updateData(12, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 13: Thoracic Limb Reflexes */}
        <ExamSection
          id={13}
          title="Thoracic Limb Reflexes - Withdrawal"
          section={sections[13]}
          toggleSection={() => toggleSection(13)}
          setStatus={(status) => setStatus(13, status)}
          getStatusIcon={getStatusIcon}
          bulkNormalButton={{
            label: 'All Reflexes Normal',
            onClick: markAllReflexesNormal
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Left Forelimb
              </label>
              <div className="flex gap-3">
                {['Decreased', 'Normal', 'Increased'].map(level => (
                  <label key={level} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tlrLeftForelimb"
                      checked={sections[13].data.leftForelimb === level}
                      onChange={() => updateData(13, 'leftForelimb', level)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Right Forelimb
              </label>
              <div className="flex gap-3">
                {['Decreased', 'Normal', 'Increased'].map(level => (
                  <label key={level} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="tlrRightForelimb"
                      checked={sections[13].data.rightForelimb === level}
                      onChange={() => updateData(13, 'rightForelimb', level)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[13].data.notes || ''}
                onChange={(e) => updateData(13, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 14: Pelvic Limb Reflexes */}
        <ExamSection
          id={14}
          title="Pelvic Limb Reflexes - Patellar"
          section={sections[14]}
          toggleSection={() => toggleSection(14)}
          setStatus={(status) => setStatus(14, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Left Hindlimb
              </label>
              <div className="flex gap-3">
                {['Decreased', 'Normal', 'Increased'].map(level => (
                  <label key={level} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="plrLeftHindlimb"
                      checked={sections[14].data.leftHindlimb === level}
                      onChange={() => updateData(14, 'leftHindlimb', level)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Right Hindlimb
              </label>
              <div className="flex gap-3">
                {['Decreased', 'Normal', 'Increased'].map(level => (
                  <label key={level} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="plrRightHindlimb"
                      checked={sections[14].data.rightHindlimb === level}
                      onChange={() => updateData(14, 'rightHindlimb', level)}
                      className="w-4 h-4 border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[14].data.notes || ''}
                onChange={(e) => updateData(14, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 15: Perineal & Anal */}
        <ExamSection
          id={15}
          title="Perineal & Anal"
          section={sections[15]}
          toggleSection={() => toggleSection(15)}
          setStatus={(status) => setStatus(15, status)}
          getStatusIcon={getStatusIcon}
          bulkNormalButton={{
            label: 'All Tone Normal',
            onClick: markAllToneNormal
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Findings
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'decreased', label: 'Decreased' },
                  { id: 'absent', label: 'Absent' },
                  { id: 'toneLoss', label: 'Loss of Tone' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[15].data[item.id]}
                      onChange={() => updateData(15, item.id, !sections[15].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[15].data.notes || ''}
                onChange={(e) => updateData(15, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 16: Palpation */}
        <ExamSection
          id={16}
          title="Palpation - Spine & Paraspinal"
          section={sections[16]}
          toggleSection={() => toggleSection(16)}
          setStatus={(status) => setStatus(16, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Pain Location
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'cervicalPain', label: 'Cervical' },
                  { id: 'thoracicPain', label: 'Thoracic' },
                  { id: 'lumbarPain', label: 'Lumbar' },
                  { id: 'lumbosacralPain', label: 'LS' },
                  { id: 'paraspinalPain', label: 'Paraspinal' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[16].data[item.id]}
                      onChange={() => updateData(16, item.id, !sections[16].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[16].data.notes || ''}
                onChange={(e) => updateData(16, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Specific vertebrae, severity, etc..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 17: Limb Palpation */}
        <ExamSection
          id={17}
          title="Limb Palpation"
          section={sections[17]}
          toggleSection={() => toggleSection(17)}
          setStatus={(status) => setStatus(17, status)}
          getStatusIcon={getStatusIcon}
          bulkNormalButton={{
            label: 'All Mass Normal',
            onClick: markAllMassNormal
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Muscle Atrophy
              </label>
              <div className="grid grid-cols-4 gap-x-2">
                {['LF', 'RF', 'LH', 'RH'].map(limb => (
                  <label key={limb} className="flex items-center gap-1.5 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(sections[17].data.muscleAtrophy || []).includes(limb)}
                      onChange={() => {
                        const atrophy = sections[17].data.muscleAtrophy || [];
                        const newAtrophy = atrophy.includes(limb)
                          ? atrophy.filter((l: string) => l !== limb)
                          : [...atrophy, limb];
                        updateData(17, 'muscleAtrophy', newAtrophy);
                      }}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{limb}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Other Findings
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {[
                  { id: 'jointSwelling', label: 'Joint Swelling' },
                  { id: 'painOnPalpation', label: 'Pain' },
                  { id: 'decreasedROM', label: 'Decreased ROM' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[17].data[item.id]}
                      onChange={() => updateData(17, item.id, !sections[17].data[item.id])}
                      className="w-4 h-4 rounded border-purple-500/50 bg-slate-800/50 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-purple-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[17].data.notes || ''}
                onChange={(e) => updateData(17, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Specific joints, muscles affected..."
              />
            </div>
          </div>
        </ExamSection>

        {/* Section 18: Nociception - Special warning section */}
        <ExamSection
          id={18}
          title="Nociception ⚠️"
          section={sections[18]}
          toggleSection={() => toggleSection(18)}
          setStatus={(status) => setStatus(18, status)}
          getStatusIcon={getStatusIcon}
        >
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-red-800">
                  <strong>Critical Assessment:</strong> Absence of nociception indicates severe spinal cord injury and poor prognosis.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5">
                Absent Deep Pain (select affected)
              </label>
              <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
                {[
                  { id: 'lf', label: 'LF' },
                  { id: 'rf', label: 'RF' },
                  { id: 'lh', label: 'LH' },
                  { id: 'rh', label: 'RH' },
                  { id: 'tail', label: 'Tail' },
                  { id: 'perineum', label: 'Perineum' },
                ].map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 py-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!sections[18].data[item.id]}
                      onChange={() => updateData(18, item.id, !sections[18].data[item.id])}
                      className="w-4 h-4 rounded border-red-500/50 bg-slate-800/50 text-red-600 focus:ring-red-500 focus:ring-offset-0"
                    />
                    <span className="text-xs text-red-200">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={sections[18].data.notes || ''}
                onChange={(e) => updateData(18, 'notes', e.target.value)}
                className="w-full p-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-[16px] text-purple-50 placeholder-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
                rows={3}
                placeholder="Additional observations..."
              />
            </div>
          </div>
        </ExamSection>
      </div>

      {/* Exam Summary Section */}
      {completed > 0 && (
        <div className="p-4 pb-32">
          <motion.div
            className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 overflow-hidden"
            style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.2)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="w-full p-4 flex items-center justify-between hover:bg-purple-900/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-purple-400" />
                <span className="font-medium text-purple-50" style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.3)' }}>
                  Exam Summary
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={(e) => { e.stopPropagation(); copySummary(); }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)' }}
                >
                  <Copy size={16} />
                  Copy
                </motion.button>
                <ChevronDown
                  size={20}
                  className={`text-purple-300 transition-transform ${showSummary ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            <AnimatePresence>
              {showSummary && (
                <motion.div
                  className="px-4 pb-4 border-t border-purple-500/20"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <pre className="mt-3 p-4 bg-slate-800/50 rounded-lg text-purple-100 text-sm font-mono whitespace-pre-wrap overflow-x-auto border border-purple-500/20">
                    {generateSummary()}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Sticky Footer with safe area support */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-purple-500/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg shadow-purple-500/20">
        <motion.button
          onClick={handleComplete}
          whileTap={{ scale: 0.98 }}
          disabled={isSaving}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 via-purple-600 to-fuchsia-600 text-white rounded-xl font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(217, 70, 239, 0.4), inset 0 0 20px rgba(168, 85, 247, 0.2)',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
          }}
        >
          {isSaving ? 'Saving...' : `Complete Exam (${completed}/${total})`}
        </motion.button>
      </div>
    </div>
  );
}

// Reusable Section Component
interface ExamSectionProps {
  id: number;
  title: string;
  section: SectionData;
  toggleSection: () => void;
  setStatus: (status: 'normal' | 'abnormal') => void;
  getStatusIcon: (status: 'normal' | 'abnormal' | null) => JSX.Element;
  children?: React.ReactNode;
  bulkNormalButton?: {
    label: string;
    onClick: () => void;
  };
}

function ExamSection({
  id,
  title,
  section,
  toggleSection,
  setStatus,
  getStatusIcon,
  children,
  bulkNormalButton
}: ExamSectionProps) {
  const borderColor = section.status === 'normal' ? 'border-l-emerald-400' :
                      section.status === 'abnormal' ? 'border-l-fuchsia-400' :
                      'border-l-purple-500/30';

  const glowStyle = section.status
    ? { boxShadow: '0 0 30px rgba(168, 85, 247, 0.3), inset 0 0 30px rgba(168, 85, 247, 0.1)' }
    : { boxShadow: '0 0 15px rgba(168, 85, 247, 0.15)' };

  return (
    <motion.div
      className={`bg-slate-900/50 backdrop-blur-sm rounded-2xl overflow-hidden border-l-4 ${borderColor} border border-purple-500/20`}
      style={glowStyle}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between p-4 hover:bg-purple-900/20 transition-colors">
        <motion.button
          onClick={toggleSection}
          className="flex items-center gap-3 flex-1"
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            animate={{ rotate: section.expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {section.expanded ?
              <ChevronDown size={20} className="text-purple-300" /> :
              <ChevronRight size={20} className="text-purple-300" />
            }
          </motion.div>
          <span className="font-medium text-left text-purple-50" style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.3)' }}>
            {id}. {title}
          </span>
        </motion.button>

        <div className="flex items-center gap-2">
          {bulkNormalButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                bulkNormalButton.onClick();
              }}
              className="px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-900/30 border border-emerald-500/30 rounded-md hover:bg-emerald-900/50 hover:border-emerald-500/50 transition-colors active:scale-95"
            >
              <Check size={14} className="inline mr-1" />
              {bulkNormalButton.label}
            </button>
          )}
          {getStatusIcon(section.status)}
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* Pill-shaped toggle */}
        <div className="relative bg-slate-800/50 rounded-full p-1 mb-3" style={{ boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)' }}>
          <div className="grid grid-cols-2 relative">
            {/* Sliding indicator */}
            <motion.div
              className="absolute top-1 bottom-1 left-1 right-1/2 rounded-full"
              style={{
                background: section.status === 'normal'
                  ? 'linear-gradient(135deg, #10b981 0%, #a855f7 100%)'
                  : section.status === 'abnormal'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d946ef 100%)'
                  : 'transparent',
                boxShadow: section.status
                  ? '0 0 20px rgba(168, 85, 247, 0.6), 0 0 40px rgba(217, 70, 239, 0.4)'
                  : 'none'
              }}
              animate={{
                x: section.status === 'abnormal' ? '100%' : '0%',
                opacity: section.status ? 1 : 0
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />

            {/* Normal button */}
            <motion.button
              onClick={() => setStatus('normal')}
              className={`relative z-10 py-3 rounded-full font-medium transition-colors ${
                section.status === 'normal'
                  ? 'text-white'
                  : 'text-purple-300'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              Normal
            </motion.button>

            {/* Abnormal button */}
            <motion.button
              onClick={() => setStatus('abnormal')}
              className={`relative z-10 py-3 rounded-full font-medium transition-colors ${
                section.status === 'abnormal'
                  ? 'text-white'
                  : 'text-purple-300'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              Abnormal
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {section.expanded && section.status === 'abnormal' && (
            <motion.div
              className="pt-3 border-t border-purple-500/20"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
