import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectKey: string; issueKey: string }> }
) {
  const spaceKey = process.env.BACKLOG_SPACE_KEY;
  const apiKey = process.env.BACKLOG_API_KEY;
  const { issueKey } = await params;

  if (!spaceKey || !apiKey) {
    return NextResponse.json({ error: 'Missing API credentials' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const updateParams = new URLSearchParams();

    // 更新可能なフィールド
    if (body.statusId) updateParams.append('statusId', body.statusId.toString());
    if (body.assigneeId !== undefined) {
      if (body.assigneeId === null || body.assigneeId === '') {
        updateParams.append('assigneeId', '');
      } else {
        updateParams.append('assigneeId', body.assigneeId.toString());
      }
    }
    if (body.startDate) updateParams.append('startDate', body.startDate);
    if (body.dueDate) updateParams.append('dueDate', body.dueDate);

    const response = await fetch(
      `https://${spaceKey}.backlog.com/api/v2/issues/${issueKey}?apiKey=${apiKey}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: updateParams.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Backlog API Error:', error);
      return NextResponse.json({ error: 'Failed to update issue' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating issue:', error);
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
  }
}
