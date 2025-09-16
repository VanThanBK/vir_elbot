import { NextRequest, NextResponse } from 'next/server';

// This is a placeholder API route for serial communication
// In a production environment, you might want to implement server-side serial communication
// using Node.js serialport library for cases where Web Serial API is not available

export async function GET() {
  return NextResponse.json({
    message: 'Serial API endpoint',
    note: 'This application primarily uses Web Serial API for direct browser-to-device communication'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Here you could implement server-side serial communication
    // For now, we'll just return the received data
    console.log('Received joint states:', body);
    
    return NextResponse.json({
      success: true,
      message: 'Joint states received',
      data: body
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
