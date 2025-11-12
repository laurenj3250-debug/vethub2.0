import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true, // Only for development
});

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
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `You are analyzing ${species} bloodwork. Your job is to identify and flag ALL abnormal values.

CRITICAL: You must flag values that are outside normal reference ranges for ${species}.

Standard ${species} reference ranges (approximate):
- WBC: 6-17 K/uL (canine), 5.5-19.5 K/uL (feline)
- RBC: 5.5-8.5 M/uL (canine), 5-10 M/uL (feline)
- HGB: 12-18 g/dL (canine), 8-15 g/dL (feline)
- HCT/PCV: 37-55% (canine), 24-45% (feline)
- PLT: 200-500 K/uL (canine), 300-800 K/uL (feline)
- BUN: 7-27 mg/dL (canine), 16-36 mg/dL (feline)
- CREA: 0.5-1.8 mg/dL (canine), 0.8-2.4 mg/dL (feline)
- ALT: 10-100 U/L (canine), 10-100 U/L (feline)
- ALP: 23-212 U/L (canine), 10-80 U/L (feline)
- TBIL: 0-0.9 mg/dL (canine), 0-0.4 mg/dL (feline)
- ALB: 2.3-4.0 g/dL (canine), 2.1-3.9 g/dL (feline)
- GLU: 70-143 mg/dL (canine), 71-159 mg/dL (feline)

Compare EVERY value in the bloodwork below to these ranges. Flag anything outside normal.

Format: "Parameter Value (H)" or "Parameter Value (L)"
Example: "WBC 25.3 (H), BUN 85 (H), ALT 245 (H), HCT 28% (L)"

Bloodwork data:
${bloodworkText}

Return ONLY the formatted abnormal values with (H) or (L) flags, separated by commas. If nothing is abnormal, return "No abnormalities detected".`
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
