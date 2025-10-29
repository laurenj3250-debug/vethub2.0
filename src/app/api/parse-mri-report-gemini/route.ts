
import { NextResponse } from 'next/server';
import { parseRoundingNotes } from '@/ai/flows/parse-rounding-flow';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const parsedData = await parseRoundingNotes(text);

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
