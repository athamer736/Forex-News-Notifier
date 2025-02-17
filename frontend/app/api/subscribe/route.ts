import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, currencies, impactLevels } = await req.json();

    // Validate required fields
    if (!email || !currencies?.length || !impactLevels?.length) {
      return NextResponse.json(
        { message: 'Email, currencies, and impact levels are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Forward the request to the backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currencies,
        impactLevels,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to subscribe');
    }

    return NextResponse.json({
      message: 'Successfully subscribed! Please check your email for confirmation.',
      data
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to subscribe' },
      { status: 500 }
    );
  }
} 