'use server';
import { genkit, Ai } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

let aiInstance: Ai;

function getAi(): Ai {
  if (!aiInstance) {
    aiInstance = genkit({
      plugins: [
        googleAI(),
      ],
      logLevel: 'debug',
      enableTracingAndMetrics: true,
    });
  }
  return aiInstance;
}

export const ai = getAi();
