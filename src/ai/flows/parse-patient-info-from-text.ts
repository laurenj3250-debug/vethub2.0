'use server';

/**
 * @fileOverview An AI agent for parsing patient information from text.
 *
 * - parsePatientInfoFromText - A function that handles the parsing of patient information.
 * - ParsePatientInfoFromTextInput - The input type for the parsePatientInfoFromText function.
 * - ParsePatientInfoFromTextOutput - The return type for the parsePatientInfoFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit'; // Removed 'generate' from this import
import {googleAI} from '@genkit-ai/google-genai';

const ParsePatientInfoFromTextInputSchema = z.object({
  text: z
    .string()
    .describe("The patient details text to extract information from, e.g. from eVetPractice or Easy Vet."),
});
export type ParsePatientInfoFromTextInput = z.infer<typeof ParsePatientInfoFromTextInputSchema>;

const ParsePatientInfoFromTextOutputSchema = z.object({
  patientInfo: z.object({
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
  }).describe('Extracted patient information.'),
  therapeutics: z.string().describe('Extracted therapeutics information.').optional(),
});
export type ParsePatientInfoFromTextOutput = z.infer<typeof ParsePatientInfoFromTextOutputSchema>;

export async function parsePatientInfoFromText(input: ParsePatientInfoFromTextInput): Promise<ParsePatientInfoFromTextOutput> {
  return parsePatientInfoFromTextFlow(input);
}

const prompt = `You are an expert veterinary assistant. You will be provided with patient details in a raw text format. 
Your goal is to extract structured information from this text. Look for key-value pairs (like "Patient ID: 12345") to identify the following fields if they are present:
- Patient ID
- Client ID
- Owner Name
- Owner Phone
- Species
- Breed
- Color
- Sex
- Weight
- DOB
- Age

Additionally, extract any lines that appear to be medications, fluids, or other treatments under the "therapeutics" field. Combine these into a single string, with each item on a new line.

Return the extracted information in JSON format. If a piece of information is not found, leave it blank. Focus primarily on the patient info and therapeutics fields.

Patient Details Text: {{{text}}}`; // The '{{{text}}}' template key corresponds to the 'text' property in the input object.

const parsePatientInfoFromTextFlow = ai.defineFlow(
  {
    name: 'parsePatientInfoFromTextFlow',
    inputSchema: ParsePatientInfoFromTextInputSchema,
    outputSchema: ParsePatientInfoFromTextOutputSchema,
  },
  async input => {
    // Use ai.generate() to resolve the module import issue and 
    // Use the stable 'gemini-2.5-flash' model.
    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      
      // Pass the prompt template string and the input object (context) separately.
      prompt: prompt,
      context: input,

      output: {
        format: 'json',
        schema: ParsePatientInfoFromTextOutputSchema,
      },
    });
    
    // Reverting to the standard Genkit function call for structured output: response.output().
    const output = response.output();
    if (!output) {
      throw new Error("AI returned an empty response.");
    }
    // The output is already parsed and validated against ParsePatientInfoFromTextOutputSchema
    return output as ParsePatientInfoFromTextOutput;
  }
);
