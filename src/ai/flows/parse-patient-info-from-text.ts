'use server';

import { z } from 'zod';
import { openai } from '@/ai/openaiClient';
import { ai } from '@/ai/genkit';

const ParsePatientInfoFromTextInputSchema = z.object({
  text: z
    .string()
    .describe(
      'The patient details text to extract information from, e.g. from eVetPractice or Easy Vet.'
    ),
});
export type ParsePatientInfoFromTextInput = z.infer<
  typeof ParsePatientInfoFromTextInputSchema
>;

const ParsePatientInfoFromTextOutputSchema = z.object({
  patientInfo: z
    .object({
      patientId: z.string().describe('The patient ID.').optional(),
      clientId: z.string().describe('The client ID.').optional(),
      ownerName: z.string().describe('The owner name.').optional(),
      ownerPhone: z.string().describe('The owner phone number.').optional(),
      species: z.string().describe('The species of the patient.').optional(),
      breed: z.string().describe('The breed of the patient.').optional(),
      color: z.string().describe('The color of the patient.').optional(),
      sex: z.string().describe('The sex of the patient.').optional(),
      weight: z.string().describe('The weight of the patient.').optional(),
      dob: z.string().describe('The date of birth of the patient.').optional(),
      age: z.string().describe('The age of the patient.').optional(),
    })
    .describe('Extracted patient information.'),
  therapeutics: z
    .union([z.string(), z.array(z.string())])
    .optional(),
});
export type ParsePatientInfoFromTextOutput = z.infer<
  typeof ParsePatientInfoFromTextOutputSchema
>;

export async function parsePatientInfoFromText(
  input: ParsePatientInfoFromTextInput
): Promise<ParsePatientInfoFromTextOutput> {
  const system = `You are an expert veterinary assistant.
Return ONLY a JSON object that matches this schema:
{
  "patientInfo": {
    "patientId"?: string, "clientId"?: string, "ownerName"?: string, "ownerPhone"?: string,
    "species"?: string, "breed"?: string, "color"?: string, "sex"?: string,
    "weight"?: string, "dob"?: string, "age"?: string
  },
  "therapeutics"?: string | string[]
}
Rules:
- Output JSON only (no Markdown, no backticks).
- Extract only what is present. Do NOT invent values.
- "therapeutics" is meds/fluids/treatments; if multiple are present, combine them into a single string separated by newlines.`;

  const user = `Patient Details Text:\n${input.text}`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = resp.choices[0]?.message?.content ?? '';
  if (!raw) throw new Error('AI returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI returned non-JSON output.');
  }
  
  const validated = ParsePatientInfoFromTextOutputSchema.parse(parsed);

  // Normalize therapeutics to a single string
  if (Array.isArray(validated.therapeutics)) {
    return { ...validated, therapeutics: validated.therapeutics.join('\n') };
  }
  return validated;
}
