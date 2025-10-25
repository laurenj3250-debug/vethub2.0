'use server';
/**
 * @fileoverview Defines the AI flow for parsing appointment details from raw text.
 * This flow uses Genkit with a Google AI model to extract structured data.
 *
 * Exports:
 * - parseAppointment: The main function to call the AI flow.
 * - AppointmentDataSchema: The Zod schema for the input data.
 * - AppointmentParseOutputSchema: The Zod schema for the output data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';

export const AppointmentDataSchema = z.object({
  name: z.string().describe("Patient's name"),
  signalment: z.string().describe('Brief signalment (e.g., "8yr MN Labrador")'),
  problem: z.string().describe('Presenting problem or reason for visit'),
  lastRecheck: z.string().describe('Date of last recheck'),
  lastPlan: z.string().describe('Plan from last recheck'),
  mriDate: z.string().describe('Date of MRI if available'),
  mriFindings: z.string().describe('Findings from MRI if available'),
  medications: z.string().describe('Current medications, each on a new line'),
  otherConcerns: z.string().describe('Owner concerns or clinical signs'),
});

export type AppointmentData = z.infer<typeof AppointmentDataSchema>;

const model = 'gemini-1.5-flash-latest';

// Define the Genkit flow
const appointmentParserFlow = ai.defineFlow(
  {
    name: 'appointmentParserFlow',
    inputSchema: z.string(),
    outputSchema: AppointmentDataSchema,
  },
  async (text) => {
    const prompt = `You are an expert veterinary assistant. Extract the following appointment-specific information from this patient record and return it as JSON.

    Rules:
    - For 'name', extract only the patient's name.
    - For 'signalment', create a brief description (e.g., "8yr MN Labrador").
    - For 'medications', list each one as a single string, separated by newlines.
    - If a field is not found, use an empty string.
    - Only return the JSON object, no other text.

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
        schema: AppointmentDataSchema,
      },
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error('AI failed to generate valid output.');
    }
    return output;
  }
);

/**
 * Parses appointment details from text using the Genkit AI flow.
 * @param text The raw text from the patient record.
 * @returns A promise that resolves to the structured appointment data.
 */
export async function parseAppointment(text: string): Promise<AppointmentData> {
  return await appointmentParserFlow(text);
}
