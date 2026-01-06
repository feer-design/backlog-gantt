// Backlog API Client
// Updated with getProjectStatuses method

export interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
  chartEnabled: boolean;
  archived: boolean;
}

export interface BacklogIssue {
  id: number;
  projectId: number;
  issueKey: string;
  keyId: number;
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
  priority: {
    id: number;
    name: string;
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
  actualHours: number | null;
  created: string;
  updated: string;
}

export interface BacklogUser {
  id: number;
  userId: string;
  name: string;
  roleType: number;
  mailAddress: string;
}

export interface BacklogStatus {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface BacklogIssueType {
  id: number;
  projectId: number;
  name: string;
  color: string;
  displayOrder: number;
}

export interface BacklogCategory {
  id: number;
  projectId: number;
  name: string;
  displayOrder: number;
}

export interface BacklogMilestone {
  id: number;
  projectId: number;
  name: string;
  description: string;
  startDate: string | null;
  releaseDueDate: string | null;
  archived: boolean;
  displayOrder: number;
}

class BacklogClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(spaceKey: string, apiKey: string) {
    this.baseUrl = `https://${spaceKey}.backlog.com/api/v2`;
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('apiKey', this.apiKey);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Backlog API Error: ${response.status}`);
    }
    return response.json();
  }

  async getProjects(): Promise<BacklogProject[]> {
    return this.fetch<BacklogProject[]>('/projects');
  }

  async getProject(projectIdOrKey: string | number): Promise<BacklogProject> {
    return this.fetch<BacklogProject>(`/projects/${projectIdOrKey}`);
  }

  async getIssues(projectId: number, options: { count?: number; offset?: number } = {}): Promise<BacklogIssue[]> {
    const params: Record<string, string> = {
      'projectId[]': projectId.toString(),
      count: (options.count || 100).toString(),
      offset: (options.offset || 0).toString(),
    };
    return this.fetch<BacklogIssue[]>('/issues', params);
  }

  async getProjectUsers(projectIdOrKey: string | number): Promise<BacklogUser[]> {
    return this.fetch<BacklogUser[]>(`/projects/${projectIdOrKey}/users`);
  }

  async getProjectStatuses(projectIdOrKey: string | number): Promise<BacklogStatus[]> {
    return this.fetch<BacklogStatus[]>(`/projects/${projectIdOrKey}/statuses`);
  }

  async getIssueTypes(projectIdOrKey: string | number): Promise<BacklogIssueType[]> {
    return this.fetch<BacklogIssueType[]>(`/projects/${projectIdOrKey}/issueTypes`);
  }

  async getCategories(projectIdOrKey: string | number): Promise<BacklogCategory[]> {
    return this.fetch<BacklogCategory[]>(`/projects/${projectIdOrKey}/categories`);
  }

  async getMilestones(projectIdOrKey: string | number): Promise<BacklogMilestone[]> {
    return this.fetch<BacklogMilestone[]>(`/projects/${projectIdOrKey}/versions`);
  }
}

export function createBacklogClient(spaceKey: string, apiKey: string): BacklogClient {
  return new BacklogClient(spaceKey, apiKey);
}

export default BacklogClient;
