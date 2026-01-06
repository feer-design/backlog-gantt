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
    const project = await client.getProject(projectKey);
    const issues = await client.getIssues(project.id, { count: 100 });
    return NextResponse.json(issues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
  }
}
