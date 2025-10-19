import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Initializes Genkit with the Google AI plugin.
 *
 * NOTE: When running this Genkit app, you must ensure the GEMINI_API_KEY
 * or GOOGLE_API_KEY environment variable is set.
 */
export const ai = genkit({
  // The plugins array registers the Google Gen AI capabilities.
  plugins: [
    googleAI()
  ],
  // Removed the 'model: "gemini-pro"' property.
  // The models (like gemini-pro, gemini-2.5-flash) are now accessed
  // directly within your flows using the model() function, e.g., model('gemini-pro').
});
