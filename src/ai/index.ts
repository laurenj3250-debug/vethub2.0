/**
 * @fileoverview This file initializes and configures the Genkit AI instance.
 * It sets up the Google AI plugin and exports a configured `ai` object for use throughout the application.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit with the Google AI plugin
export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
