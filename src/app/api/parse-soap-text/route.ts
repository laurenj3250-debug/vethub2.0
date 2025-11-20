import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { text, currentData } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Check if API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'AI parsing is not configured. Please set ANTHROPIC_API_KEY in your .env.local file.',
        details: 'Missing API key'
      }, { status: 503 });
    }

    // Use Claude to intelligently extract SOAP fields from text
    const extractionPrompt = `You are a veterinary AI assistant helping to fill out a SOAP note based on dictated/transcribed notes.

The user provided the following notes: "${text}"

Current SOAP data (for context):
${JSON.stringify(currentData, null, 2)}

Please extract relevant information and return ONLY a JSON object with the fields that should be updated. Use these exact field names:
- currentHistory, lastVisit, whyHereToday
- csvd (values: "none", "vomiting", "diarrhea", "both")
- pupd (values: "none", "PU", "PD", "PU/PD")
- appetite (values: "normal", "good", "decreased", "increased", "poor")
- painfulVocalizing (values: "None", "Mild", "Moderate", "Severe")
- mentalStatus (typically: "BAR", "QAR", "Dull", "Obtunded")
- gait (description like: "Ambulatory with moderate pelvic limb UMN paresis")
- cranialNerves (description)
- posturalReactions (description like: "delayed in pelvic limbs")
- spinalReflexes (description)
- tone, muscleMass, nociception
- neurolocalization (values: "T3-L3 myelopathy", "C1-C5 myelopathy", "C6-T2 myelopathy", "L4-S1 myelopathy", "Peripheral vestibular disease", "Prosencephalon", "Discospondylitis")
- ddx (differential diagnoses)
- diagnosticsToday, treatments, discussionChanges
- For Initial Consultation: diet, allergies, otherPets, otherMedicalHistory
- For Physical Exam: peENT, peOral, pePLN, peCV, peResp, peAbd, peRectal, peMS, peInteg

ONLY include fields that were mentioned in the notes. Return a valid JSON object with no additional text.`;

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      temperature: 0,
      messages: [{
        role: 'user',
        content: extractionPrompt,
      }],
    });

    const responseText = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : '';

    // Extract JSON from response (handle markdown code blocks)
    let extractedData = {};
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      console.error('Response was:', responseText);
    }

    return NextResponse.json({
      extractedData,
    });

  } catch (error: any) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Parsing failed', details: error.message },
      { status: 500 }
    );
  }
}
