import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

// Only initialize if API key is present
const anthropic = apiKey ? new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: true, // Only for development
}) : null;

export interface ParsedPatientData {
  patientName: string;
  ownerName: string;
  ownerPhone?: string;
  species?: string;
  breed?: string;
  age?: string;
  sex?: string;
  weight?: string;
  patientId?: string;
  clientId?: string;
  problem?: string;
  bloodwork?: string;
  medications?: string[];
  plan?: string;
}

export async function parsePatientBlurb(blurb: string): Promise<ParsedPatientData> {
  if (!anthropic) {
    throw new Error('Anthropic API key not configured. Add NEXT_PUBLIC_ANTHROPIC_API_KEY to .env.local');
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Fast and cheap
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Extract structured data from this veterinary patient text and return ONLY a JSON object with no other text or explanation.

IMPORTANT: For ownerName, extract the owner's LAST NAME only (surname/family name). If you see "John Smith" extract "Smith". If you only see a first name, use null.

Return this exact structure (use null for missing fields):
{
  "patientName": "pet name only, remove any 'Patient' prefix",
  "ownerName": "owner LAST NAME only (surname)",
  "ownerPhone": "phone number",
  "species": "dog/cat/etc",
  "breed": "breed",
  "age": "age with units",
  "sex": "MN/FS/etc",
  "weight": "weight with units",
  "patientId": "patient ID number",
  "clientId": "client ID number",
  "problem": "presenting complaint",
  "bloodwork": "CBC/Chemistry values",
  "medications": ["list", "of", "meds"],
  "plan": "treatment plan"
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
    throw new Error('Anthropic API key not configured. Add NEXT_PUBLIC_ANTHROPIC_API_KEY to .env.local');
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
