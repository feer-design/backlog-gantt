import { NextResponse } from 'next/server';
import { createBacklogClient } from '@/lib/backlog';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectKey: string }> }
) {
  const spaceKey = process.env.BACKLOG_SPACE_KEY;
  const apiKey = process.env.BACKLOG_API_KEY;
  const { projectKey } = await params;

  if (!spaceKey || !apiKey) {
    return NextResponse.json({ error: 'Missing API credentials' }, { status: 500 });
  }

  try {
    const client = createBacklogClient(spaceKey, apiKey);
    const categories = await client.getCategories(projectKey);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
