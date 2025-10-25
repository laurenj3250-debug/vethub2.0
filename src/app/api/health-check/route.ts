
import { NextRequest, NextResponse } from 'next/server';

interface HealthStatus {
  apiKeyFound: boolean;
  apiConnection: boolean;
  modelAvailable: boolean;
  status: 'OK' | 'ERROR';
  message: string;
  details?: string;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let status: HealthStatus = {
    apiKeyFound: false,
    apiConnection: false,
    modelAvailable: false,
    status: 'ERROR',
    message: 'Health check failed.',
  };

  // 1. Check for API Key
  if (!apiKey || !apiKey.trim()) {
    status.message = 'Anthropic API key is not configured.';
    return NextResponse.json(status, { status: 200 });
  }
  status.apiKeyFound = true;

  // 2. Test API Connection and Key Validity
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // Use the cheapest and fastest model for a simple health check
        model: 'claude-3-haiku-20240307', 
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        status.message = 'API connection failed. The API key might be invalid or expired.';
        status.details = errorData.error?.message || 'No specific error message provided by API.';
        return NextResponse.json(status, { status: 200 });
    }
    status.apiConnection = true;
    
    // We can assume the model is available if the call succeeds, but this is a simplified check
    status.modelAvailable = true; 
    status.status = 'OK';
    status.message = 'All systems operational. AI parsing is ready.';

    return NextResponse.json(status, { status: 200 });

  } catch (error: any) {
    console.error('Health check network error:', error);
    status.message = 'A network error occurred while trying to connect to the Anthropic API.';
    status.details = error.message;
    return NextResponse.json(status, { status: 200 });
  }
}
