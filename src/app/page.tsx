'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
  archived: boolean;
}

export default function Home() {
  const [projects, setProjects] = useState<BacklogProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        setProjects(data.filter((p: BacklogProject) => !p.archived));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Backlog ガントチャート</h1>
          <p className="text-orange-100 mt-1">プロジェクトを選択してガントチャートを表示</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.projectKey}`}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group"
            >
              <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 group-hover:from-orange-600 group-hover:to-orange-500 transition-colors"></div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-orange-100 text-orange-600 text-xs font-mono px-2 py-1 rounded">
                    {project.projectKey}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800 group-hover:text-orange-500 transition-colors">
                  {project.name}
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  クリックしてガントチャートを表示 →
                </p>
              </div>
            </Link>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">プロジェクトがありません</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 text-sm">
        Backlog Gantt Chart Viewer
      </footer>
    </div>
  );
}
