'use server';
/**
 * @fileOverview An AI flow to parse unstructured veterinary patient records into a structured format.
 *
 * - parsePatientRecord - The main function to call the flow.
 * - PatientRecordInput - The Zod schema for the input text.
 * - PatientRecordOutput - The Zod schema for the structured output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input schema: just a single string of text
export const PatientRecordInputSchema = z.object({
  recordText: z.string().describe('The unstructured text from a patient record.'),
});
export type PatientRecordInput = z.infer<typeof PatientRecordInputSchema>;

// Output schema: The structured data we want the AI to extract
export const PatientRecordOutputSchema = z.object({
  patientName: z.string().optional().describe("The patient's name (e.g., 'Obie Jay')."),
  signalment: z.string().optional().describe("The patient's signalment (e.g., '7 year old MN French Bulldog')."),
  problem: z.string().optional().describe('The primary presenting problem or reason for the visit.'),
  mriDate: z.string().optional().describe('The date of the MRI, if mentioned (format as MM/DD/YY).'),
  mriFindings: z.string().optional().describe('The findings from the MRI, if mentioned.'),
  lastRecheckDate: z.string().optional().describe('The date of the last recheck or visit (format as MM/DD/YY).'),
  lastRecheckPlan: z.string().optional().describe('The plan from the last recheck or visit.'),
  medications: z.array(z.string()).optional().describe('A list of current medications.'),
  otherConcerns: z.string().optional().describe("Any other owner concerns or clinical signs noted."),
});
export type PatientRecordOutput = z.infer<typeof PatientRecordOutputSchema>;


// The exported wrapper function that calls the Genkit flow
export async function parsePatientRecord(input: PatientRecordInput): Promise<PatientRecordOutput> {
  return parsePatientRecordFlow(input);
}


// Define the prompt for the AI
const prompt = ai.definePrompt({
  name: 'parsePatientRecordPrompt',
  input: { schema: PatientRecordInputSchema },
  output: { schema: PatientRecordOutputSchema },
  prompt: `You are an expert at parsing veterinary medical records.
Analyze the following patient record text and extract the required information in the specified JSON format.
Be precise. If a field is not present in the text, omit it from the output.

- Extract the patient's name and full signalment.
- Find the "Presenting Problem" and summarize it.
- Locate any MRI results, including the date and findings.
- Find the last recheck or visit date and the plan associated with it.
- List all "Current Medications".
- Summarize any "Owner Concerns".

Patient Record Text:
'''
{{{recordText}}}
'''
`,
});

// Define the Genkit flow
const parsePatientRecordFlow = ai.defineFlow(
  {
    name: 'parsePatientRecordFlow',
    inputSchema: PatientRecordInputSchema,
    outputSchema: PatientRecordOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
