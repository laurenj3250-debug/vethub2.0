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
          content: `You are a veterinary medical record parser. Extract structured data from patient intake text.
Return ONLY valid JSON with these fields (use null for missing data):
{
  "patientName": "pet name (WITHOUT 'Patient' prefix)",
  "ownerName": "owner full name",
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
${blurb}`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const parsed = JSON.parse(content.text);
    return parsed;
  } catch (error) {
    console.error('AI parsing error:', error);
    throw error;
  }
}

export async function analyzeBloodwork(bloodworkText: string, species: string = 'canine'): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `You are a veterinary diagnostician. Analyze bloodwork and identify abnormal values for ${species}.
Return ONLY a JSON array of abnormal findings with their values: ["WBC 25.3 (H)", "BUN 85 (H)", ...]
Use (H) for high, (L) for low. Be concise.

Bloodwork:
${bloodworkText}`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    const result = JSON.parse(content.text);
    return Array.isArray(result) ? result : result.abnormals || [];
  } catch (error) {
    console.error('Bloodwork analysis error:', error);
    return [];
  }
}
