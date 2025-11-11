import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;
    const currentDataStr = formData.get('currentData') as string;
    const currentData = currentDataStr ? JSON.parse(currentDataStr) : {};

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    // For now, use a simple approach: convert audio to base64 and use Claude
    // to process (Claude Sonnet 3.5 doesn't support audio, so we'll use a workaround)

    // Option 1: Use OpenAI Whisper for transcription
    // For this demo, let's use a placeholder transcription
    // In production, you'd integrate with Whisper API or similar

    let transcription = '';

    // Try to use OpenAI Whisper if API key is available
    const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

    if (openaiKey) {
      try {
        const whisperFormData = new FormData();
        whisperFormData.append('file', audioBlob, 'recording.webm');
        whisperFormData.append('model', 'whisper-1');

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: whisperFormData,
        });

        if (whisperResponse.ok) {
          const whisperData = await whisperResponse.json();
          transcription = whisperData.text;
        } else {
          console.error('Whisper API error:', await whisperResponse.text());
          throw new Error('Whisper transcription failed');
        }
      } catch (whisperError) {
        console.error('Whisper error:', whisperError);
        // Fall back to error message
        return NextResponse.json({
          error: 'Transcription failed. Please ensure OPENAI_API_KEY is set in your environment.'
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file for voice transcription.'
      }, { status: 500 });
    }

    // Now use Claude to intelligently extract SOAP fields from transcription
    const extractionPrompt = `You are a veterinary AI assistant helping to fill out a SOAP note based on voice dictation.

The user dictated the following: "${transcription}"

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

ONLY include fields that were mentioned in the dictation. Return a valid JSON object.`;

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
    }

    return NextResponse.json({
      transcription,
      extractedData,
    });

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: error.message },
      { status: 500 }
    );
  }
}
