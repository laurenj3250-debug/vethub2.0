import { type SectionGroupConfig } from './types';

export const SECTION_TITLES: Record<number, string> = {
  1: 'Mentation & Behavior',
  2: 'Posture & Position at Rest',
  3: 'Gait Evaluation',
  4: 'Menace Response',
  5: 'Pupil Evaluation',
  6: 'Eye Position & Nystagmus',
  7: 'Palpebral Reflex',
  8: 'Facial Sensation',
  9: 'Jaw & Facial Motor',
  10: 'Tongue Assessment',
  11: 'Gag Reflex',
  12: 'Postural Reactions',
  13: 'Thoracic Limb Reflexes',
  14: 'Pelvic Limb Reflexes',
  15: 'Perineal & Anal',
  16: 'Palpation - Spine',
  17: 'Limb Palpation',
  18: 'Nociception',
};

export const SECTION_GROUPS: SectionGroupConfig[] = [
  {
    id: 1,
    label: 'General',
    bulkLabel: 'All General Normal',
    sectionIds: [1, 2, 3],
  },
  {
    id: 2,
    label: 'Cranial Nerves',
    bulkLabel: 'All CN Normal',
    sectionIds: [4, 5, 6, 7, 8, 9, 10, 11],
  },
  {
    id: 3,
    label: 'Postural & Reflexes',
    bulkLabel: 'All Reflexes Normal',
    sectionIds: [12, 13, 14],
  },
  {
    id: 4,
    label: 'Tone & Palpation',
    bulkLabel: 'All Palpation Normal',
    sectionIds: [15, 16, 17],
  },
  {
    id: 5,
    label: 'Nociception',
    bulkLabel: 'Normal',
    sectionIds: [18],
  },
];

export const INITIAL_SECTIONS = () => {
  const sections: Record<number, { status: null; expanded: boolean; data: Record<string, any> }> = {};
  for (let i = 1; i <= 18; i++) {
    sections[i] = { status: null, expanded: false, data: {} };
  }
  return sections;
};
