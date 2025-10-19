import { config } from 'dotenv';
config();

import '@/ai/flows/parse-patient-info-from-text.ts';
import '@/ai/flows/analyze-blood-work-for-abnormalities.ts';