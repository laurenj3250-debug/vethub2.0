# VetCare Hub - AI Enhanced Veterinary App

This is a Next.js starter project for VetCare Hub, enhanced with AI capabilities through Google's Gemini models and Genkit.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## AI Setup (Gemini)

This project uses Google's Gemini for AI-powered parsing of patient records.

### 1. Get Your API Key

1.  Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Sign in with your Google account.
3.  Click "**Create API key**" to generate a new key.

### 2. Configure Your Environment

1.  Open the `.env.local` file in the root of your project.
2.  Add your Gemini API key to the file:
    ```
    GEMINI_API_KEY=YOUR_API_KEY_HERE
    ```
3.  Save the file and restart your Next.js development server for the changes to take effect.

That's it! The AI features in the application should now be enabled.
