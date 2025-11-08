import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Faster and cheaper
      messages: [
        {
          role: 'system',
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
}`
        },
        {
          role: 'user',
          content: blurb
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.error('AI parsing error:', error);
    throw error;
  }
}

export async function analyzeBloodwork(bloodworkText: string, species: string = 'canine'): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a veterinary diagnostician. Analyze bloodwork and identify abnormal values for ${species}.
Return ONLY a JSON array of abnormal findings with their values: ["WBC 25.3 (H)", "BUN 85 (H)", ...]
Use (H) for high, (L) for low. Be concise.`
        },
        {
          role: 'user',
          content: bloodworkText
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) return [];

    const result = JSON.parse(content);
    return result.abnormals || [];
  } catch (error) {
    console.error('Bloodwork analysis error:', error);
    return [];
  }
}
