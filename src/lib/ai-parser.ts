import Anthropic from '@anthropic-ai/sdk';

// Support both browser and Node.js environments
const apiKey = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY  // Browser environment
  : process.env.ANTHROPIC_API_KEY;  // Node.js environment (for scripts)

// Debug: Log API key status (first 10 chars only for security)
if (typeof window !== 'undefined') {
  console.log('Anthropic API Key status:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Missing');
} else {
  console.log('[Node.js] Anthropic API Key status:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Missing');
}

// Only initialize if API key is present
const anthropic = apiKey ? new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: typeof window !== 'undefined', // Only allow browser in browser environment
}) : null;

export interface VetRadarMedication {
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  time?: string;
}

export interface ParsedPatientData {
  patientName: string;
  ownerName: string;
  ownerPhone?: string;
  species?: string;
  breed?: string;
  age?: string;
  sex?: string;
  weight?: string;
  dateOfBirth?: string;      // DOB field
  colorMarkings?: string;    // Color/markings
  patientId?: string;
  clientId?: string;
  problem?: string;
  bloodwork?: string;
  medications?: string[];
  plan?: string;
}

export async function parsePatientBlurb(blurb: string): Promise<ParsedPatientData> {
  if (!anthropic) {
    // ✅ Throw error instead of silently returning empty data
    throw new Error('Anthropic API key not configured. Add NEXT_PUBLIC_ANTHROPIC_API_KEY to environment variables.');
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Use Sonnet for better accuracy with complex VetRadar exports
      max_tokens: 512, // Reduced from 2048 - JSON responses are typically <500 tokens
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Extract structured data from this veterinary patient text (which may be a VetRadar/EzyVet export or a simple patient description) and return ONLY a JSON object with no other text or explanation.

CRITICAL INSTRUCTIONS:
- Read the ENTIRE text carefully to find patient demographics, owner info, and medical data
- For age: extract the actual age from the text (e.g., "12 years 1 month" or "12 y 1 m 1 d")
- For ownerName: extract owner's LAST NAME only (surname). "Russell Bennett" → "Bennett"
- For patientId: look for "Consult #", "Patient ID:", or similar
- For clientId: look for "Client ID", "Code", or owner reference number
- For problem: extract the presenting complaint or reason for visit
- For medications: extract all current medications mentioned
- DO NOT make up or hallucinate data - use null if not found in the text

Return this exact structure (use null for missing fields):
{
  "patientName": "pet name only, remove any 'Patient' prefix",
  "ownerName": "owner LAST NAME only (surname)",
  "ownerPhone": "phone number (primary contact)",
  "species": "dog/cat/etc",
  "breed": "breed",
  "age": "age with units (e.g., '12 years 1 month 1 day')",
  "sex": "MN/FS/etc",
  "weight": "weight with units",
  "dateOfBirth": "DOB in MM-DD-YYYY format",
  "colorMarkings": "color/markings description",
  "patientId": "Patient ID number (look for 'Patient ID:')",
  "clientId": "Consult/Case number (look for 'Consult #')",
  "problem": "presenting complaint",
  "bloodwork": "CBC/Chemistry abnormal values",
  "medications": ["list", "of", "all", "medications"],
  "plan": "treatment plan/outcome"
}

Patient text:
${blurb}

Return ONLY the JSON object, no other text:`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response (Claude might wrap it in text)
    let jsonText = content.text.trim();

    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    console.error('AI parsing error:', error);
    // ✅ Throw detailed error messages for different failure types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('AI parsing unavailable: API key not configured');
      } else if (error.message.includes('rate limit')) {
        throw new Error('AI parsing failed: Rate limit exceeded. Try again in a moment.');
      } else if (error.message.includes('JSON')) {
        throw new Error('AI parsing failed: Could not parse response. The text format may be unusual.');
      } else {
        throw new Error(`AI parsing failed: ${error.message}`);
      }
    }
    throw new Error('AI parsing failed: Unknown error occurred');
  }
}

export async function analyzeBloodwork(bloodworkText: string, species: string = 'canine'): Promise<string> {
  // Pure logic-based bloodwork analysis - no AI needed!
  // Parse bloodwork data and compare values to reference ranges

  try {
    const abnormalities: string[] = [];

    // Split into lines and parse each test
    const lines = bloodworkText.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // Expected format: "Test Name, Result, Unit, Low Range, High Range"
      // Or tab-separated: "Test Name\tResult\tUnit\tLow\tHigh"
      const parts = line.includes('\t')
        ? line.split('\t').map(p => p.trim())
        : line.split(',').map(p => p.trim());

      if (parts.length < 5) continue; // Need at least test, result, unit, low, high

      const [testName, resultStr, unit, lowStr, highStr] = parts;

      // Parse numeric values
      const result = parseFloat(resultStr.replace(/[<>]/g, ''));
      const low = parseFloat(lowStr);
      const high = parseFloat(highStr);

      // Skip if we couldn't parse the numbers
      if (isNaN(result) || isNaN(low) || isNaN(high)) continue;

      // Compare and flag abnormalities
      if (result < low) {
        abnormalities.push(`${testName}: ${resultStr} ${unit} (L)`);
      } else if (result > high) {
        abnormalities.push(`${testName}: ${resultStr} ${unit} (H)`);
      }
    }

    return abnormalities.length > 0
      ? abnormalities.join(', ')
      : 'No abnormalities detected';

  } catch (error) {
    console.error('Bloodwork analysis error:', error);
    return '';
  }
}

export async function analyzeRadiology(radiologyText: string): Promise<string> {
  if (!anthropic) {
    console.error('Anthropic API key not configured');
    return '';
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Summarize these radiology findings concisely for a rounding sheet. Focus on abnormalities.

Radiology report:
${radiologyText}

Return a brief summary (1-2 sentences):`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return '';

    return content.text.trim();
  } catch (error) {
    console.error('Radiology analysis error:', error);
    return '';
  }
}

