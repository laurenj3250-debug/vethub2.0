import { NeurologicalCondition } from './types';

/**
 * Comprehensive database of 28+ common neurological conditions
 * with MRI findings templates
 */

export const neurologicalConditions: NeurologicalCondition[] = [
  // ==================== BRAIN CONDITIONS ====================

  {
    id: 'meningioma',
    name: 'Meningioma',
    category: 'Brain',
    subcategory: 'Neoplasia',
    commonBreeds: ['Golden Retriever', 'Boxer', 'Doberman', 'Mixed Breed'],
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T2*-GRE', abbreviation: 'T2*', required: false },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Cerebral convexity', 'Falx cerebri', 'Tentorium cerebelli', 'Olfactory bulb region'],
      primaryFindings: [
        'Extra-axial, broad-based mass with dural attachment',
        'Smooth, well-defined margins',
        'Compression of adjacent brain parenchyma',
        'CSF cleft between mass and brain (characteristic)',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Isointense', pattern: 'to gray matter' },
        { sequence: 'T2', intensity: 'Isointense', pattern: 'to hyperintense' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Homogeneous, intense enhancement' },
      ],
      secondaryFindings: [
        'Perilesional vasogenic edema (variable)',
        'Mass effect with midline shift',
        'Ventricular compression',
        'Dural tail sign (may be present)',
        'Bone remodeling in chronic cases',
      ],
      enhancement: 'Intense, homogeneous contrast enhancement (typical)',
      massEffect: 'Variable depending on size; compression of adjacent structures',
    },
    variants: [
      {
        id: 'meningioma-cystic',
        name: 'Cystic Meningioma',
        description: 'Less common variant with cystic component',
        modifications: {
          primaryFindings: [
            'Extra-axial mass with cystic component',
            'Solid and cystic portions',
            'Well-defined margins',
          ],
        },
      },
    ],
    differentials: ['Choroid plexus tumor (if intraventricular)', 'Histiocytic sarcoma', 'Metastatic disease', 'Granuloma'],
    clinicalNotes: 'Most common primary brain tumor in dogs and cats. Typically affects older animals (mean age 9-11 years). Surgical resection often curative if accessible location.',
    recommendations: [
      'Neurosurgery consultation for resectability assessment',
      'CT for surgical planning (better bone detail)',
      'Clinical staging for metastatic disease (thoracic radiographs)',
      'Consider advanced imaging (perfusion, spectroscopy) if available',
    ],
  },

  {
    id: 'glioma',
    name: 'Glioma / Glial Tumor',
    category: 'Brain',
    subcategory: 'Neoplasia',
    commonBreeds: ['Boxer', 'Boston Terrier', 'Bulldog', 'Brachycephalic breeds'],
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
      { name: 'DWI', abbreviation: 'DWI', required: false },
    ],
    finding: {
      location: ['Frontal lobe', 'Temporal lobe', 'Parietal lobe', 'Piriform lobe'],
      primaryFindings: [
        'Intra-axial, infiltrative mass',
        'Poorly defined margins',
        'Loss of gray-white matter differentiation',
        'Expansion of affected brain region',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'to isointense' },
        { sequence: 'T2', intensity: 'Hyperintense' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Variable', pattern: 'Heterogeneous or rim enhancement' },
      ],
      secondaryFindings: [
        'Extensive perilesional edema',
        'Mass effect with midline shift',
        'Ventricular compression',
        'Cortical involvement',
        'Necrosis (high-grade)',
      ],
      enhancement: 'Variable; minimal to heterogeneous or rim enhancement',
      massEffect: 'Typically significant mass effect',
    },
    differentials: ['Meningioma', 'MUO/GME', 'Abscess', 'Infarct (acute)', 'Metastatic disease'],
    clinicalNotes: 'Second most common primary brain tumor. Poor prognosis; median survival 2-6 months even with treatment. High-grade gliomas (glioblastoma) most aggressive.',
    recommendations: [
      'Biopsy for definitive diagnosis (if accessible)',
      'Palliative radiation therapy',
      'Corticosteroids for edema management',
      'Advanced imaging (perfusion, spectroscopy) for grading',
    ],
  },

  {
    id: 'muo-brain',
    name: 'MUO Brain (Meningoencephalitis of Unknown Origin)',
    category: 'Brain',
    subcategory: 'Inflammatory',
    commonBreeds: ['Pug', 'Maltese', 'Yorkshire Terrier', 'Chihuahua', 'Pekingese'],
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Forebrain (cortex/subcortex)', 'Thalamus', 'Basal nuclei', 'Multifocal'],
      primaryFindings: [
        'Multifocal, asymmetric T2/FLAIR hyperintense lesions',
        'Gray and white matter involvement',
        'Ill-defined margins',
        'Variable size lesions',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'to isointense' },
        { sequence: 'T2', intensity: 'Hyperintense' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Variable', pattern: 'Patchy, leptomeningeal enhancement' },
      ],
      secondaryFindings: [
        'Leptomeningeal enhancement',
        'Mild to moderate mass effect',
        'Ventricular distortion',
        'Cerebral atrophy (chronic cases)',
      ],
      enhancement: 'Variable; patchy parenchymal or leptomeningeal enhancement',
    },
    differentials: ['Infectious meningoencephalitis', 'Neoplasia (glioma, lymphoma)', 'Infarct', 'Metabolic encephalopathy'],
    clinicalNotes: 'Diagnosis requires CSF analysis (inflammatory cells, elevated protein). Treatment: immunosuppression (corticosteroids, cytarabine). Prognosis variable; some respond well, others progressive.',
    recommendations: [
      'CSF analysis (mandatory for diagnosis)',
      'Infectious disease testing (Toxoplasma, Neospora, Distemper)',
      'Immunosuppressive therapy',
      'Follow-up MRI in 4-8 weeks to assess response',
    ],
  },

  {
    id: 'gme',
    name: 'GME (Granulomatous Meningoencephalomyelitis)',
    category: 'Brain',
    subcategory: 'Inflammatory',
    commonBreeds: ['Terrier breeds', 'Toy Poodle', 'Mixed Breed'],
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Cerebral hemispheres', 'Brainstem', 'Cerebellum', 'Optic pathways'],
      primaryFindings: [
        'Focal or multifocal T2/FLAIR hyperintense lesions',
        'Periventricular distribution common',
        'Mass-like appearance (focal form)',
        'Poorly defined margins',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense' },
        { sequence: 'T2', intensity: 'Hyperintense' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Ring or heterogeneous enhancement' },
      ],
      secondaryFindings: [
        'Mass effect (focal form)',
        'Hydrocephalus (if obstructive)',
        'Leptomeningeal enhancement',
        'Optic nerve involvement (10-25% of cases)',
      ],
      enhancement: 'Variable; ring, nodular, or heterogeneous enhancement',
    },
    differentials: ['Neoplasia (glioma, lymphoma)', 'Abscess', 'Infectious encephalitis', 'Other MUO subtypes'],
    clinicalNotes: 'GME is a specific subtype of MUO. Three forms: focal, multifocal, ocular. Young to middle-aged dogs. Acute to subacute onset. CSF: mononuclear pleocytosis.',
    recommendations: [
      'CSF analysis for definitive diagnosis',
      'Rule out infectious causes',
      'Aggressive immunosuppression (corticosteroids + cytarabine or cyclosporine)',
      'Radiation therapy for focal form',
    ],
  },

  {
    id: 'stroke',
    name: 'Cerebrovascular Accident (Stroke)',
    category: 'Brain',
    subcategory: 'Vascular',
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T2*-GRE', abbreviation: 'T2*', required: true },
      { name: 'DWI', abbreviation: 'DWI', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: false },
    ],
    finding: {
      location: ['MCA territory', 'Thalamus', 'Cerebellum', 'Brainstem'],
      primaryFindings: [
        'Wedge-shaped lesion following vascular territory',
        'Restricted diffusion on DWI (acute ischemic)',
        'Mass effect (acute phase)',
        'Loss of gray-white differentiation',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'Acute to subacute' },
        { sequence: 'T2', intensity: 'Hyperintense' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'DWI', intensity: 'Hyperintense', pattern: 'Restricted diffusion (acute ischemic)' },
        { sequence: 'T2*', intensity: 'Hypointense', pattern: 'If hemorrhagic transformation' },
      ],
      secondaryFindings: [
        'Mass effect with sulcal effacement',
        'Hemorrhagic transformation (15-40%)',
        'Contrast enhancement (subacute)',
        'Atrophy/encephalomalacia (chronic)',
      ],
      enhancement: 'Gyral enhancement in subacute phase (days to weeks)',
    },
    differentials: ['Brain tumor', 'Abscess', 'Meningoencephalitis', 'Trauma', 'FCE (if brainstem)'],
    clinicalNotes: 'Peracute to acute onset focal neurological signs. More common in older dogs with underlying disease (hypertension, hyperadrenocorticism, CKD, cardiac disease).',
    recommendations: [
      'Workup for underlying causes (BP, CBC/Chem, UA, thyroid, coagulation panel, cardiac evaluation)',
      'Thoracic radiographs / abdominal ultrasound',
      'MR angiography if available',
      'Supportive care; address underlying disease',
    ],
  },

  {
    id: 'hydrocephalus',
    name: 'Hydrocephalus',
    category: 'Brain',
    subcategory: 'Congenital/Developmental',
    commonBreeds: ['Chihuahua', 'Maltese', 'Yorkshire Terrier', 'Toy breeds', 'Brachycephalic breeds'],
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: false },
    ],
    finding: {
      location: ['Lateral ventricles', 'Third ventricle', 'Fourth ventricle', 'Aqueduct of Sylvius'],
      primaryFindings: [
        'Severe dilation of lateral ventricles',
        'Thinning of cerebral cortex',
        'Elevation/thinning of corpus callosum',
        'Dorsal deviation of falx cerebri',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'CSF signal' },
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'CSF signal' },
        { sequence: 'FLAIR', intensity: 'Hypointense', pattern: 'Suppressed CSF (if communicating)' },
      ],
      secondaryFindings: [
        'Open fontanelle (toy breeds)',
        'Periventricular edema/gliosis (FLAIR hyperintensity)',
        'Aqueductal stenosis (if obstructive)',
        'Mass lesion causing obstruction',
      ],
      measurements: 'Ventricular height-to-brain height ratio',
    },
    differentials: ['Ventriculomegaly ex vacuo (atrophy)', 'Normal variation (toy breeds)'],
    clinicalNotes: 'Congenital or acquired. Congenital: toy breeds, often asymptomatic unless severe. Acquired: secondary to obstruction (tumor, inflammation).',
    recommendations: [
      'Assess for cause if obstructive (tumor, cyst, inflammation)',
      'Neurosurgery consultation if symptomatic (VP shunt)',
      'Medical management (corticosteroids, acetazolamide)',
      'Monitor progression with serial imaging',
    ],
  },

  {
    id: 'chiari',
    name: 'Chiari-Like Malformation / Syringomyelia',
    category: 'Brain',
    subcategory: 'Congenital/Developmental',
    commonBreeds: ['Cavalier King Charles Spaniel', 'Brussels Griffon', 'Chihuahua'],
    recommendedSequences: [
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
    ],
    finding: {
      location: ['Caudal fossa', 'Foramen magnum', 'Cervical spinal cord'],
      primaryFindings: [
        'Cerebellar herniation through foramen magnum',
        'Compressed/crowded caudal fossa',
        'Dorsal indentation of cerebellum',
        'Syrinx formation in cervical spinal cord (syringomyelia)',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'CSF signal in syrinx' },
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'CSF signal in syrinx' },
      ],
      secondaryFindings: [
        'Kinking of medulla',
        'Dilation of central canal (hydromyelia)',
        'Asymmetric syrinx',
        'Pre-syrinx signal change',
      ],
      measurements: 'Syrinx width (mm), syrinx length',
    },
    differentials: ['Idiopathic syringomyelia', 'Spinal cord tumor', 'Post-traumatic syrinx'],
    clinicalNotes: 'Very common in Cavaliers (prevalence >95%). Clinical signs: neck pain, scratching, scoliosis. Not all dogs with malformation are symptomatic.',
    recommendations: [
      'Neurology consultation for medical vs surgical management',
      'Medical management: gabapentin, corticosteroids, omeprazole',
      'Surgical decompression (foramen magnum decompression)',
      'Genetic screening; do not breed affected dogs',
    ],
  },

  {
    id: 'pituitary-macroadenoma',
    name: 'Pituitary Macroadenoma',
    category: 'Brain',
    subcategory: 'Neoplasia',
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Sella turcica', 'Pituitary fossa', 'Suprasellar cistern'],
      primaryFindings: [
        'Enlarged pituitary gland (>6mm height in dogs)',
        'Mass effect on hypothalamus',
        'Suprasellar extension',
        'Loss of bright spot (neurohypophysis)',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Isointense', pattern: 'to hypointense' },
        { sequence: 'T2', intensity: 'Isointense', pattern: 'to hyperintense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Homogeneous enhancement' },
      ],
      secondaryFindings: [
        'Third ventricle compression',
        'Hypothalamic compression',
        'Optic chiasm compression (rare)',
      ],
      measurements: 'Pituitary height (mm), pituitary-to-brain ratio',
    },
    differentials: ['Pituitary hyperplasia', 'Other sellar masses (rare)'],
    clinicalNotes: 'Associated with pituitary-dependent hyperadrenocorticism (Cushing\'s). Macroadenoma: >10mm or pituitary:brain ratio >0.31. Neurological signs if large.',
    recommendations: [
      'Endocrine testing (ACTH stim, LDDST)',
      'Radiation therapy if neurological signs',
      'Medical management of hypercortisolism (trilostane, mitotane)',
      'Monitor tumor size with serial MRI',
    ],
  },

  {
    id: 'choroid-plexus-tumor',
    name: 'Choroid Plexus Tumor',
    category: 'Brain',
    subcategory: 'Neoplasia',
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Lateral ventricles (most common)', 'Fourth ventricle', 'Third ventricle'],
      primaryFindings: [
        'Intraventricular mass',
        'Lobulated or cauliflower-like appearance',
        'Hydrocephalus (common)',
        'Expansion of affected ventricle',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Isointense' },
        { sequence: 'T2', intensity: 'Isointense', pattern: 'to hyperintense' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Intense homogeneous enhancement' },
      ],
      secondaryFindings: [
        'Obstructive hydrocephalus',
        'Periventricular edema',
        'Intraventricular hemorrhage (may occur)',
      ],
      enhancement: 'Intense, homogeneous enhancement',
    },
    differentials: ['Meningioma (extra-axial)', 'Ependymoma', 'Central neuroblastoma', 'Metastasis'],
    clinicalNotes: 'Third most common primary brain tumor. Often large at diagnosis due to hydrocephalus. Surgery challenging due to intraventricular location.',
    recommendations: [
      'Neurosurgery consultation',
      'VP shunt if severe hydrocephalus',
      'Tumor resection if accessible',
      'Palliative radiation therapy',
    ],
  },

  {
    id: 'brain-abscess',
    name: 'Brain Abscess',
    category: 'Brain',
    subcategory: 'Infectious',
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
      { name: 'DWI', abbreviation: 'DWI', required: true },
    ],
    finding: {
      location: ['Cerebral hemispheres', 'Variable locations'],
      primaryFindings: [
        'Well-defined round or oval mass',
        'Central necrosis/purulent material',
        'Smooth capsule formation',
        'Restricted diffusion (DWI)',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'Central necrosis' },
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'Central hyperintense, peripheral hypointense rim' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Smooth rim enhancement' },
        { sequence: 'DWI', intensity: 'Hyperintense', pattern: 'Restricted diffusion in abscess cavity' },
      ],
      secondaryFindings: [
        'Extensive perilesional edema',
        'Mass effect',
        'Satellite lesions (may be present)',
      ],
      enhancement: 'Smooth, thin rim enhancement',
    },
    differentials: ['Glioma (with necrosis)', 'Metastasis', 'Granuloma', 'Resolving hematoma'],
    clinicalNotes: 'Bacterial or fungal. Often secondary to otitis media/interna, penetrating trauma, or hematogenous spread. Restricted diffusion on DWI is key feature.',
    recommendations: [
      'Bacterial and fungal culture (blood, CSF if safe)',
      'Long-term antibiotics (6-8 weeks minimum)',
      'Surgical drainage if accessible',
      'Address primary source of infection',
    ],
  },

  {
    id: 'necrotizing-encephalitis',
    name: 'Necrotizing Encephalitis (NME/NLE)',
    category: 'Brain',
    subcategory: 'Inflammatory',
    commonBreeds: ['Pug (NME)', 'Yorkshire Terrier (NLE)', 'Chihuahua', 'Maltese', 'Pekingese'],
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Cerebral cortex (NME)', 'Subcortical white matter', 'Thalamus', 'Brainstem (NLE)'],
      primaryFindings: [
        'Multifocal asymmetric lesions',
        'Cortical and subcortical involvement',
        'Cavitation/necrosis (advanced cases)',
        'Loss of gray-white differentiation',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense' },
        { sequence: 'T2', intensity: 'Hyperintense' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Variable', pattern: 'Gyral, leptomeningeal, or parenchymal enhancement' },
      ],
      secondaryFindings: [
        'Mass effect',
        'Ventricular distortion',
        'Brain atrophy (chronic)',
        'Leptomeningeal enhancement',
      ],
      enhancement: 'Variable; gyral, parenchymal, or leptomeningeal',
    },
    differentials: ['GME', 'MUO', 'Infectious meningoencephalitis', 'Neoplasia'],
    clinicalNotes: 'NME (Pug Dog Encephalitis): acute to subacute, seizures common, poor prognosis. NLE: broader breed distribution, white matter predominance. Diagnosis: CSF + MRI.',
    recommendations: [
      'CSF analysis',
      'Rule out infectious causes',
      'Aggressive immunosuppression',
      'Guarded to poor prognosis',
    ],
  },

  {
    id: 'fungal-encephalitis',
    name: 'Fungal Encephalitis',
    category: 'Brain',
    subcategory: 'Infectious',
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Variable', 'Often multifocal', 'Meninges', 'Brainstem'],
      primaryFindings: [
        'Multifocal intra-axial lesions',
        'Granulomatous inflammation',
        'Meningeal thickening',
        'Mass-like lesions (granulomas)',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'to isointense' },
        { sequence: 'T2', intensity: 'Hyperintense' },
        { sequence: 'FLAIR', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Nodular, ring, or leptomeningeal enhancement' },
      ],
      secondaryFindings: [
        'Leptomeningeal enhancement',
        'Hydrocephalus (if obstructive)',
        'Perilesional edema',
      ],
      enhancement: 'Marked leptomeningeal and parenchymal enhancement',
    },
    differentials: ['Bacterial meningoencephalitis', 'MUO', 'Neoplasia', 'Toxoplasmosis'],
    clinicalNotes: 'Most common: Cryptococcus (cats), Aspergillus. Often disseminated disease. Requires fungal serology, CSF culture.',
    recommendations: [
      'Fungal serology (Cryptococcus antigen, Aspergillus, etc.)',
      'CSF analysis and culture',
      'Systemic antifungal therapy (fluconazole, itraconazole)',
      'Thoracic radiographs for disseminated disease',
    ],
  },

  {
    id: 'bacterial-meningoencephalitis',
    name: 'Bacterial Meningoencephalitis',
    category: 'Brain',
    subcategory: 'Infectious',
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Meninges', 'Variable parenchymal involvement', 'Ventricles'],
      primaryFindings: [
        'Leptomeningeal thickening',
        'Parenchymal lesions (if abscess formation)',
        'Ventriculitis',
        'Sulcal effacement',
      ],
      signalCharacteristics: [
        { sequence: 'FLAIR', intensity: 'Hyperintense', pattern: 'Subarachnoid space (meningitis)' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Diffuse leptomeningeal enhancement' },
      ],
      secondaryFindings: [
        'Hydrocephalus',
        'Parenchymal edema',
        'Abscess formation',
        'Ventricular enlargement',
      ],
      enhancement: 'Diffuse leptomeningeal enhancement',
    },
    differentials: ['Fungal meningoencephalitis', 'MUO', 'Neoplastic meningitis'],
    clinicalNotes: 'Often secondary to otitis media/interna, diskospondylitis, or septicemia. Requires CSF analysis and culture. Aggressive antibiotic therapy essential.',
    recommendations: [
      'CSF analysis and culture',
      'Blood culture',
      'Long-term antibiotics (4-6 weeks minimum)',
      'Address primary source of infection',
    ],
  },

  {
    id: 'brain-trauma',
    name: 'Brain Trauma / Traumatic Brain Injury',
    category: 'Brain',
    subcategory: 'Trauma',
    recommendedSequences: [
      { name: 'T1-weighted', abbreviation: 'T1', required: true },
      { name: 'T2-weighted', abbreviation: 'T2', required: true },
      { name: 'FLAIR', abbreviation: 'FLAIR', required: true },
      { name: 'T2*-GRE', abbreviation: 'T2*', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: false },
    ],
    finding: {
      location: ['Coup and contrecoup sites', 'Variable locations'],
      primaryFindings: [
        'Contusion with hemorrhage',
        'Diffuse axonal injury',
        'Subdural or epidural hematoma',
        'Intraparenchymal hemorrhage',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Variable', pattern: 'Depending on hemorrhage age' },
        { sequence: 'T2', intensity: 'Variable', pattern: 'Edema hyperintense, hemorrhage variable' },
        { sequence: 'T2*', intensity: 'Hypointense', pattern: 'Hemorrhage (blooming artifact)' },
        { sequence: 'FLAIR', intensity: 'Hyperintense', pattern: 'Edema, contusion' },
      ],
      secondaryFindings: [
        'Cerebral edema',
        'Mass effect',
        'Herniation (severe cases)',
        'Skull fracture',
      ],
    },
    differentials: ['Hemorrhagic stroke', 'Coagulopathy', 'Neoplasia with hemorrhage'],
    clinicalNotes: 'Acute onset following trauma. Severity ranges from mild concussion to severe diffuse axonal injury. T2* essential for detecting microhemorrhages.',
    recommendations: [
      'CT for acute assessment (skull fractures, hemorrhage)',
      'Serial neurological examinations',
      'Medical management (mannitol, hypertonic saline for elevated ICP)',
      'Follow-up MRI if neurological deterioration',
    ],
  },

  // ==================== SPINE CONDITIONS ====================

  {
    id: 'ivdd-type1',
    name: 'IVDD Type I (Acute Disc Extrusion)',
    category: 'Spine',
    subcategory: 'Degenerative',
    commonBreeds: ['Dachshund', 'French Bulldog', 'Beagle', 'Cocker Spaniel', 'Shih Tzu'],
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
      { name: 'T2*-GRE', abbreviation: 'T2*', required: false },
      { name: 'STIR', abbreviation: 'STIR', required: false },
    ],
    finding: {
      location: ['T12-T13 (most common)', 'T11-L2 (thoracolumbar)', 'C2-C3', 'L1-L2'],
      primaryFindings: [
        'Loss of normal hyperintense disc signal on T2',
        'Dorsal or dorsolateral extradural material compressing spinal cord',
        'Disc material extension into vertebral canal',
        'Spinal cord compression with deformation',
      ],
      signalCharacteristics: [
        { sequence: 'T2', intensity: 'Hypointense', pattern: 'Degenerated disc - loss of fluid' },
        { sequence: 'T2', intensity: 'Variable', pattern: 'Extruded material (iso- to hyperintense)' },
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'to isointense disc material' },
        { sequence: 'T2-Cord', intensity: 'Hyperintense', pattern: 'Intramedullary signal if edema/hemorrhage' },
      ],
      secondaryFindings: [
        'Intramedullary T2 hyperintensity (edema, hemorrhage, or myelomalacia)',
        'Spinal cord swelling',
        'Narrowing of epidural fat',
        'Foraminal stenosis',
        'Multiple disc protrusions (common)',
        'Loss of epidural fat signal',
      ],
      measurements: 'Measure degree of spinal canal stenosis (%)',
      massEffect: 'Spinal cord compression - grade severity (mild/moderate/severe)',
    },
    variants: [
      {
        id: 'ivdd-type1-explosive',
        name: 'Explosive/High-velocity IVDD',
        description: 'Severe acute extrusion with significant hemorrhage',
        modifications: {
          signalCharacteristics: [
            { sequence: 'T2*', intensity: 'Hypointense', pattern: 'Hemorrhage (blooming artifact)' },
            { sequence: 'T2-Cord', intensity: 'Hypointense', pattern: 'Central hemorrhage' },
          ],
          secondaryFindings: [
            'Extensive intramedullary hemorrhage',
            'Severe spinal cord swelling',
            'Poor prognosis indicators',
          ],
        },
      },
    ],
    differentials: ['IVDD Type II (chronic)', 'Neoplasia', 'FCE', 'Epidural hemorrhage', 'Discospondylitis'],
    clinicalNotes: 'Chondrodystrophic breeds predisposed. Grading: 1-5 based on neurological status. Deep pain negative (grade 5) has guarded prognosis. Decompressive surgery recommended for grade 4-5.',
    recommendations: [
      'Neurosurgery consultation for grade 3-5',
      'Grade spinal cord compression severity',
      'Assess for additional disc herniations',
      'Post-operative MRI if no neurological improvement',
      'Consider T2* or SWI for hemorrhage assessment',
    ],
  },

  {
    id: 'ivdd-type2',
    name: 'IVDD Type II (Chronic Disc Protrusion)',
    category: 'Spine',
    subcategory: 'Degenerative',
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
    ],
    finding: {
      location: ['Cervical (C2-C7)', 'Thoracolumbar', 'Lumbosacral'],
      primaryFindings: [
        'Dorsal annular bulge',
        'Chronic disc degeneration',
        'Mild to moderate spinal cord compression',
        'Intact dorsal longitudinal ligament',
      ],
      signalCharacteristics: [
        { sequence: 'T2', intensity: 'Hypointense', pattern: 'Degenerated disc' },
        { sequence: 'T1', intensity: 'Hypointense' },
        { sequence: 'T2-Cord', intensity: 'Hyperintense', pattern: 'Myelomalacia (severe chronic cases)' },
      ],
      secondaryFindings: [
        'Spondylosis deformans',
        'Articular process hypertrophy',
        'Ligamentum flavum hypertrophy',
        'Spinal stenosis',
        'Multiple levels affected',
      ],
      massEffect: 'Gradual progressive compression',
    },
    differentials: ['IVDD Type I', 'Cervical spondylomyelopathy', 'Neoplasia', 'Lumbosacral stenosis'],
    clinicalNotes: 'Non-chondrodystrophic breeds, older dogs. Slowly progressive signs. Often multiple levels. Conservative management often effective.',
    recommendations: [
      'Conservative management (rest, anti-inflammatories, physical therapy)',
      'Neurosurgery if severe or progressive',
      'Cervical collar for cervical cases',
      'Weight management',
    ],
  },

  {
    id: 'fce',
    name: 'FCE (Fibrocartilaginous Embolism)',
    category: 'Spine',
    subcategory: 'Vascular',
    commonBreeds: ['Large breed dogs', 'Miniature Schnauzer', 'Labrador Retriever'],
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
    ],
    finding: {
      location: ['C6-T2', 'L4-S1', 'Variable spinal levels'],
      primaryFindings: [
        'Intramedullary T2 hyperintensity',
        'Unilateral or asymmetric cord lesion',
        'Focal spinal cord swelling',
        'Normal intervertebral discs',
        'No extradural compression',
      ],
      signalCharacteristics: [
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'Intramedullary' },
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'to isointense' },
      ],
      secondaryFindings: [
        'Mild cord swelling',
        'Lesion confined to specific vascular territory',
        'No contrast enhancement (acute)',
        'Resolution of signal change (follow-up)',
      ],
    },
    differentials: ['IVDD Type I (check discs carefully)', 'MUO spine', 'Spinal cord neoplasia', 'Trauma'],
    clinicalNotes: 'Peracute onset, often during exercise. Non-progressive after initial injury. Asymmetric deficits common. Diagnosis of exclusion (normal discs, no compression). Prognosis depends on severity.',
    recommendations: [
      'Rule out IVDD (carefully assess all discs)',
      'Supportive care, physical therapy',
      'Monitor for progressive myelomalacia (rare)',
      'Good prognosis if deep pain present',
    ],
  },

  {
    id: 'muo-spine',
    name: 'MUO Spine (Myelitis)',
    category: 'Spine',
    subcategory: 'Inflammatory',
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Variable spinal levels', 'Often multifocal', 'Cervical', 'Thoracolumbar'],
      primaryFindings: [
        'Intramedullary T2 hyperintensity',
        'Focal or multifocal lesions',
        'Spinal cord swelling',
        'No extradural compression',
      ],
      signalCharacteristics: [
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'Intramedullary' },
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'to isointense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Variable parenchymal or meningeal enhancement' },
      ],
      secondaryFindings: [
        'Meningeal enhancement',
        'Multiple lesions',
        'Brain lesions (may coexist)',
      ],
      enhancement: 'Variable; parenchymal or meningeal enhancement',
    },
    differentials: ['FCE', 'Spinal cord neoplasia', 'Infectious myelitis', 'Vascular malformation'],
    clinicalNotes: 'Inflammatory myelopathy of unknown etiology. CSF analysis required for diagnosis (elevated protein, pleocytosis). Treatment: immunosuppression.',
    recommendations: [
      'CSF analysis (mandatory)',
      'Infectious disease testing',
      'Immunosuppressive therapy (corticosteroids + cytarabine)',
      'Follow-up MRI to assess response',
    ],
  },

  {
    id: 'discospondylitis',
    name: 'Discospondylitis',
    category: 'Spine',
    subcategory: 'Infectious',
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
      { name: 'STIR', abbreviation: 'STIR', required: false },
    ],
    finding: {
      location: ['L7-S1 (most common)', 'Mid-lumbar', 'Mid-thoracic', 'C6-C7'],
      primaryFindings: [
        'Loss of disc height',
        'Endplate erosion and irregularity',
        'T2 hyperintensity of disc and adjacent vertebrae',
        'Bone lysis',
      ],
      signalCharacteristics: [
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'Disc and vertebral endplates' },
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'Disc and vertebral endplates' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Disc, endplates, and surrounding tissues' },
        { sequence: 'STIR', intensity: 'Hyperintense', pattern: 'Active inflammation' },
      ],
      secondaryFindings: [
        'Epidural abscess or phlegmon',
        'Spinal cord compression',
        'Paraspinal soft tissue swelling',
        'New bone formation (chronic)',
      ],
      enhancement: 'Marked enhancement of disc, endplates, and epidural space',
    },
    differentials: ['Neoplasia (vertebral)', 'IVDD with modic changes', 'Fracture'],
    clinicalNotes: 'Bacterial (most common) or fungal infection. Often Staphylococcus. Blood culture positive in ~50%. Long-term antibiotics required.',
    recommendations: [
      'Blood culture',
      'CT-guided biopsy for culture if blood culture negative',
      'Long-term antibiotics (6-8 weeks minimum, often 3-6 months)',
      'Neurosurgery if severe compression or instability',
    ],
  },

  {
    id: 'atlantoaxial-instability',
    name: 'Atlantoaxial Instability',
    category: 'Spine',
    subcategory: 'Congenital/Developmental',
    commonBreeds: ['Toy breeds', 'Yorkshire Terrier', 'Chihuahua', 'Pomeranian', 'Maltese'],
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
    ],
    finding: {
      location: ['C1-C2 articulation'],
      primaryFindings: [
        'Increased distance between dorsal arch of C1 and spinous process of C2',
        'Dorsal displacement of C2 dens into vertebral canal',
        'Spinal cord compression at C1-C2',
        'Absent or hypoplastic dens',
      ],
      signalCharacteristics: [
        { sequence: 'T2-Cord', intensity: 'Hyperintense', pattern: 'Cord compression/myelomalacia' },
      ],
      secondaryFindings: [
        'Spinal cord swelling',
        'Syringohydromyelia',
        'Ligamentous laxity',
      ],
      measurements: 'Atlantoaxial distance (mm)',
    },
    differentials: ['C1-C2 fracture/luxation (trauma)', 'Dens fracture'],
    clinicalNotes: 'Congenital in toy breeds due to ligamentous laxity or dens abnormality. Acute trauma can precipitate clinical signs. Surgical stabilization often required.',
    recommendations: [
      'Neurosurgery consultation',
      'Ventral stabilization (surgical)',
      'Conservative management (neck brace) rarely successful',
      'Post-operative imaging to confirm stability',
    ],
  },

  {
    id: 'wobbler-syndrome',
    name: 'Cervical Spondylomyelopathy (Wobbler Syndrome)',
    category: 'Spine',
    subcategory: 'Degenerative',
    commonBreeds: ['Doberman Pinscher', 'Great Dane', 'Mastiff', 'Rottweiler'],
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
    ],
    finding: {
      location: ['C5-C6', 'C6-C7 (Dobermans)', 'C4-C5', 'C3-C4 (Great Danes)'],
      primaryFindings: [
        'Spinal cord compression',
        'Disc-associated (Dobermans): IVDD Type II with dorsal annular bulge',
        'Osseous-associated (Great Danes): vertebral malformation, stenosis',
        'Ligamentum flavum hypertrophy',
      ],
      signalCharacteristics: [
        { sequence: 'T2-Cord', intensity: 'Hyperintense', pattern: 'Myelomalacia (severe chronic)' },
      ],
      secondaryFindings: [
        'Articular process hypertrophy',
        'Vertebral canal stenosis',
        'Multiple levels affected',
        'Dynamic compression (flexion/extension)',
      ],
      massEffect: 'Variable compression, worse on flexion in some cases',
    },
    differentials: ['IVDD Type II', 'Neoplasia', 'MUO'],
    clinicalNotes: 'Chronic progressive ataxia, proprioceptive deficits worse in pelvic limbs. Two forms: disc-associated (Dobermans, middle-aged) and osseous-associated (Great Danes, young).',
    recommendations: [
      'Neurosurgery consultation',
      'Ventral slot decompression or dorsal laminectomy',
      'Conservative management (anti-inflammatories, activity restriction) for mild cases',
      'Cervical collar',
    ],
  },

  {
    id: 'degenerative-myelopathy',
    name: 'Degenerative Myelopathy',
    category: 'Spine',
    subcategory: 'Degenerative',
    commonBreeds: ['German Shepherd Dog', 'Boxer', 'Pembroke Welsh Corgi', 'Rhodesian Ridgeback'],
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
    ],
    finding: {
      location: ['Thoracolumbar region', 'Ascending to cervical over time'],
      primaryFindings: [
        'NORMAL MRI in early stages',
        'Mild T2 hyperintensity in dorsal columns (advanced)',
        'Spinal cord atrophy (advanced)',
        'No spinal cord compression',
      ],
      signalCharacteristics: [
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'Dorsal columns (advanced cases)' },
      ],
      secondaryFindings: [
        'Normal intervertebral discs',
        'No extradural compression',
        'Progressive atrophy',
      ],
    },
    differentials: ['IVDD', 'Lumbosacral stenosis', 'Neoplasia', 'MUO'],
    clinicalNotes: 'Diagnosis of exclusion. MRI primarily to rule out other causes. Genetic test (SOD1 mutation) available. Progressive, non-painful. No effective treatment.',
    recommendations: [
      'Rule out other compressive or inflammatory causes',
      'Genetic testing (SOD1 mutation)',
      'Physical therapy and supportive care',
      'Quality of life assessment',
    ],
  },

  {
    id: 'spinal-neoplasia-intramedullary',
    name: 'Spinal Cord Neoplasia (Intramedullary)',
    category: 'Spine',
    subcategory: 'Neoplasia',
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Variable spinal levels', 'Often cervical or thoracolumbar'],
      primaryFindings: [
        'Intramedullary mass causing cord expansion',
        'Focal spinal cord enlargement',
        'T2 hyperintense lesion within cord',
        'Loss of normal cord architecture',
      ],
      signalCharacteristics: [
        { sequence: 'T2', intensity: 'Hyperintense' },
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'to isointense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Variable enhancement' },
      ],
      secondaryFindings: [
        'Syrinx formation (rostral/caudal to tumor)',
        'Cord swelling',
        'Hemorrhage (may occur)',
      ],
      enhancement: 'Variable; heterogeneous or rim enhancement',
    },
    differentials: ['MUO', 'FCE', 'Abscess', 'Granuloma'],
    clinicalNotes: 'Most common: astrocytoma, ependymoma. Slowly progressive signs. Diagnosis: MRI + biopsy. Prognosis generally poor.',
    recommendations: [
      'Biopsy for definitive diagnosis',
      'Radiation therapy (palliative)',
      'Surgical debulking (rarely curative)',
      'Corticosteroids for edema',
    ],
  },

  {
    id: 'spinal-neoplasia-extradural',
    name: 'Spinal Cord Neoplasia (Extradural)',
    category: 'Spine',
    subcategory: 'Neoplasia',
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Variable', 'Often multiple vertebrae'],
      primaryFindings: [
        'Vertebral body lysis or proliferation',
        'Extradural mass compressing spinal cord',
        'Vertebral fracture (pathologic)',
        'Paraspinal soft tissue mass',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'Tumor replacing normal marrow' },
        { sequence: 'T2', intensity: 'Variable' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Variable enhancement' },
      ],
      secondaryFindings: [
        'Spinal cord compression',
        'Epidural mass',
        'Multiple vertebrae affected (lymphoma, metastases)',
      ],
      enhancement: 'Variable depending on tumor type',
    },
    differentials: ['Discospondylitis', 'Vertebral fracture', 'Hematoma'],
    clinicalNotes: 'Most common: lymphoma, hemangiosarcoma, osteosarcoma, plasma cell tumor, metastases. Staging workup required.',
    recommendations: [
      'Staging (thoracic radiographs, abdominal ultrasound, lymph node aspirates)',
      'Biopsy for diagnosis',
      'Radiation therapy',
      'Surgical decompression if solitary and accessible',
    ],
  },

  {
    id: 'spinal-neoplasia-extramedullary-intradural',
    name: 'Spinal Cord Neoplasia (Extramedullary-Intradural)',
    category: 'Spine',
    subcategory: 'Neoplasia',
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Variable spinal levels', 'Often cervical or lumbar'],
      primaryFindings: [
        'Intradural mass separate from spinal cord',
        'Spinal cord displacement/compression',
        'Well-defined margins',
        'Mass arising from nerve root or meninges',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Isointense', pattern: 'to hypointense' },
        { sequence: 'T2', intensity: 'Isointense', pattern: 'to hyperintense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Homogeneous enhancement' },
      ],
      secondaryFindings: [
        'Spinal cord compression',
        'Syrinx formation',
        'Widening of intervertebral foramen (nerve sheath tumor)',
      ],
      enhancement: 'Intense homogeneous enhancement (typical)',
    },
    differentials: ['Meningioma', 'Nerve sheath tumor', 'Ependymoma'],
    clinicalNotes: 'Most common: meningioma (dogs), nerve sheath tumor (cats, dogs). Slowly progressive. Surgical resection often curative if complete.',
    recommendations: [
      'Neurosurgery consultation',
      'Surgical resection (often curative if complete)',
      'Radiation therapy if incomplete resection',
      'Good prognosis if early diagnosis',
    ],
  },

  {
    id: 'lumbosacral-stenosis',
    name: 'Lumbosacral Stenosis (Cauda Equina Syndrome)',
    category: 'Spine',
    subcategory: 'Degenerative',
    commonBreeds: ['German Shepherd Dog', 'Large breed dogs'],
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
    ],
    finding: {
      location: ['L7-S1 (most common)', 'L6-L7'],
      primaryFindings: [
        'Disc degeneration and protrusion',
        'Narrowing of vertebral canal',
        'Compression of cauda equina nerve roots',
        'Foraminal stenosis',
      ],
      signalCharacteristics: [
        { sequence: 'T2', intensity: 'Hypointense', pattern: 'Degenerated disc' },
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'Nerve root inflammation (may be present)' },
      ],
      secondaryFindings: [
        'Spondylosis deformans',
        'Facet joint hypertrophy',
        'Epidural fibrosis',
        'Sacral fracture (chronic trauma)',
      ],
      massEffect: 'Cauda equina compression',
    },
    differentials: ['Discospondylitis', 'Neoplasia', 'Epidural hematoma'],
    clinicalNotes: 'Pain on tail elevation, reluctance to jump, pelvic limb weakness, urinary/fecal incontinence. Often exacerbated by exercise.',
    recommendations: [
      'Conservative management (rest, anti-inflammatories, physical therapy)',
      'Weight management',
      'Surgical decompression (dorsal laminectomy) if severe or refractory',
      'Epidural steroid injection',
    ],
  },

  {
    id: 'arachnoid-diverticulum',
    name: 'Arachnoid Diverticulum / Cyst',
    category: 'Spine',
    subcategory: 'Congenital/Developmental',
    commonBreeds: ['Pug', 'French Bulldog', 'Rottweiler'],
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
    ],
    finding: {
      location: ['Thoracic spine (T2-T9)', 'Cervical spine'],
      primaryFindings: [
        'Intradural, extramedullary cystic structure',
        'CSF signal intensity',
        'Dorsal to spinal cord',
        'Spinal cord compression and displacement',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'CSF signal' },
        { sequence: 'T2', intensity: 'Hyperintense', pattern: 'CSF signal' },
      ],
      secondaryFindings: [
        'Spinal cord atrophy',
        'Syrinx formation',
        'Cord signal change',
        'Kyphosis',
      ],
      measurements: 'Cyst dimensions',
    },
    differentials: ['Epidermoid cyst', 'Subarachnoid cyst', 'Chronic subdural hematoma'],
    clinicalNotes: 'Slowly progressive myelopathy. Often diagnosed incidentally. Pathogenesis unclear - may be congenital or acquired.',
    recommendations: [
      'Neurosurgery consultation',
      'Surgical fenestration or marsupializatio n',
      'Monitor if asymptomatic',
      'Good prognosis if early intervention',
    ],
  },

  {
    id: 'spinal-epidural-empyema',
    name: 'Spinal Epidural Empyema (Abscess)',
    category: 'Spine',
    subcategory: 'Infectious',
    recommendedSequences: [
      { name: 'T2-weighted Sagittal', abbreviation: 'T2-SAG', required: true },
      { name: 'T2-weighted Transverse', abbreviation: 'T2-TRV', required: true },
      { name: 'T1-weighted Sagittal', abbreviation: 'T1-SAG', required: true },
      { name: 'T1 post-contrast', abbreviation: 'T1+C', required: true },
    ],
    finding: {
      location: ['Variable', 'Often associated with discospondylitis'],
      primaryFindings: [
        'Epidural collection of purulent material',
        'Spinal cord compression',
        'Often associated with discospondylitis',
        'Rim enhancement',
      ],
      signalCharacteristics: [
        { sequence: 'T1', intensity: 'Hypointense', pattern: 'to isointense' },
        { sequence: 'T2', intensity: 'Hyperintense' },
        { sequence: 'T1+C', intensity: 'Hyperintense', pattern: 'Rim enhancement of abscess wall' },
      ],
      secondaryFindings: [
        'Discospondylitis',
        'Paraspinal soft tissue swelling',
        'Spinal cord edema',
      ],
      enhancement: 'Rim enhancement of abscess capsule',
    },
    differentials: ['Epidural hematoma', 'Neoplasia', 'Granuloma'],
    clinicalNotes: 'Bacterial infection (often Staphylococcus). Rapidly progressive. Requires urgent surgical decompression and drainage.',
    recommendations: [
      'Emergency surgical decompression and drainage',
      'Culture of abscess material',
      'Long-term antibiotics (6-8 weeks)',
      'Address underlying discospondylitis',
    ],
  },
];

export default neurologicalConditions;
