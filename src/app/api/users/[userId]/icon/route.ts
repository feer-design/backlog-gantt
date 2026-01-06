import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const spaceKey = process.env.BACKLOG_SPACE_KEY;
  const apiKey = process.env.BACKLOG_API_KEY;
  const { userId } = await params;

  if (!spaceKey || !apiKey) {
    return NextResponse.json({ error: 'Missing API credentials' }, { status: 500 });
  }

  try {
    const url = `https://${spaceKey}.backlog.com/api/v2/users/${userId}/icon?apiKey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch icon' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error fetching user icon:', error);
    return NextResponse.json({ error: 'Failed to fetch icon' }, { status: 500 });
  }
}