export async function parseMedications(medText: string): Promise<string> {
  // Pure logic-based medication formatting - no AI needed!
  // Just clean up and format one medication per line

  try {
    // Split by common separators (newline, comma, semicolon)
    const medications = medText
      .split(/[\n,;]+/)
      .map(med => med.trim())
      .filter(med => med.length > 0)
      .map(med => {
        // Remove common prefixes like bullets, numbers
        return med.replace(/^[\-\*•\d+\.\)]\s*/, '').trim();
      })
      .filter(med => med.length > 0);

    return medications.join('\n');
  } catch (error) {
    console.error('Medication parsing error:', error);
    return '';
  }
}

export async function parseEzyVetBlock(fullText: string): Promise<any> {
  // Pure logic-based EzyVet parsing - no AI needed!
  // EzyVet/VetRadar exports are structured text - just extract the data

  try {
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
    const data: any = {
      signalment: '',
      location: '',
      icuCriteria: '',
      code: 'Full Code',
      problems: '',
      diagnosticFindings: '',
      therapeutics: '',
      ivc: '',
      fluids: '',
      cri: '',
      overnightDx: '',
      concerns: '',
      comments: '',
    };

    // Extract sections by looking for common field names/patterns
    let currentField = '';
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Detect field headers
      if (lowerLine.includes('signalment') || lowerLine.match(/\d+y[ro]\s+(m|f|mn|fs|mc|fc)/i)) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'signalment';
        currentContent = [line.replace(/signalment:?/i, '').trim()];
      } else if (lowerLine.includes('location') || lowerLine.includes('kennel') || lowerLine.includes('ward') || lowerLine.includes('cage')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'location';
        currentContent = [line.replace(/location:?/i, '').trim()];
      } else if (lowerLine.includes('icu') || lowerLine.includes('critical')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'icuCriteria';
        currentContent = [line.replace(/icu criteria:?/i, '').trim()];
      } else if (lowerLine.includes('code') && (lowerLine.includes('status') || lowerLine.includes('dnr') || lowerLine.includes('full'))) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'code';
        currentContent = [line.replace(/code( status)?:?/i, '').trim()];
      } else if (lowerLine.includes('problem') || lowerLine.includes('diagnosis')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'problems';
        currentContent = [line.replace(/problem(s)?:?|diagnos(is|es):?/i, '').trim()];
      } else if (lowerLine.includes('diagnostic') || lowerLine.includes('findings') || lowerLine.includes('lab') || lowerLine.includes('imaging')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'diagnosticFindings';
        currentContent = [line.replace(/diagnostic findings:?|findings:?/i, '').trim()];
      } else if (lowerLine.includes('therapeutic') || lowerLine.includes('medication') || lowerLine.includes('treatment')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'therapeutics';
        currentContent = [line.replace(/therapeutic(s)?:?|medication(s)?:?|treatment(s)?:?/i, '').trim()];
      } else if (lowerLine.includes('ivc') || lowerLine.includes('catheter')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'ivc';
        currentContent = [line.replace(/ivc:?|catheter:?/i, '').trim()];
      } else if (lowerLine.includes('fluid') && !lowerLine.includes('cri')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'fluids';
        currentContent = [line.replace(/fluid(s)?:?/i, '').trim()];
      } else if (lowerLine.includes('cri') || lowerLine.includes('constant rate')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'cri';
        currentContent = [line.replace(/cri:?|constant rate infusion(s)?:?/i, '').trim()];
      } else if (lowerLine.includes('overnight') || lowerLine.includes('overnight dx')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'overnightDx';
        currentContent = [line.replace(/overnight( dx)?:?/i, '').trim()];
      } else if (lowerLine.includes('concern')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'concerns';
        currentContent = [line.replace(/concern(s)?:?/i, '').trim()];
      } else if (lowerLine.includes('comment') || lowerLine.includes('note')) {
        if (currentField && currentContent.length > 0) {
          data[currentField] = currentContent.join(' ').trim();
        }
        currentField = 'comments';
        currentContent = [line.replace(/comment(s)?:?|note(s)?:?/i, '').trim()];
      } else if (currentField) {
        // Continue accumulating content for current field
        currentContent.push(line);
      }
    }

    // Save last field
    if (currentField && currentContent.length > 0) {
      data[currentField] = currentContent.join(' ').trim();
    }

    // Clean up empty fields
    for (const key in data) {
      if (data[key] === '' || data[key] === ':' || data[key] === '-') {
        data[key] = '';
      }
    }

    // Auto-populate diagnosticFindings with pending tests if empty
    if (!data.diagnosticFindings || data.diagnosticFindings.trim() === '') {
      data.diagnosticFindings = 'CXR: pending, CBC/Chem: pending';
    } else {
      // If there's content but no mention of pending tests, append them
      const lower = data.diagnosticFindings.toLowerCase();
      if (!lower.includes('cxr') && !lower.includes('chest x-ray') && !lower.includes('radiograph')) {
        data.diagnosticFindings = `CXR: pending, ${data.diagnosticFindings}`;
      }
      if (!lower.includes('cbc') && !lower.includes('chem') && !lower.includes('bloodwork')) {
        data.diagnosticFindings = `${data.diagnosticFindings}, CBC/Chem: pending`;
      }
    }

    return data;
  } catch (error) {
    console.error('EzyVet parsing error:', error);
    throw error;
  }
}

