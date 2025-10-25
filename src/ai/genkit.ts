'use server';
/**
 * @fileoverview This file initializes and configures the Genkit AI instance.
 * It sets up the Google AI plugin and exports a configured `ai` object for use throughout the application.
 * It also defines a helper function to check the health of the AI service.
 */

import { genkit, type GenkitError } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { googleGenai } from '@genkit-ai/google-genai';

// Initialize Genkit with the Google AI plugin
export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
    googleGenai({
        // Other Google GenAI plugin configuration
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export interface AIHealthStatus {
  apiKeyFound: boolean;
  apiConnection: boolean;
  status: 'OK' | 'ERROR';
  message: string;
  details?: string;
}

/**
 * Checks the health of the AI service by verifying the API key and making a test call.
 * @returns {Promise<AIHealthStatus>} The health status of the AI service.
 */
export async function checkAIHealth(): Promise<AIHealthStatus> {
  const apiKey = process.env.GEMINI_API_KEY;

  let status: AIHealthStatus = {
    apiKeyFound: false,
    apiConnection: false,
    status: 'ERROR',
    message: 'Health check failed.',
  };

  // 1. Check for API Key
  if (!apiKey || !apiKey.trim()) {
    status.message = 'Gemini API key is not configured in .env.local';
    return status;
  }
  status.apiKeyFound = true;

  // 2. Test API Connection by making a simple generation call
  try {
    const model = 'gemini-1.5-flash-latest';
    await ai.generate({
      model,
      prompt: 'Hello',
      config: {
        maxOutputTokens: 2,
      },
    });

    status.apiConnection = true;
    status.status = 'OK';
    status.message = 'All systems operational. AI parsing is ready.';
  } catch (error: any) {
    const err = error as GenkitError;
    status.message = 'API connection failed. The API key might be invalid or expired.';
    status.details = err.message || 'No specific error message provided by API.';
    if (err.cause) {
        status.details += ` | Cause: ${err.cause}`;
    }
  }

  return status;
}
