import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const headersList = headers();
  const origin = headersList.get('origin') || 'https://fxalert.co.uk:3000';
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing order ID' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Ensure PayPal environment variables are set
    if (!process.env.PAYPAL_API_URL || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal configuration is missing');
    }

    const response = await fetch(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('PayPal API error:', data);
      throw new Error(data.message || 'Failed to capture PayPal payment');
    }

    console.log('PayPal payment captured successfully:', orderId);
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  } catch (error) {
    console.error('PayPal capture error:', error);
    const headersList = headers();
    const origin = headersList.get('origin') || 'https://fxalert.co.uk:3000';
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture PayPal payment' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
} 