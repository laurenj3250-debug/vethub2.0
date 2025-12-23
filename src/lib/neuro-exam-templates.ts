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
    description: 'Non-ambulatory paraparesis, UMN pelvic',
    icon: '🦴',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { nonAmbPara: true, propAtaxia: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { absentLH: true, absentRH: true } },
      13: { status: 'normal', data: {} },
      14: { status: 'abnormal', data: { increasedL: true, increasedR: true } },
      15: { status: 'normal', data: {} },
      16: { status: 'abnormal', data: { thoracicPain: true, lumbarPain: true } },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 2: C1-C5 Myelopathy
  {
    id: 'c1-c5-myelopathy',
    name: 'C1-C5',
    description: 'Ambulatory tetraparesis, UMN all 4',
    icon: '🔝',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambTetra: true, propAtaxia: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { delayedLF: true, delayedRF: true, delayedLH: true, delayedRH: true } },
      13: { status: 'normal', data: {} },
      14: { status: 'abnormal', data: { increasedL: true, increasedR: true } },
      15: { status: 'normal', data: {} },
      16: { status: 'abnormal', data: { cervicalPain: true } },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 3: C6-T2 Myelopathy (cervicothoracic)
  {
    id: 'c6-t2-myelopathy',
    name: 'C6-T2',
    description: 'LMN thoracic, UMN pelvic',
    icon: '⬇️',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambTetra: true, propAtaxia: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { delayedLF: true, delayedRF: true, absentLH: true, absentRH: true } },
      13: { status: 'abnormal', data: { decreasedL: true, decreasedR: true } },
      14: { status: 'abnormal', data: { increasedL: true, increasedR: true } },
      15: { status: 'normal', data: {} },
      16: { status: 'abnormal', data: { cervicalPain: true } },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 4: L4-S3 Lesion (Lower Motor Neuron)
  {
    id: 'l4-s3-lesion',
    name: 'L4-S3',
    description: 'LMN pelvic, decreased reflexes',
    icon: '⬇️',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambPara: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { absentLH: true, absentRH: true } },
      13: { status: 'normal', data: {} },
      14: { status: 'abnormal', data: { decreasedL: true, decreasedR: true } },
      15: { status: 'abnormal', data: { decreased: true } },
      16: { status: 'abnormal', data: { lumbarPain: true, lsPain: true } },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 5: FCE (Fibrocartilaginous Embolism)
  {
    id: 'fce',
    name: 'FCE',
    description: 'Hyperacute, asymmetric, non-painful',
    icon: '⚡',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { nonAmbPara: true, propAtaxia: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { absentLH: true, delayedRH: true } }, // Asymmetric
      13: { status: 'normal', data: {} },
      14: { status: 'abnormal', data: { increasedL: true } }, // Asymmetric
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} }, // NON-PAINFUL - key differentiator from IVDD
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 6: Peripheral Vestibular
  {
    id: 'peripheral-vestibular',
    name: 'Periph Vestib',
    description: 'Head tilt, horizontal nystagmus, normal strength',
    icon: '👂',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'abnormal', data: { headTiltL: true } },
      3: { status: 'abnormal', data: { vestAtaxia: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'abnormal', data: { horizNystagmus: true } },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'normal', data: {} }, // NORMAL - key differentiator
      13: { status: 'normal', data: {} },
      14: { status: 'normal', data: {} },
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 7: Central Vestibular
  {
    id: 'central-vestibular',
    name: 'Central Vestib',
    description: 'Head tilt, vertical nystagmus, postural deficits',
    icon: '🧠',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'abnormal', data: { headTiltL: true } },
      3: { status: 'abnormal', data: { vestAtaxia: true, propAtaxia: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'abnormal', data: { vertNystagmus: true, positionalNystagmus: true } },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { delayedLF: true, delayedLH: true } }, // ABNORMAL - key differentiator
      13: { status: 'normal', data: {} },
      14: { status: 'normal', data: {} },
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 8: Wobbler Syndrome / CCSM
  {
    id: 'wobbler',
    name: 'Wobbler',
    description: 'Amb tetra, worse pelvic, two-engine gait',
    icon: '🐕',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambTetra: true, propAtaxia: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { delayedLF: true, delayedRF: true, absentLH: true, absentRH: true } },
      13: { status: 'normal', data: {} },
      14: { status: 'abnormal', data: { increasedL: true, increasedR: true } },
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} }, // Usually non-painful
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 9: Degenerative Myelopathy
  {
    id: 'dm',
    name: 'DM',
    description: 'Progressive paraparesis, non-painful, older dog',
    icon: '📉',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambPara: true, propAtaxia: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { delayedLH: true, delayedRH: true } },
      13: { status: 'normal', data: {} },
      14: { status: 'abnormal', data: { increasedL: true, increasedR: true } }, // Or normal in early stages
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} }, // NON-PAINFUL - hallmark
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 10: Polyneuropathy
  {
    id: 'polyneuropathy',
    name: 'Polyneuropathy',
    description: 'LMN all 4, decreased reflexes, hypotonia',
    icon: '🔌',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambTetra: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { delayedLF: true, delayedRF: true, delayedLH: true, delayedRH: true } },
      13: { status: 'abnormal', data: { decreasedL: true, decreasedR: true } },
      14: { status: 'abnormal', data: { decreasedL: true, decreasedR: true } },
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 11: Myasthenia Gravis
  {
    id: 'myasthenia',
    name: 'Myasthenia',
    description: 'Exercise-induced weakness, normal reflexes',
    icon: '💪',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambTetra: true } }, // Weakness but can walk
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'abnormal', data: { decreased: true } }, // Decreased gag reflex common
      12: { status: 'normal', data: {} }, // NORMAL - key differentiator from polyneuropathy
      13: { status: 'normal', data: {} }, // NORMAL reflexes
      14: { status: 'normal', data: {} }, // NORMAL reflexes
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 12: Cauda Equina / LS Disease
  {
    id: 'cauda-equina',
    name: 'Cauda Equina',
    description: 'LMN pelvic, tail paralysis, incontinence',
    icon: '🐴',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambPara: true } },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { delayedLH: true, delayedRH: true } },
      13: { status: 'normal', data: {} },
      14: { status: 'abnormal', data: { decreasedL: true, decreasedR: true } },
      15: { status: 'abnormal', data: { decreased: true, toneLoss: true } }, // Key finding
      16: { status: 'abnormal', data: { lsPain: true } },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 13: Brain Disease / Forebrain
  {
    id: 'forebrain',
    name: 'Forebrain',
    description: 'Altered mentation, seizures, circling',
    icon: '🧠',
    sections: {
      1: { status: 'abnormal', data: { obtunded: true, circlingL: true } },
      2: { status: 'normal', data: {} },
      3: { status: 'normal', data: {} }, // Normal gait typically
      4: { status: 'abnormal', data: { absentR: true } }, // Contralateral menace deficit
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'normal', data: {} },
      8: { status: 'normal', data: {} },
      9: { status: 'normal', data: {} },
      10: { status: 'normal', data: {} },
      11: { status: 'normal', data: {} },
      12: { status: 'abnormal', data: { delayedRF: true, delayedRH: true } }, // Contralateral deficits
      13: { status: 'normal', data: {} },
      14: { status: 'normal', data: {} },
      15: { status: 'normal', data: {} },
      16: { status: 'normal', data: {} },
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 14: Post-ictal
  {
    id: 'post-ictal',
    name: 'Post-ictal',
    description: 'Obtunded, blind, resolving deficits',
    icon: '⚡',
    sections: {
      1: { status: 'abnormal', data: { obtunded: true, disorientation: true } },
      2: { status: 'normal', data: {} },
      3: { status: 'normal', data: {} },
      4: { status: 'abnormal', data: { absentBilat: true } }, // Temporary blindness
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
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

  // Template 15: Meningitis
  {
    id: 'meningitis',
    name: 'Meningitis',
    description: 'Cervical pain+++, stiff gait, fever',
    icon: '🤒',
    sections: {
      1: { status: 'abnormal', data: { depressed: true } },
      2: { status: 'normal', data: {} },
      3: { status: 'abnormal', data: { ambTetra: true } }, // Stiff gait
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
      16: { status: 'abnormal', data: { cervicalPain: true, thoracicPain: true, lumbarPain: true } }, // Severe multifocal pain
      17: { status: 'normal', data: {} },
      18: { status: 'normal', data: {} }
    }
  },

  // Template 16: Horner's Syndrome
  {
    id: 'horners',
    name: "Horner's",
    description: 'Miosis, ptosis, enophthalmos',
    icon: '👁️',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'normal', data: {} },
      4: { status: 'normal', data: {} },
      5: { status: 'abnormal', data: { miosisL: true } }, // Unilateral miosis
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

  // Template 17: Facial Nerve Paralysis
  {
    id: 'facial-paralysis',
    name: 'CN VII Paralysis',
    description: 'Facial droop, absent palpebral, ear droop',
    icon: '😐',
    sections: {
      1: { status: 'normal', data: {} },
      2: { status: 'normal', data: {} },
      3: { status: 'normal', data: {} },
      4: { status: 'normal', data: {} },
      5: { status: 'normal', data: {} },
      6: { status: 'normal', data: {} },
      7: { status: 'abnormal', data: { absentL: true } },
      8: { status: 'normal', data: {} },
      9: { status: 'abnormal', data: { facialParL: true, lipDroopL: true } },
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

  // Template 18: Normal Exam
  {
    id: 'normal-exam',
    name: 'Normal',
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
      expanded: false
    };
  });

  return newSections;
}
