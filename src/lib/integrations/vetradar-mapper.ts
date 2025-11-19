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
  const nameParts = vetRadarPatient.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

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

  // Format therapeutics (medications list or treatment summaries)
  // Clean formatting - remove "undefined" values and extra spaces
  const therapeutics = hasMedications
    ? medications.map(med => {
        const parts = [med.name, med.dose, med.route, med.frequency]
          .filter(p => p && p !== 'undefined' && String(p).trim() !== '')
          .map(p => String(p).trim());
        return parts.join(' ');
      }).filter(Boolean).join('\n')
    : treatmentSummaries.join('\n');

  // Format problems from VetRadar issues or critical notes
  const problems = (vetRadarPatient.issues || []).length > 0
    ? (vetRadarPatient.issues || []).join('\n')
    : (vetRadarPatient.criticalNotes || []).join('\n');

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
    diagnosticFindings: vetRadarPatient.diagnosticFindings || '', // From vision extraction or manual entry
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

  // Build unified patient object
  const unifiedPatient: UnifiedPatient = {
    id: existingPatient?.id || Number(vetRadarPatient.id) || Date.now(),
    mrn: existingPatient?.mrn,

    demographics: {
      name: vetRadarPatient.name,
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

  if (statusLower.includes('discharged')) {
    return 'Discharged';
  } else if (statusLower.includes('mri')) {
    return 'MRI';
  } else if (statusLower.includes('surgery')) {
    return 'Surgery';
  } else {
    // Default to Active for critical, stable, friendly, or other statuses
    return 'Active';
  }
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
  const roundingData: RoundingData = {
    signalment,
    location: treatmentSheet.location,
    icuCriteria: treatmentSheet.location.toLowerCase().includes('icu') ? 'Yes' : '',
    codeStatus: 'Yellow', // Default
    problems: '',
    diagnosticFindings: '',
    therapeutics: medications.map(m => `${m.name} ${m.dose} ${m.route} ${m.frequency}`.trim()).join('\n'),
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
