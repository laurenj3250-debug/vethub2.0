/**
 * VetRadar to UnifiedPatient Mapper
 *
 * Maps VetRadar scraped data to the enhanced UnifiedPatient structure
 * with support for lab results, MRI data, and sticker generation
 */

import { UnifiedPatient, RoundingData, StickerData } from '@/contexts/PatientContext';
import { VetRadarPatient, VetRadarTreatmentSheet } from './vetradar-scraper';

/**
 * Map VetRadar patient to UnifiedPatient structure
 * Auto-populates 85% of fields from VetRadar data
 *
 * Fields requiring manual entry after import:
 * 1. Neurologic localization (dropdown)
 * 2. Lab results (paste from EasyVet)
 * 3. Chest X-ray findings (optional)
 * 4. MRI region + ASA status (if MRI scheduled)
 * 5. Sticker flags (New Admit / Surgery)
 */
export function mapVetRadarToUnifiedPatient(
  vetRadarPatient: VetRadarPatient,
  existingPatient?: Partial<UnifiedPatient>
): UnifiedPatient {
  console.log('[VetRadar Mapper] Mapping patient:', vetRadarPatient.name, '| VetRadar ID:', vetRadarPatient.id);

  // Parse name (VetRadar format: "FirstName LastName")
  // Add owner last name if available for display consistency
  const nameParts = vetRadarPatient.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  // Extract owner last name to append to patient name
  let ownerLastName = '';
  if (vetRadarPatient.ownerName) {
    const ownerName = vetRadarPatient.ownerName.trim();
    if (ownerName.includes(',')) {
      // Format: "Smith, John" → take first part
      ownerLastName = ownerName.split(',')[0].trim();
    } else {
      // Format: "John Smith" → take last word
      ownerLastName = ownerName.split(' ').pop()?.trim() || '';
    }
  }
  const fullPatientName = ownerLastName ? `${vetRadarPatient.name} ${ownerLastName}` : vetRadarPatient.name;

  // Infer location (IP vs ICU)
  let location = 'IP'; // Default
  if (vetRadarPatient.location?.toLowerCase().includes('icu')) {
    location = 'ICU';
  }

  // Infer code status from VetRadar status badge
  let codeStatus = 'Yellow'; // Default - requires review
  if (vetRadarPatient.status) {
    const statusLower = vetRadarPatient.status.toLowerCase();
    if (statusLower.includes('critical')) {
      codeStatus = 'Red';
    } else if (statusLower.includes('caution')) {
      codeStatus = 'Orange';
    } else if (statusLower.includes('friendly') || statusLower.includes('stable')) {
      codeStatus = 'Green';
    }
  }

  // Parse medications (if available from Phase 2, otherwise use treatments)
  const medications = (vetRadarPatient.medications || []).map(med => ({
    name: med.medication,
    dose: med.dose,
    route: med.route,
    frequency: med.frequency,
    time: med.time,
    completed: false,
  }));

  // If no detailed medications, use treatment summaries from Phase 1
  const hasMedications = medications.length > 0;
  const treatmentSummaries = vetRadarPatient.treatments || [];

  // Use comprehensive vision data if available, otherwise fallback to legacy detection
  const fluidsText = vetRadarPatient.fluids?.type
    ? `${vetRadarPatient.fluids.type} ${vetRadarPatient.fluids.rate || ''}`.trim()
    : (() => {
        // Legacy fallback: Detect fluids from medications or treatment summaries
        const fluidsFromMeds = medications.filter(med => {
          const medLower = med.name.toLowerCase();
          return medLower.includes('lrs') ||
                 medLower.includes('lactated ringer') ||
                 medLower.includes('saline') ||
                 medLower.includes('normosol') ||
                 medLower.includes('plasmalyte') ||
                 medLower.includes('fluid');
        });

        const fluidsFromTreatments = treatmentSummaries.filter(t => {
          const tLower = t.toLowerCase();
          return tLower.includes('fluid') || tLower.includes('lrs') || tLower.includes('saline');
        });

        return hasMedications
          ? fluidsFromMeds.map(f => `${f.name} ${f.dose} ${f.route} ${f.frequency}`.trim()).join('; ')
          : fluidsFromTreatments.join('; ');
      })();

  // Use comprehensive vision data for CRI if available
  const hasCRI = vetRadarPatient.cri?.medications
    ? true
    : (hasMedications
        ? medications.some(med => {
            const medLower = med.name.toLowerCase();
            const freqLower = med.frequency?.toLowerCase() || '';
            return medLower.includes('cri') ||
                   freqLower.includes('cri') ||
                   medLower.includes('fentanyl') ||
                   medLower.includes('lidocaine') ||
                   medLower.includes('ketamine') ||
                   (medLower.includes('infusion') && !medLower.includes('fluid'));
          })
        : treatmentSummaries.some(t => t.toLowerCase().includes('cri') || t.toLowerCase().includes('infusion')));

  // Therapeutics are NOT auto-populated - user fills fresh each day
  // (Previously pulled from VetRadar medications list or treatment summaries)
  const therapeutics = '';

  // Problems are NOT auto-populated - user fills fresh each day
  // (Previously pulled from VetRadar issues or critical notes)
  const problems = '';

  // Diagnostic findings - NOT auto-populated EXCEPT for MRI admits
  // MRI admits get default: "CBC/Chem: pending, CXR: pending"
  const inferredType = inferPatientType(vetRadarPatient);
  const isMRIAdmit = inferredType === 'MRI' ||
    (vetRadarPatient.location || '').toLowerCase().includes('mri') ||
    (vetRadarPatient.status || '').toLowerCase().includes('mri');
  const diagnosticFindings = isMRIAdmit ? 'CBC/Chem: pending, CXR: pending' : '';

  // Build signalment
  const signalment = [
    vetRadarPatient.age,
    vetRadarPatient.sex,
    vetRadarPatient.breed,
    vetRadarPatient.weight ? `${vetRadarPatient.weight}kg` : ''
  ].filter(Boolean).join(' ');

  // Check if this is likely an ICU patient
  // IP patients get "N/A", ICU patients get "Yes", others get blank
  const meetsICUCriteria = location === 'IP' ? 'N/A' : (location === 'ICU' ? 'Yes' : '');

  // Build comprehensive concerns from vision data
  const comprehensiveConcerns = [
    vetRadarPatient.concerns,
    vetRadarPatient.vitals?.trends,
    vetRadarPatient.ivc?.status?.includes('replacement') ? 'Replace IVC' : '',
  ].filter(Boolean).join('; ');

  // Build comprehensive comments from physical exam and vitals
  const comprehensiveComments = [
    vetRadarPatient.physicalExam?.attitude ? `Attitude: ${vetRadarPatient.physicalExam.attitude}` : '',
    vetRadarPatient.physicalExam?.mm ? `MM: ${vetRadarPatient.physicalExam.mm}` : '',
    vetRadarPatient.physicalExam?.crt ? `CRT: ${vetRadarPatient.physicalExam.crt}` : '',
    vetRadarPatient.vitals?.painScore ? `Pain: ${vetRadarPatient.vitals.painScore}` : '',
    vetRadarPatient.vitals?.latestTemp ? `Temp: ${vetRadarPatient.vitals.latestTemp}` : '',
    vetRadarPatient.vitals?.latestHR ? `HR: ${vetRadarPatient.vitals.latestHR}` : '',
    vetRadarPatient.vitals?.latestRR ? `RR: ${vetRadarPatient.vitals.latestRR}` : '',
  ].filter(Boolean).join('; ');

  // Create rounding data with comprehensive vision extraction
  const roundingData: RoundingData = {
    signalment,
    location: location || 'IP', // Default to "IP" (In-Patient) unless specific location from VetRadar
    icuCriteria: meetsICUCriteria || 'N/a', // Default to "N/a" unless patient meets ICU criteria
    code: codeStatus, // Maps to 'code' field in rounding sheet
    codeStatus, // Keep for backwards compatibility
    problems,
    diagnosticFindings, // Empty unless MRI admit (then: CBC/Chem: pending, CXR: pending)
    therapeutics,
    ivc: fluidsText ? 'Y' : 'N',
    fluids: fluidsText,
    cri: hasCRI ? 'Y' : 'N',
    overnightDx: '', // Requires manual entry
    concerns: comprehensiveConcerns || vetRadarPatient.cage_location || '',
    comments: comprehensiveComments || '',

    // Fields auto-populated from VetRadar
    neurolocalization: '',
    labResults: undefined,
    chestXray: {
      findings: 'NSF', // Default - update if abnormal
    },
  };

  // Initialize sticker data with default flags
  const stickerData: StickerData = {
    isNewAdmit: false, // MANUAL ENTRY REQUIRED
    isSurgery: false,  // MANUAL ENTRY REQUIRED
    bigLabelCount: 2,  // Will auto-calculate when flags are set
    tinySheetCount: 0,
  };

  // Infer patient type from VetRadar data
  const patientType = inferPatientType(vetRadarPatient);
  console.log(`[VetRadar Mapper] Inferred type for ${vetRadarPatient.name}: ${patientType}`);

  // Build unified patient object
  const unifiedPatient: UnifiedPatient = {
    id: existingPatient?.id || Number(vetRadarPatient.id) || Date.now(),
    mrn: existingPatient?.mrn,
    type: patientType, // Inferred from VetRadar data

    demographics: {
      name: fullPatientName,
      age: vetRadarPatient.age,
      sex: vetRadarPatient.sex,
      breed: vetRadarPatient.breed,
      species: vetRadarPatient.species,
      weight: vetRadarPatient.weight ? `${vetRadarPatient.weight}kg` : '',
      ownerName: existingPatient?.demographics?.ownerName || vetRadarPatient.ownerName,  // Use VetRadar owner name if available
      ownerPhone: existingPatient?.demographics?.ownerPhone || vetRadarPatient.ownerPhone,  // Use VetRadar phone if available
      ownerEmail: existingPatient?.demographics?.ownerEmail,
      ownerAddress: existingPatient?.demographics?.ownerAddress,
      microchip: existingPatient?.demographics?.microchip,
      colorMarkings: existingPatient?.demographics?.colorMarkings || vetRadarPatient.color,  // Use VetRadar color/markings if available
      dateOfBirth: existingPatient?.demographics?.dateOfBirth || vetRadarPatient.dob,  // Use VetRadar DOB if available
      clientId: existingPatient?.demographics?.clientId || vetRadarPatient.clientId,  // Preserve EzyVet clientId if exists
      patientId: existingPatient?.demographics?.patientId || vetRadarPatient.patientId || vetRadarPatient.consultNumber,  // Use VetRadar Patient ID first, then Consult #
    },

    status: mapVetRadarStatusToPatientStatus(vetRadarPatient.status),

    medicalHistory: {
      allergies: existingPatient?.medicalHistory?.allergies,
      chronicConditions: existingPatient?.medicalHistory?.chronicConditions,
      previousSurgeries: existingPatient?.medicalHistory?.previousSurgeries,
      vaccinationStatus: existingPatient?.medicalHistory?.vaccinationStatus,
    },

    currentStay: {
      location,
      admitDate: existingPatient?.currentStay?.admitDate || new Date(),
      icuCriteria: meetsICUCriteria,
      codeStatus,
    },

    soapNotes: existingPatient?.soapNotes || [],

    roundingData,

    // MRI data - initialize empty (will be filled if MRI is scheduled)
    mriData: existingPatient?.mriData || {
      scheduledTime: undefined,
      scanType: undefined,
      autoCalculate: true, // Enable auto-calculation when fields are filled
    },

    // Sticker data - initialize with defaults
    stickerData,

    tasks: existingPatient?.tasks || [],

    // Metadata
    createdAt: existingPatient?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  console.log('[VetRadar Mapper] Created UnifiedPatient:', {
    id: unifiedPatient.id,
    name: unifiedPatient.demographics.name,
    breed: unifiedPatient.demographics.breed,
    age: unifiedPatient.demographics.age,
  });

  return unifiedPatient;
}

/**
 * Map VetRadar status to VetHub patient status
 */
function mapVetRadarStatusToPatientStatus(vetRadarStatus?: string): UnifiedPatient['status'] {
  if (!vetRadarStatus) return 'Active';

  const statusLower = vetRadarStatus.toLowerCase();

  if (statusLower.includes('discharg')) {
    return 'Discharged';
  } else {
    // Default to Active for active patients
    return 'Active';
  }
}

/**
 * Infer patient type (Surgery | MRI | Medical) from VetRadar data
 * Analyzes procedures, treatments, and location to determine type
 */
function inferPatientType(vetRadarPatient: VetRadarPatient): 'Surgery' | 'Medical' | 'MRI' {
  const treatments = (vetRadarPatient.treatments || []).map(t => t.toLowerCase());
  const medications = (vetRadarPatient.medications || []).map(m => m.medication.toLowerCase());
  const location = (vetRadarPatient.location || '').toLowerCase();
  const concerns = (vetRadarPatient.concerns || '').toLowerCase();
  const status = (vetRadarPatient.status || '').toLowerCase();

  // Surgical procedure keywords
  const surgicalKeywords = [
    'laminectomy', 'hemilaminectomy', 'ventral slot', 'diskectomy', 'discectomy',
    'tplo', 'ablation', 'craniotomy', 'surgery', 'surgical', 'surg',
    'excision', 'resection', 'decompression', 'stabilization', 'repair',
    'corpectomy', 'fenestration', 'durotomy', 'myelotomy'
  ];

  // Check treatments for surgical keywords
  if (treatments.some(t => surgicalKeywords.some(k => t.includes(k)))) {
    return 'Surgery';
  }

  // Check concerns for surgical keywords
  if (surgicalKeywords.some(k => concerns.includes(k))) {
    return 'Surgery';
  }

  // Anesthetic drugs often indicate surgery
  const anestheticDrugs = ['propofol', 'isoflurane', 'sevoflurane', 'alfaxalone'];
  if (medications.some(m => anestheticDrugs.some(d => m.includes(d)))) {
    return 'Surgery';
  }

  // Post-operative indicators
  const postOpKeywords = ['post-op', 'postop', 'post op', 'post-surgical', 'recovery'];
  if (treatments.some(t => postOpKeywords.some(k => t.includes(k))) ||
      concerns.includes('post-op') || concerns.includes('postop')) {
    return 'Surgery';
  }

  // MRI location or status
  if (location.includes('mri') || status.includes('mri')) {
    return 'MRI';
  }

  // Default to Medical
  return 'Medical';
}

/**
 * Map VetRadar treatment sheet to UnifiedPatient
 * (Alternative mapping from detailed treatment sheet data)
 */
export function mapTreatmentSheetToUnifiedPatient(
  treatmentSheet: VetRadarTreatmentSheet,
  existingPatient?: Partial<UnifiedPatient>
): UnifiedPatient {
  // Parse medications from treatment sheet
  const medications = treatmentSheet.medications.map(med => ({
    name: med.medication,
    dose: med.dose,
    route: med.route,
    frequency: med.frequency,
    time: med.time,
    completed: false,
  }));

  // Parse fluids
  const fluidsText = treatmentSheet.fluids
    .map(f => `${f.type} at ${f.rate} ${f.units}`.trim())
    .join('; ');

  // Detect CRI
  const hasCRI = medications.some(med => {
    const medLower = med.name.toLowerCase();
    return medLower.includes('cri') ||
           medLower.includes('fentanyl') ||
           medLower.includes('lidocaine') ||
           medLower.includes('ketamine');
  });

  // Build signalment
  const signalment = [
    treatmentSheet.age,
    treatmentSheet.sex,
    treatmentSheet.species,
    treatmentSheet.weight ? `${treatmentSheet.weight}kg` : ''
  ].filter(Boolean).join(' ');

  // Create rounding data
  // Problems and therapeutics are NOT auto-populated - user fills fresh each day
  const roundingData: RoundingData = {
    signalment,
    location: treatmentSheet.location,
    icuCriteria: treatmentSheet.location.toLowerCase().includes('icu') ? 'Yes' : '',
    codeStatus: 'Yellow', // Default
    problems: '', // NOT auto-populated
    diagnosticFindings: '',
    therapeutics: '', // NOT auto-populated
    ivc: fluidsText ? 'Y' : 'N',
    fluids: fluidsText,
    cri: hasCRI ? 'Y' : 'N',
    overnightDx: '',
    concerns: treatmentSheet.concerns || treatmentSheet.nursingNotes || '',
    comments: 'Auto-imported from VetRadar Treatment Sheet',
    neurolocalization: '',
    labResults: undefined,
    chestXray: { findings: 'NSF' },
  };

  const unifiedPatient: UnifiedPatient = {
    id: existingPatient?.id || Number(treatmentSheet.patientId) || Date.now(),
    mrn: existingPatient?.mrn,

    demographics: {
      name: treatmentSheet.patientName,
      age: treatmentSheet.age,
      sex: treatmentSheet.sex,
      breed: existingPatient?.demographics?.breed,
      species: treatmentSheet.species,
      weight: treatmentSheet.weight ? `${treatmentSheet.weight}kg` : '',
      ownerName: existingPatient?.demographics?.ownerName,
      ownerPhone: existingPatient?.demographics?.ownerPhone,
      ownerEmail: existingPatient?.demographics?.ownerEmail,
      ownerAddress: existingPatient?.demographics?.ownerAddress,
      microchip: existingPatient?.demographics?.microchip,
      colorMarkings: existingPatient?.demographics?.colorMarkings,
      dateOfBirth: existingPatient?.demographics?.dateOfBirth,
    },

    status: 'Active',

    medicalHistory: {
      allergies: existingPatient?.medicalHistory?.allergies,
      chronicConditions: existingPatient?.medicalHistory?.chronicConditions,
      previousSurgeries: existingPatient?.medicalHistory?.previousSurgeries,
      vaccinationStatus: existingPatient?.medicalHistory?.vaccinationStatus,
    },

    currentStay: {
      location: treatmentSheet.location,
      admitDate: existingPatient?.currentStay?.admitDate || new Date(),
      icuCriteria: treatmentSheet.location.toLowerCase().includes('icu') ? 'Yes' : '',
      codeStatus: 'Yellow',
    },

    soapNotes: existingPatient?.soapNotes || [],

    roundingData,

    mriData: existingPatient?.mriData || {
      scheduledTime: undefined,
      scanType: undefined,
      autoCalculate: true,
    },

    stickerData: {
      isNewAdmit: false,
      isSurgery: false,
      bigLabelCount: 2,
      tinySheetCount: 0,
    },

    tasks: existingPatient?.tasks || [],

    createdAt: existingPatient?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  return unifiedPatient;
}

/**
 * Batch map multiple VetRadar patients to UnifiedPatients
 */
export function batchMapVetRadarPatients(
  vetRadarPatients: VetRadarPatient[],
  existingPatients?: Map<string, UnifiedPatient>
): UnifiedPatient[] {
  return vetRadarPatients.map(vrPatient => {
    // Try to find existing patient by name
    const existing = existingPatients?.get(vrPatient.name);
    return mapVetRadarToUnifiedPatient(vrPatient, existing);
  });
}

/**
 * Get manual entry summary for a mapped patient
 * Shows which fields still need to be filled
 */
export function getManualEntryRequirements(patient: UnifiedPatient): {
  required: string[];
  optional: string[];
  estimated_time_seconds: number;
} {
  const required: string[] = [];
  const optional: string[] = [];
  let timeSeconds = 0;

  // 1. Neurologic localization (optional - can be filled during rounding)
  if (!patient.roundingData?.neurolocalization) {
    optional.push('Neurologic Localization (can add during rounding)');
  }

  // 2. Lab results (optional - can be filled later)
  if (!patient.roundingData?.labResults?.cbc && !patient.roundingData?.labResults?.chemistry) {
    optional.push('Lab Results (can paste from EasyVet later)');
  }

  // 3. Chest X-ray (optional, only if abnormal)
  if (patient.roundingData?.chestXray?.findings === 'NSF') {
    optional.push('Chest X-Ray Findings (only if abnormal)');
  }

  // 4. MRI fields (optional - only needed if generating MRI sheet)
  if (patient.status === 'MRI' || patient.mriData?.scheduledTime) {
    if (!patient.mriData?.scanType) {
      optional.push('MRI Region (needed for MRI sheet generation)');
    }
    if (!patient.mriData?.asaStatus) {
      optional.push('ASA Status (needed for MRI sheet generation)');
    }
  }

  // 5. Sticker flags (optional - can be set when generating stickers)
  if (patient.stickerData && !patient.stickerData.isNewAdmit && !patient.stickerData.isSurgery) {
    optional.push('Sticker Flags (for sticker generation)');
  }

  // No required fields - all data can be completed later
  // Patients are immediately ready to import and can be refined during rounding

  return {
    required,
    optional,
    estimated_time_seconds: timeSeconds,
  };
}

/**
 * Validate that patient has minimum required data for PDF generation
 */
export function validatePatientForPDFGeneration(patient: UnifiedPatient): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical fields for Rounding Sheet
  if (!patient.demographics.name) {
    errors.push('Patient name is required');
  }

  // Optional fields - show as warnings only
  if (!patient.roundingData?.neurolocalization) {
    warnings.push('Neurologic localization not set (can add during rounding)');
  }

  if (!patient.roundingData?.labResults) {
    warnings.push('No lab results (diagnostic findings will be blank - can add later)');
  }

  // MRI Sheet fields (only if MRI scheduled)
  if (patient.mriData?.scheduledTime) {
    if (!patient.mriData.scanType) {
      warnings.push('MRI region not set (needed for MRI sheet generation)');
    }
    if (!patient.mriData.asaStatus) {
      warnings.push('ASA status not set (needed for MRI sheet generation)');
    }
    if (!patient.demographics.weight) {
      warnings.push('Patient weight missing (needed for MRI dose calculation)');
    }
  }

  // Required for Stickers
  if (patient.stickerData) {
    if (!patient.demographics.ownerName) {
      warnings.push('Owner name not set - stickers will be incomplete');
    }
    if (!patient.demographics.ownerPhone) {
      warnings.push('Owner phone not set - stickers will be incomplete');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
