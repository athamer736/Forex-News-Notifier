import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

// Check if STRIPE_SECRET_KEY is defined
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
  timeout: 30000, // 30 second timeout
});

export async function OPTIONS() {
  const headersList = headers();
  const origin = headersList.get('origin') || 'https://fxalert.co.uk:3000';
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data || !data.amount) {
      return NextResponse.json({ error: 'Missing amount parameter' }, { status: 400 });
    }
    
    // Forward the request to the backend
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://fxalert.co.uk:5000';
    
    const response = await fetch(`${baseUrl}/payment/create-stripe-session`, {
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
      console.error('Stripe API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Error from payment service: ${response.status}` }, 
        { status: response.status }
      );
    }
    
    const sessionData = await response.json();
    return NextResponse.json(sessionData);
    
  } catch (error) {
    console.error('Stripe session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
} 