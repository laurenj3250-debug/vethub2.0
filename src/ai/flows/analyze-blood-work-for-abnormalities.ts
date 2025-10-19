'use server';

/**
 * Analyze blood work and return ONLY abnormal items as "<NAME> <VALUE>".
 */

import { z } from 'zod';
import { openai } from '@/ai/openaiClient';
import { ai } from '@/ai/genkit'; 

const AnalyzeBloodWorkInputSchema = z.object({
  bloodWorkText: z.string().describe('The blood work results as a text string.'),
});
export type AnalyzeBloodWorkInput = z.infer<typeof AnalyzeBloodWorkInputSchema>;

const AnalyzeBloodWorkOutputSchema = z.object({
  abnormalValues: z.array(z.string()).describe('Abnormal items as "<NAME> <VALUE>" only.'),
});
export type AnalyzeBloodWorkOutput = z.infer<typeof AnalyzeBloodWorkOutputSchema>;

export async function analyzeBloodWork(
  input: AnalyzeBloodWorkInput
): Promise<AnalyzeBloodWorkOutput> {
    const system = `You are a veterinary expert.
Return ONLY a JSON object with this schema: { "abnormalValues": string[] }

Task:
1) Parse the provided blood work text.
2) Compare each value against these reference ranges (internal use only):
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
- Include ONLY items outside range.
- Format each item EXACTLY as "<NAME> <VALUE>" (preserve original units if provided).
- Do NOT include words like "high"/"low".
- Do NOT include reference ranges or extra text.
- If none are abnormal, return { "abnormalValues": [] }.
- Output JSON only.`;

    const user = `Blood Work Results:
${input.bloodWorkText}`;

    // Use OpenAI SDK directly (no Genkit OpenAI provider)
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

    const validated = AnalyzeBloodWorkOutputSchema.parse(parsed);
    return validated;
}
