import { NextRequest, NextResponse } from 'next/server';

// This API route is no longer used by the application but is kept for potential future use or reference.
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // This is a placeholder for a non-AI implementation or a future AI implementation.
    // The current app uses a local parser in /lib/parseSignalment.ts
    const dummyData = {
        name: "Parsing Inactive",
        signalment: "This API is not currently in use.",
        problem: "",
        lastRecheck: "",
        lastPlan: "",
        mriDate: "",
        mriFindings: "",
        bloodworkNeeded: "",
        medications: "",
        otherConcerns: "",
    };

    return NextResponse.json(dummyData);

  } catch (error) {
    console.error('Parse appointment error:', error);
    return NextResponse.json(
      { error: 'Failed to parse appointment' },
      { status: 500 }
    );
  }
}
