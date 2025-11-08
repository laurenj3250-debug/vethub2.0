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

Return this exact structure (use null for missing fields):
{
  "patientName": "pet name only, remove any 'Patient' prefix",
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

export async function analyzeBloodwork(bloodworkText: string, species: string = 'canine'): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Analyze this ${species} bloodwork and return ONLY a JSON array of abnormal findings.

Format: ["WBC 25.3 (H)", "BUN 85 (H)", ...]
Use (H) for high, (L) for low.

Bloodwork:
${bloodworkText}

Return ONLY the JSON array, no other text:`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    // Extract JSON from response
    let jsonText = content.text.trim();
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const result = JSON.parse(jsonText);
    return Array.isArray(result) ? result : result.abnormals || [];
  } catch (error) {
    console.error('Bloodwork analysis error:', error);
    return [];
  }
}
