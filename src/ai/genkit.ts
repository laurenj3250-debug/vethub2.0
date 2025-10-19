import { ai } from '@genkit-ai/ai';
import { openAI } from 'genkitx-openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY');
}

ai.use(openAI({ apiKey: process.env.OPENAI_API_KEY }));

export { ai };
