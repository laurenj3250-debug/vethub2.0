'use server';

/**
 * @fileOverview Analyzes blood work results and returns ONLY the abnormal items,
 * formatted as "<NAME> <VALUE>" (no reference ranges in the output).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeBloodWorkInputSchema = z.object({
  bloodWorkText: z.string().describe('The blood work results as a text string.'),
});
export type AnalyzeBloodWorkInput = z.infer<typeof AnalyzeBloodWorkInputSchema>;

const AnalyzeBloodWorkOutputSchema = z.object({
  abnormalValues: z
    .array(z.string())
    .describe('Abnormal items as "<NAME> <VALUE>" only.'),
});
export type AnalyzeBloodWorkOutput = z.infer<
  typeof AnalyzeBloodWorkOutputSchema
>;

export async function analyzeBloodWork(
  input: AnalyzeBloodWorkInput
): Promise<AnalyzeBloodWorkOutput> {
  return analyzeBloodWorkFlow(input);
}

const analyzeBloodWorkFlow = ai.defineFlow(
  {
    name: 'analyzeBloodWorkFlow',
    inputSchema: AnalyzeBloodWorkInputSchema,
    outputSchema: AnalyzeBloodWorkOutputSchema,
  },
  async (input) => {
    const system = `You are a veterinary expert.
Return ONLY a JSON object matching this schema:
{
  "abnormalValues": string[]
}

Task:
1) Parse the provided blood work text.
2) Compare each value against these reference ranges (assume generic canine/feline lab ranges):
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

Output rules:
- Include ONLY the items that are outside range.
- Format each item EXACTLY as "<NAME> <VALUE>" (preserve original units if present, e.g., "K 3.3 mmol/L").
- Do NOT include words like "high"/"low".
- Do NOT include reference ranges or explanations.
- If none are abnormal, return: { "abnormalValues": [] }
- Output JSON only. No Markdown or backticks.`;

    const user = `Blood Work Results:
${input.bloodWorkText}`;

    const response = await ai.generate({
      model: 'gpt-4o',
      temperature: 0,
      prompt: `${system}\n\n${user}`,
      output: {
        format: 'json',
        schema: AnalyzeBloodWorkOutputSchema,
      },
    });

    const output = response.output;
    if (!output) {
      throw new Error('AI returned an empty response.');
    }
    
    return output as AnalyzeBloodWorkOutput;
  }
);
