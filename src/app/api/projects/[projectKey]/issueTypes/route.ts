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
    const issueTypes = await client.getIssueTypes(projectKey);
    return NextResponse.json(issueTypes);
  } catch (error) {
    console.error('Error fetching issue types:', error);
    return NextResponse.json({ error: 'Failed to fetch issue types' }, { status: 500 });
  }
}