export async function determineScanType(problemText: string): Promise<string> {
  // Pure logic-based scan type determination - no AI needed!
  // Simple keyword matching for MRI location

  try {
    const text = (problemText || '').toLowerCase();

    // Brain scan indicators
    const brainKeywords = ['seizure', 'head tilt', 'circling', 'vestibular', 'brain', 'forebrain', 'cerebral', 'cranial nerve', 'nystagmus', 'stroke', 'encephalitis'];
    if (brainKeywords.some(kw => text.includes(kw))) {
      return 'Brain';
    }

    // C-Spine indicators
    const cspineKeywords = ['neck pain', 'cervical', 'c-spine', 'front leg', 'forelimb', 'tetraparesis', 'tetraplegia', 'all four limbs'];
    if (cspineKeywords.some(kw => text.includes(kw))) {
      return 'C-Spine';
    }

    // T-Spine indicators
    const tspineKeywords = ['thoracic', 't-spine', 'thoracolumbar', 'mid-back'];
    if (tspineKeywords.some(kw => text.includes(kw))) {
      return 'T-Spine';
    }

    // LS (lumbar/lumbosacral) indicators
    const lsKeywords = ['back pain', 'hind limb', 'rear leg', 'hind leg', 'paraparesis', 'paraplegia', 'ivdd', 'paralysis', 'lumbar', 'lumbosacral', 'cauda equina', 'ls', 'l-s'];
    if (lsKeywords.some(kw => text.includes(kw))) {
      return 'LS';
    }

    return 'Unknown';
  } catch (error) {
    console.error('Scan type determination error:', error);
    return 'Unknown';
  }
}

