import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data || !data.amount) {
      return NextResponse.json({ error: 'Missing amount parameter' }, { status: 400 });
    }
    
    // Forward the request to the backend
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://fxalert.co.uk:5000';
    
    const response = await fetch(`${baseUrl}/payment/create-paypal-order`, {
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
      console.error('PayPal API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Error from payment service: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const orderData = await response.json();
    return NextResponse.json(orderData);
    
  } catch (error) {
    console.error('PayPal order error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
} 