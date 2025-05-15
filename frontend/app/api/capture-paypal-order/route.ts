import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data || !data.orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
    }
    
    // Forward the request to the backend
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://fxalert.co.uk:5000';
    
    const response = await fetch(`${baseUrl}/payment/capture-paypal-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': request.headers.get('origin') || '',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal capture API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Error from payment service: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const captureData = await response.json();
    return NextResponse.json(captureData);
    
  } catch (error) {
    console.error('PayPal capture error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
} 