export async function determineNeurolocalization(clinicalSigns: string): Promise<string> {
  if (!anthropic) {
    console.error('Anthropic API key not configured');
    return '';
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 256,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `You are a veterinary neurologist. Based on the clinical signs provided, determine the neuroanatomic localization.

NEUROANATOMIC LOCALIZATIONS:
Brain:
- Forebrain: Seizures, behavioral changes, circling, visual deficits, contralateral deficits
- Brainstem: Altered consciousness, cranial nerve deficits (V-XII), hemiparesis, postural deficits
- Cerebellum: Ataxia with hypermetria, intention tremors, wide-based stance, normal strength
- Vestibular: Head tilt, nystagmus, circling, ataxia

Spinal Cord:
- C1-C5: Tetraparesis/tetraplegia, UMN all limbs, cervical pain, possible Horner's
- C6-T2: Tetraparesis, LMN thoracic limbs + UMN pelvic limbs, cervical pain, possible Horner's
- T3-L3: Paraparesis/paraplegia, normal thoracic limbs, UMN pelvic limbs, thoracolumbar pain
- L4-S3: Paraparesis/paraplegia, normal thoracic limbs, LMN pelvic limbs, lumbosacral pain
- Sacral/Caudal: Urinary/fecal incontinence, tail paralysis, perineal analgesia

Neuromuscular:
- Neuromuscular Junction: Generalized weakness, exercise intolerance, megaesophagus
- Peripheral Neuropathy: LMN signs, hyporeflexia, muscle atrophy
- Myopathy: Generalized weakness, muscle pain/atrophy, normal reflexes

Clinical signs:
${clinicalSigns}

Return ONLY the most likely neuroanatomic localization. Be specific (e.g., "C1-C5", "Forebrain", "T3-L3", "Cerebellum"). If signs suggest multiple localizations, list them separated by " / " (e.g., "Forebrain / Brainstem"). If unclear, return "Multifocal" or "Unknown".`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return '';

    return content.text.trim();
  } catch (error) {
    console.error('Neurolocalization determination error:', error);
    return '';
  }
}

/**
 * Parse VetRadar treatment sheet text using Claude Opus for medication extraction
 * Uses Opus for maximum accuracy with complex medical text
 */
