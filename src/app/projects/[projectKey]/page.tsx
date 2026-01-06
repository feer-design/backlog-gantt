'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import GanttChart from '@/components/GanttChart';

interface BacklogIssue {
  id: number;
  issueKey: string;
  summary: string;
  description: string;
  issueType: {
    id: number;
    name: string;
    color: string;
  };
  status: {
    id: number;
    name: string;
    color: string;
  };
  assignee: {
    id: number;
    name: string;
  } | null;
  category: {
    id: number;
    name: string;
  }[];
  milestone: {
    id: number;
    name: string;
  }[];
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
}

interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
}

export default function ProjectGanttPage() {
  const params = useParams();
  const projectKey = params.projectKey as string;
  const [issues, setIssues] = useState<BacklogIssue[]>([]);
  const [project, setProject] = useState<BacklogProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch project info
        const projectsRes = await fetch('/api/projects');
        const projects = await projectsRes.json();
        const currentProject = projects.find((p: BacklogProject) => p.projectKey === projectKey);
        setProject(currentProject);

        // Fetch issues
        const issuesRes = await fetch(`/api/projects/${projectKey}/issues`);
        if (!issuesRes.ok) throw new Error('Failed to fetch issues');
        const issuesData = await issuesRes.json();
        setIssues(issuesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectKey]);

  const tasks = issues.map((issue) => ({
    id: issue.id.toString(),
    issueKey: issue.issueKey,
    name: issue.summary,
    description: issue.description || '',
    start: issue.startDate ? new Date(issue.startDate) : (issue.dueDate ? new Date(issue.dueDate) : null),
    end: issue.dueDate ? new Date(issue.dueDate) : null,
    status: issue.status.name,
    statusId: issue.status.id,
    statusColor: issue.status.color,
    assignee: issue.assignee?.name || null,
    assigneeId: issue.assignee?.id || null,
    estimatedHours: issue.estimatedHours,
    issueType: issue.issueType?.name,
    issueTypeId: issue.issueType?.id,
    issueTypeColor: issue.issueType?.color,
    category: (issue.category || []).map(c => c.name),
    milestone: (issue.milestone || []).map(m => m.name),
  }));

  const handleTaskUpdate = async (issueKey: string, updates: { statusId?: number; assigneeId?: number | null; startDate?: string; dueDate?: string }) => {
    const response = await fetch(`/api/projects/${projectKey}/issues/${issueKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update issue');
    }

    // Refresh issues after update
    const issuesRes = await fetch(`/api/projects/${projectKey}/issues`);
    if (issuesRes.ok) {
      const issuesData = await issuesRes.json();
      setIssues(issuesData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/" className="text-orange-500 hover:underline">
            プロジェクト一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-orange-500 hover:text-orange-600">
              ← 戻る
            </Link>
            <h1 className="text-xl font-bold text-gray-800">
              {project?.name || projectKey} - ガントチャート
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <GanttChart
          tasks={tasks}
          projectName={project?.name || projectKey}
          projectKey={projectKey}
          onTaskUpdate={handleTaskUpdate}
        />
      </main>
    </div>
  );
}
