import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

// Debug: Log API key status (first 10 chars only for security)
if (typeof window !== 'undefined') {
  console.log('Anthropic API Key status:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Missing');
}

// Only initialize if API key is present
const anthropic = apiKey ? new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: true, // Only for development
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
    console.warn('Anthropic API not available - returning minimal patient data');
    // Return minimal data structure when API key is not configured
    return {
      patientName: '',
      ownerName: '',
      ownerPhone: '',
      species: '',
      breed: '',
      age: '',
      sex: '',
      weight: '',
      dateOfBirth: '',
      colorMarkings: '',
      patientId: '',
      clientId: '',
      problem: '',
      bloodwork: '',
      medications: [],
      plan: '',
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Use Sonnet for better accuracy with complex VetRadar exports
      max_tokens: 2048,
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
    throw error;
  }
}

export async function analyzeBloodwork(bloodworkText: string, species: string = 'canine'): Promise<string> {
  if (!anthropic) {
    console.error('Anthropic API key not configured');
    return '';
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `You are analyzing veterinary bloodwork. Your job is to identify and flag ALL abnormal values based on the EXACT reference ranges provided in the lab results.

CRITICAL INSTRUCTIONS:
1. The bloodwork data includes columns: Test, Results, Unit, Lowest Value, Highest Value
2. You must parse the "Lowest Value" and "Highest Value" for EACH test - these are the reference ranges
3. Compare the "Results" value to its specific reference range (Lowest Value to Highest Value)
4. Flag ONLY values that fall outside their specific provided reference range
5. Do NOT use generic reference ranges - use ONLY the ranges provided in the data

COMPARISON RULES:
- If Results < Lowest Value: Flag as (L) for LOW
- If Results > Highest Value: Flag as (H) for HIGH
- If Results is between Lowest Value and Highest Value: DO NOT FLAG (it's normal)
- Handle special formats like "< 0.1" (treat as very low value)
- Ignore tests with no reference range provided

FORMAT YOUR OUTPUT:
- For each abnormal value: "Test Name: Result Unit (H)" or "Test Name: Result Unit (L)"
- Example: "Platelets: 54 K/μL (L), MPV: 15.1 fL (H)"
- If nothing is abnormal: return "No abnormalities detected"
- Separate multiple abnormalities with commas

Bloodwork data:
${bloodworkText}

Analyze and return ONLY the abnormal values with (H) or (L) flags:`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return '';

    return content.text.trim();
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
      model: 'claude-3-haiku-20240307',
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
  if (!anthropic) {
    console.error('Anthropic API key not configured');
    return '';
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Format this medication list cleanly for a rounding sheet. One medication per line.

Medications:
${medText}

Return formatted list:`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return '';

    return content.text.trim();
  } catch (error) {
    console.error('Medication parsing error:', error);
    return '';
  }
}

export async function parseEzyVetBlock(fullText: string): Promise<any> {
  if (!anthropic) {
    console.warn('Anthropic API not available - returning empty EzyVet data');
    return {
      signalment: '',
      problems: '',
      diagnosticFindings: '',
      therapeutics: '',
      concerns: '',
      comments: '',
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Extract rounding sheet data from this EzyVet/Vet Radar export and return ONLY a JSON object.

Return this exact structure (use "" for missing fields):
{
  "signalment": "age sex species breed",
  "problems": "primary problem/diagnosis",
  "diagnosticFindings": "CBC/Chem abnormals only, imaging findings",
  "therapeutics": "current medications with doses",
  "concerns": "clinical concerns",
  "comments": "important care notes"
}

EzyVet Data:
${fullText}

Return ONLY the JSON object, no other text:`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response
    let jsonText = content.text.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    console.error('EzyVet parsing error:', error);
    throw error;
  }
}

export async function determineScanType(problemText: string): Promise<string> {
  if (!anthropic) {
    console.error('Anthropic API key not configured');
    return 'Unknown';
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 64,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Based on this veterinary presenting complaint, determine the MRI scan location needed. Return ONLY one of these options: Brain, C-Spine, T-Spine, LS, or Unknown.

Common mappings:
- Seizures, head tilt, circling, vestibular → Brain
- Neck pain, front leg weakness → C-Spine
- Back pain, hind limb weakness, IVDD, paralysis → LS (lumbar spine)
- Thoracic pain → T-Spine

Presenting complaint:
${problemText || 'Not specified'}

Return ONLY the scan location (Brain, C-Spine, T-Spine, LS, or Unknown):`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return 'Unknown';

    const scanType = content.text.trim();
    // Validate response
    const validTypes = ['Brain', 'C-Spine', 'T-Spine', 'LS', 'Unknown'];
    return validTypes.includes(scanType) ? scanType : 'Unknown';
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
      model: 'claude-opus-4-20250514', // Use Opus for best accuracy with medical text
      max_tokens: 4096,
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
      throw new Error('No text response from Claude Opus');
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
      console.warn('Opus returned non-array response, returning empty array');
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
