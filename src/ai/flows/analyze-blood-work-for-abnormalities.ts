'use server';

/**
 * @fileOverview Analyzes blood work results to identify and flag abnormal values.
 *
 * - analyzeBloodWork - A function that analyzes blood work results and returns a list of abnormal values.
 * - AnalyzeBloodWorkInput - The input type for the analyzeBloodWork function.
 * - AnalyzeBloodWorkOutput - The return type for the analyzeBloodWork function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const AnalyzeBloodWorkInputSchema = z.object({
  bloodWorkText: z
    .string()
    .describe('The blood work results as a text string.'),
});
export type AnalyzeBloodWorkInput = z.infer<typeof AnalyzeBloodWorkInputSchema>;

const AnalyzeBloodWorkOutputSchema = z.object({
  abnormalValues: z.array(z.string()).describe('A list of abnormal blood work values.'),
});
export type AnalyzeBloodWorkOutput = z.infer<typeof AnalyzeBloodWorkOutputSchema>;

export async function analyzeBloodWork(input: AnalyzeBloodWorkInput): Promise<AnalyzeBloodWorkOutput> {
  return analyzeBloodWorkFlow(input);
}

const prompt = `You are a veterinary expert. You will analyze the provided blood work results and identify any abnormal values based on the following ranges:

WBC: 6-17
RBC: 5.5-8.5
HGB: 12-18
HCT: 37-55
PLT: 200-500
NEUT: 3-12
LYMPH: 1-5
MONO: 0.2-1.5
EOS: 0-1
BUN: 7-27
CREAT: 0.5-1.8
GLU: 70-143
ALT: 10-125
AST: 0-50
ALP: 23-212
TBIL: 0-0.9
ALB: 2.3-4.0
TP: 5.2-8.2
CA: 9-11.3
PHOS: 2.5-6.8
NA: 144-160
K: 3.5-5.8
CL: 109-122

Identify any values that fall outside of these ranges and return them in a list.

Blood Work Results:
{{{bloodWorkText}}}
`;

const analyzeBloodWorkFlow = ai.defineFlow(
  {
    name: 'analyzeBloodWorkFlow',
    inputSchema: AnalyzeBloodWorkInputSchema,
    outputSchema: AnalyzeBloodWorkOutputSchema,
  },
  async input => {
    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      
      prompt: prompt,
      context: input,
      
      output: {
        format: 'json',
        schema: AnalyzeBloodWorkOutputSchema,
      },
    });
    
    const output = response.output(); 
    if (!output) {
      throw new Error("AI returned an empty response.");
    }
    return output as AnalyzeBloodWorkOutput;
  }
);
