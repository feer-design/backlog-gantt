import { NextResponse } from 'next/server';
import { createBacklogClient } from '@/lib/backlog';

export async function GET() {
  const spaceKey = process.env.BACKLOG_SPACE_KEY;
  const apiKey = process.env.BACKLOG_API_KEY;

  if (!spaceKey || !apiKey) {
    return NextResponse.json({ error: 'Missing API credentials' }, { status: 500 });
  }

  try {
    const client = createBacklogClient(spaceKey, apiKey);
    const projects = await client.getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
