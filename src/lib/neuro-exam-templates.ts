/**
 * Neuro Exam Quick Templates
 * Pre-configured findings for common neurologic presentations
 * Designed to reduce exam completion time from 5-10 minutes to 30 seconds
 */

export interface NeuroExamTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  // Section data matching the neuro-exam page structure (18 sections)
  sections: {
    [sectionId: number]: {
      status: 'normal' | 'abnormal';
      data: Record<string, any>;
    };
  };
}

export const NEURO_EXAM_TEMPLATES: NeuroExamTemplate[] = [
  // Template 1: T3-L3 IVDD - Most common presentation (40% of neuro cases)
  {
    id: 't3-l3-ivdd',
    name: 'T3-L3 IVDD',
    description: 'Non-ambulatory paraparesis with pelvic limb deficits',
    icon: '🦴',
    sections: {
      // 1. Mentation & Behavior - Normal
      1: {
        status: 'normal',
        data: {}
      },
      // 2. Posture & Position at Rest - Normal
      2: {
        status: 'normal',
        data: {}
      },
      // 3. Gait - ABNORMAL (non-ambulatory paraparesis)
      3: {
        status: 'abnormal',
        data: {
          ambulatoryStatus: 'Non-ambulatory paraparesis',
          paresis: ['LH', 'RH'],
          ataxiaType: 'General proprioceptive'
        }
      },
      // 4. Menace Response - Normal
      4: {
        status: 'normal',
        data: {}
      },
      // 5. Pupil Evaluation - Normal
      5: {
        status: 'normal',
        data: {}
      },
      // 6. Eye Position & Nystagmus - Normal
      6: {
        status: 'normal',
        data: {}
      },
      // 7. Palpebral Reflex - Normal
      7: {
        status: 'normal',
        data: {}
      },
      // 8. Facial Sensation - Normal
      8: {
        status: 'normal',
        data: {}
      },
      // 9. Jaw & Facial Motor - Normal
      9: {
        status: 'normal',
        data: {}
      },
      // 10. Tongue Assessment - Normal
      10: {
        status: 'normal',
        data: {}
      },
      // 11. Gag Reflex - Normal
      11: {
        status: 'normal',
        data: {}
      },
      // 12. Postural Reactions - ABNORMAL (pelvic limbs)
      12: {
        status: 'abnormal',
        data: {
          affectedLimbs: ['LH', 'RH'],
          severity: 'Absent'
        }
      },
      // 13. Thoracic Limb Reflexes - Normal
      13: {
        status: 'normal',
        data: {}
      },
      // 14. Pelvic Limb Reflexes - ABNORMAL (increased)
      14: {
        status: 'abnormal',
        data: {
          leftHindlimb: 'Increased',
          rightHindlimb: 'Increased'
        }
      },
      // 15. Perineal & Anal Tone - Normal
      15: {
        status: 'normal',
        data: {}
      },
      // 16. Palpation - Spine - ABNORMAL (thoracolumbar pain)
      16: {
        status: 'abnormal',
        data: {
          thoracicPain: true,
          lumbarPain: true
        }
      },
      // 17. Palpation - Limbs - Normal
      17: {
        status: 'normal',
        data: {}
      },
      // 18. Nociception - Normal (deep pain present)
      18: {
        status: 'normal',
        data: {}
      }
    }
  },

  // Template 2: C1-C5 Myelopathy (Cervical IVDD)
  {
    id: 'c1-c5-myelopathy',
    name: 'C1-C5 Myelopathy',
    description: 'Tetraparesis with all four limbs affected',
    icon: '🔝',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      // Gait - tetraparesis
      3: {
        status: 'abnormal',
        data: {
          ambulatoryStatus: 'Ambulatory tetraparesis',
          paresis: ['LF', 'RF', 'LH', 'RH'],
          ataxiaType: 'General proprioceptive'
        }
      },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      // Postural reactions - all four limbs
      12: {
        status: 'abnormal',
        data: {
          affectedLimbs: ['LF', 'RF', 'LH', 'RH'],
          severity: 'Delayed'
        }
      },
      // Thoracic limb reflexes - normal or increased
      13: {
        status: 'abnormal',
        data: {
          leftForelimb: 'Normal',
          rightForelimb: 'Normal'
        }
      },
      // Pelvic limb reflexes - increased
      14: {
        status: 'abnormal',
        data: {
          leftHindlimb: 'Increased',
          rightHindlimb: 'Increased'
        }
      },
      15: { status: 'normal', data: {} },
      // Cervical pain
      16: {
        status: 'abnormal',
        data: {
          cervicalPain: true
        }
      },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 3: L4-S3 Lesion (Lower Motor Neuron)
  {
    id: 'l4-s3-lesion',
    name: 'L4-S3 Lesion',
    description: 'Lower motor neuron signs, decreased reflexes',
    icon: '⬇️',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      // Gait - non-ambulatory or ambulatory paraparesis
      3: {
        status: 'abnormal',
        data: {
          ambulatoryStatus: 'Ambulatory paraparesis',
          paresis: ['LH', 'RH']
        }
      },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      // Postural reactions - pelvic limbs
      12: {
        status: 'abnormal',
        data: {
          affectedLimbs: ['LH', 'RH'],
          severity: 'Absent'
        }
      },
      13: { status: 'normal', data: {} },
      // Pelvic limb reflexes - DECREASED/ABSENT (LMN)
      14: {
        status: 'abnormal',
        data: {
          leftHindlimb: 'Decreased',
          rightHindlimb: 'Decreased'
        }
      },
      // Perineal/anal tone may be decreased
      15: {
        status: 'abnormal',
        data: {
          perinealReflex: 'Decreased',
          analTone: 'Decreased'
        }
      },
      // Lumbosacral pain
      16: {
        status: 'abnormal',
        data: {
          lumbarPain: true,
          lumbosacralPain: true
        }
      },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 4: Vestibular Disease
  {
    id: 'vestibular',
    name: 'Vestibular Disease',
    description: 'Head tilt, nystagmus, circling, normal strength',
    icon: '🔄',
    sections: {
      1: { status: 'normal', data: {} },
      // Posture - head tilt
      2: {
        status: 'abnormal',
        data: {
          headTilt: 'L' // Can be customized to R
        }
      },
      // Gait - circling, wide-based
      3: {
        status: 'abnormal',
        data: {
          ambulatoryStatus: 'Ambulatory',
          circlingL: true,
          wideBasedStance: true,
          ataxiaType: 'Vestibular'
        }
      },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      // Eye position - nystagmus
      6: {
        status: 'abnormal',
        data: {
          horizontalNystagmus: true
        }
      },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'normal', data: {} }, // Normal strength
      13: { status: 'normal', data: {} },
      14: { status: 'normal', data: {} },
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 5: Brain Disease / Seizures
  {
    id: 'brain-seizures',
    name: 'Brain/Seizures',
    description: 'Altered mentation, possible seizures, CN deficits',
    icon: '🧠',
    sections: {
      // Mentation - altered
      1: {
        status: 'abnormal',
        data: {
          mentation: 'Obtunded',
          disorientation: true
        }
      },
      2: { status: 'normal', data: {} },
      3: { status: 'normal', data: {} },
      // Menace - may be absent
      4: {
        status: 'abnormal',
        data: {
          affectedSide: 'Bilateral'
        }
      },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'normal', data: {} },
      13: { status: 'normal', data: {} },
      14: { status: 'normal', data: {} },
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 6: Normal Exam (for quick documentation)
  {
    id: 'normal-exam',
    name: 'Normal Exam',
    description: 'All sections within normal limits',
    icon: '✅',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'normal', data: {} },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'normal', data: {} },
      13: { status: 'normal', data: {} },
      14: { status: 'normal', data: {} },
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  }
];

/**
 * Get a template by ID
 */
export function getTemplate(id: string): NeuroExamTemplate | undefined {
  return NEURO_EXAM_TEMPLATES.find(template => template.id === id);
}

/**
 * Get list of all templates
 */
export function getAllTemplates(): NeuroExamTemplate[] {
  return NEURO_EXAM_TEMPLATES;
}

/**
 * Apply a template to sections state
 * Returns new sections object with template data applied
 */
export function applyTemplateToSections(
  templateId: string,
  currentSections: any
): any {
  const template = getTemplate(templateId);
  if (!template) return currentSections;

  const newSections = { ...currentSections };

  // Apply each section from template
  Object.entries(template.sections).forEach(([sectionId, sectionData]) => {
    const id = parseInt(sectionId);
    newSections[id] = {
      ...newSections[id],
      status: sectionData.status,
      data: { ...sectionData.data },
      expanded: false // Collapse all sections initially
    };
  });

  return newSections;
}
