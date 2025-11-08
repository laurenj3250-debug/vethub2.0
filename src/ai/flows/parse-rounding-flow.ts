'use server';
/**
 * @fileoverview Defines the AI flow for parsing comprehensive rounding sheet data from raw text.
 * This flow uses Genkit with a Google AI model to extract structured data for patient and rounding info.
 *
 * Exports:
 * - parseRounding: The main function to call the AI flow.
 */

import { ai } from '@/ai';
import { z } from 'zod';

const PatientInfoSchema = z.object({
  species: z.string().describe('dog or cat'),
  breed: z.string().describe('breed name'),
  sex: z.string().describe('normalized sex (M, MN, F, FS)'),
  age: z.string().describe('age description'),
  dob: z.string().describe('date of birth if available'),
  weight: z.string().describe('weight with unit (e.g., 25.5 kg)'),
  color: z.string().describe('coat color'),
  patientId: z.string().describe('patient ID number'),
  clientId: z.string().describe('client ID number'),
  ownerName: z.string().describe("owner's name"),
  ownerPhone: z.string().describe("owner's phone number"),
});

const RoundingDataSchema = z.object({
  signalment: z.string().describe('brief signalment (age, sex, breed)'),
  problemList: z.string().describe('main problems/diagnoses'),
  subjectiveAssessment: z.string().describe('patient status, observations, concerns'),
  objectiveFindings: z.string().describe('physical exam findings, vitals'),
  diagnosticFindings: z.string().describe('lab results, imaging findings, abnormal values'),
  therapeutics: z.string().describe('current medications with doses and frequencies'),
  plan: z.string().describe('treatment plan and next steps'),
});

const RoundingParseOutputSchema = z.object({
  patientInfo: PatientInfoSchema,
  roundingData: RoundingDataSchema,
  medications: z.array(z.string()).describe('list of medications as separate strings'),
  bloodwork: z.string().describe('raw bloodwork section if present'),
});

type RoundingParseOutput = z.infer<typeof RoundingParseOutputSchema>;

const model = 'gemini-1.5-flash-latest';

// Define the Genkit flow for parsing rounding sheet data
const roundingParserFlow = ai.defineFlow(
  {
    name: 'roundingParserFlow',
    inputSchema: z.string(),
    outputSchema: RoundingParseOutputSchema,
  },
  async (text) => {
    const prompt = `You are a world-class veterinary assistant tasked with extracting comprehensive patient information for a rounding sheet. Analyze the provided patient record and return the data in a structured JSON format.

    Extraction Rules:
    - Sex Normalization: Standardize sex to 'M' (male intact), 'MN' (male neutered), 'F' (female intact), or 'FS' (female spayed).
    - Medications: Extract ALL medications with their full details (dose, route, frequency, e.g., "Gabapentin 100mg PO BID").
    - Bloodwork: If abnormal bloodwork values are mentioned, include indicators like ↑ or ↓.
    - Signalment: Create a brief, concise description suitable for rounding (e.g., "8yr MN Labrador").
    - Problem List: Summarize the main diagnoses or concerns into a concise list.
    - Empty Fields: If any piece of information cannot be found, use an empty string "" for string fields or an empty array [] for the medications list.
    - Output Format: You MUST only return a valid JSON object matching the requested schema. Do not include any other text, greetings, or explanations.

    Patient Record:
    ---
    ${text}
    ---
    `;

    const llmResponse = await ai.generate({
      prompt,
      model,
      config: {
        temperature: 0.1,
      },
      output: {
        format: 'json',
        schema: RoundingParseOutputSchema,
      },
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error('AI failed to generate valid rounding sheet output.');
    }
    return output;
  }
);

/**
 * Parses rounding sheet details from text using the Genkit AI flow.
 * @param text The raw text from the patient record.
 * @returns A promise that resolves to the structured rounding sheet data.
 */
export async function parseRounding(text: string): Promise<RoundingParseOutput> {
  return await roundingParserFlow(text);
}