export async function parseVetRadarMedications(treatmentSheetText: string): Promise<VetRadarMedication[]> {
  if (!anthropic) {
    console.warn('Anthropic API not available - cannot parse medications');
    return [];
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Use Sonnet (5x cheaper than Opus, still excellent for medical text)
      max_tokens: 1024, // Reduced from 4096 - medication lists rarely exceed 1024 tokens
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Extract all medications from this VetRadar treatment sheet text and return ONLY a JSON array with no other text or explanation.

CRITICAL INSTRUCTIONS:
- Extract EVERY medication mentioned in the text
- Include dose (with units: mg, mL, mg/kg, etc.)
- Include route (PO, IV, SQ, IM, etc.)
- Include frequency (q8h, BID, TID, SID, PRN, CRI, etc.)
- Include time of administration if specified
- DO NOT hallucinate or make up medications
- If a medication has multiple administrations (e.g., morning and evening doses), create separate entries
- Exclude fluids (LRS, saline) unless they have additives (e.g., "LRS + KCl")

Return this exact JSON structure (empty array if no medications found):
[
  {
    "medication": "Medication name",
    "dose": "dose with units (e.g., '10 mg/kg', '2.5 mL')",
    "route": "route (PO/IV/SQ/IM/etc)",
    "frequency": "frequency (q8h/BID/TID/SID/PRN/CRI/etc)",
    "time": "time if specified (e.g., '8:00 AM', 'morning', optional)"
  }
]

Treatment sheet text:
${treatmentSheetText}

Return ONLY the JSON array, no other text:`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('No text response from Claude Sonnet');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();

    // Try to find JSON array in the response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Validate that we got an array of medications
    if (!Array.isArray(parsed)) {
      console.warn('Sonnet returned non-array response, returning empty array');
      return [];
    }

    return parsed.map(med => ({
      medication: med.medication || '',
      dose: med.dose || '',
      route: med.route || '',
      frequency: med.frequency || '',
      time: med.time
    }));
  } catch (error) {
    console.error('VetRadar medication parsing error:', error);
    return [];
  }
}

/**
 * Parse VetRadar medications from screenshot using Claude Vision API
 * More reliable than text parsing because it captures everything visible
 */
/**
 * Comprehensive VetRadar data extraction from screenshot
 * Extracts: medications, vitals with trends, physical exam, fluids, CRI, procedures, concerns
 */
export async function parseVetRadarComprehensiveData(screenshotBase64: string): Promise<{
  medications: VetRadarMedication[];
  vitals: {
    latestTemp?: string;
    latestHR?: string;
    latestRR?: string;
    painScore?: string;
    trends?: string;
  };
  physicalExam: {
    mm?: string;
    crt?: string;
    attitude?: string;
    other?: string;
  };
  fluids: {
    type?: string;
    rate?: string;
    additives?: string;
  };
  cri: {
    medications?: string;
    rates?: string;
  };
  ivc: {
    location?: string;
    status?: string;
  };
  procedures: string[];
  nursingCare: string[];
  diagnosticFindings?: string;
  concerns?: string;
}> {
  if (!anthropic) {
    console.warn('Anthropic API not available - cannot parse VetRadar data from screenshot');
    return {
      medications: [],
      vitals: {},
      physicalExam: {},
      fluids: {},
      cri: {},
      ivc: {},
      procedures: [],
      nursingCare: [],
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Use Sonnet 4.5 for best medical data extraction
      max_tokens: 2048, // Reduced from 4096 - comprehensive data but rarely exceeds 2000 tokens
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshotBase64,
              },
            },
            {
              type: 'text',
              text: `Analyze this VetRadar treatment sheet image and extract ALL clinical data for a veterinary rounding sheet.

CRITICAL INSTRUCTIONS:
- Read EVERY medication, dose, route, frequency from the treatment grid
- Extract ALL vital signs with timestamps (Temp, HR, RR, Pain scores)
- Capture physical exam findings (MM, CRT, attitude, etc.)
- Read fluid orders (type, rate, additives)
- Note any CRI medications with doses
- Identify IV catheter information
- Extract nursing care tasks and procedures
- Note any clinical concerns or alerts
- Capture patient demographics visible

Return ONLY a JSON object with this exact structure:

{
  "medications": [
    {
      "medication": "medication name",
      "dose": "dose amount",
      "route": "PO/IV/SQ/etc",
      "frequency": "q8h/BID/TID/etc"
    }
  ],
  "vitals": {
    "latestTemp": "most recent temp with unit",
    "latestHR": "most recent HR",
    "latestRR": "most recent RR",
    "painScore": "pain score if visible",
    "trends": "any notable trends like increasing HR, declining temp"
  },
  "physicalExam": {
    "mm": "mucous membrane color",
    "crt": "CRT in seconds",
    "attitude": "BAR/QAR/depressed/etc",
    "other": "any other PE findings"
  },
  "fluids": {
    "type": "LRS/Normosol/etc",
    "rate": "ml/hr or ml/kg/day",
    "additives": "KCl, etc if visible"
  },
  "cri": {
    "medications": "fentanyl, ketamine, etc with doses",
    "rates": "mcg/kg/hr or mcg/kg/min"
  },
  "ivc": {
    "location": "left cephalic, right saphenous, etc",
    "status": "patent, needs replacement, etc"
  },
  "procedures": ["list of scheduled procedures"],
  "nursingCare": ["list of nursing tasks"],
  "diagnosticFindings": "CRITICAL: Extract ALL diagnostic results visible including CBC, Chem, blood work, CXR, MRI, CT, ultrasound findings. Look for text like 'CBC: Within normal limits', 'Chem: WNL', 'MRI: disc extrusion', etc. This appears in clinical notes sections.",
  "concerns": "clinical concerns, monitoring needs, alerts"
}

CRITICAL FOR diagnosticFindings:
- Search the ENTIRE image for diagnostic results, especially in clinical notes/progress notes sections
- Look for phrases like: "CBC -", "Chem -", "CXR -", "MRI -", "CT -", "Diagnostics:", "Lab results:"
- Common formats: "CBC: Within normal limits", "CBC - WNL", "Chem: no significant abnormalities"
- Include imaging findings: "MRI: T12-T13 disc extrusion", "CXR: no evidence of metastatic disease"
- Combine all findings into a single string separated by newlines

Extract MAXIMUM data. If something is not visible in the image, use empty string "". Return ONLY the JSON, no other text.`
            }
          ]
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('No text response from Claude Vision');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);
    console.log(`[Vision API] Successfully parsed comprehensive VetRadar data from screenshot`);

    return {
      medications: parsed.medications || [],
      vitals: parsed.vitals || {},
      physicalExam: parsed.physicalExam || {},
      fluids: parsed.fluids || {},
      cri: parsed.cri || {},
      ivc: parsed.ivc || {},
      procedures: parsed.procedures || [],
      nursingCare: parsed.nursingCare || [],
      diagnosticFindings: parsed.diagnosticFindings || '',
      concerns: parsed.concerns || '',
    };
  } catch (error) {
    console.error('Error parsing VetRadar comprehensive data from screenshot:', error);
    return {
      medications: [],
      vitals: {},
      physicalExam: {},
      fluids: {},
      cri: {},
      ivc: {},
      procedures: [],
      nursingCare: [],
    };
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use parseVetRadarComprehensiveData instead
 */
export async function parseVetRadarMedicationsFromScreenshot(screenshotBase64: string): Promise<VetRadarMedication[]> {
  const data = await parseVetRadarComprehensiveData(screenshotBase64);
  return data.medications;
}
