'use client';

import { useEffect, useRef, useState } from 'react';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isToday, startOfWeek, eachWeekOfInterval } from 'date-fns';
import { ja } from 'date-fns/locale';
import UserSelect from './UserSelect';
import StatusSelect from './StatusSelect';

interface Task {
  id: string;
  issueKey: string;
  name: string;
  description: string;
  start: Date | null;
  end: Date | null;
  status: string;
  statusId: number;
  statusColor: string;
  assignee: string | null;
  assigneeId: number | null;
  estimatedHours: number | null;
  issueType?: string;
  issueTypeId?: number;
  issueTypeColor?: string;
  category?: string[];
  milestone?: string[];
}

interface BacklogStatus {
  id: number;
  name: string;
  color: string;
}

interface BacklogUser {
  id: number;
  name: string;
}

interface BacklogIssueType {
  id: number;
  name: string;
  color: string;
}

interface BacklogCategory {
  id: number;
  name: string;
}

interface BacklogMilestone {
  id: number;
  name: string;
}

type GroupingType = 'none' | 'status' | 'assignee' | 'issueType' | 'milestone';

interface GanttChartProps {
  tasks: Task[];
  projectName: string;
  projectKey: string;
  onTaskUpdate?: (issueKey: string, updates: { statusId?: number; assigneeId?: number | null; startDate?: string; dueDate?: string }) => Promise<void>;
}

interface DragState {
  taskId: string;
  type: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  originalStart: Date;
  originalEnd: Date;
}

type ScaleType = 'day' | 'week' | 'month';

export default function GanttChart({ tasks, projectName, projectKey, onTaskUpdate }: GanttChartProps) {
  const [mounted, setMounted] = useState(false);
  const [viewStart, setViewStart] = useState<Date | null>(null);
  const [viewEnd, setViewEnd] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [scale, setScale] = useState<ScaleType>('day');
  const [showSettings, setShowSettings] = useState(false);
  const [showIssueKey, setShowIssueKey] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('');
  const [grouping, setGrouping] = useState<GroupingType>('none');
  const [projectStatuses, setProjectStatuses] = useState<BacklogStatus[]>([]);
  const [projectUsers, setProjectUsers] = useState<BacklogUser[]>([]);
  const [projectIssueTypes, setProjectIssueTypes] = useState<BacklogIssueType[]>([]);
  const [projectCategories, setProjectCategories] = useState<BacklogCategory[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<BacklogMilestone[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatusId, setEditStatusId] = useState<number | null>(null);
  const [editAssigneeId, setEditAssigneeId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [tempDates, setTempDates] = useState<{ [taskId: string]: { start: Date; end: Date } }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const dayWidth = scale === 'day' ? 28 : scale === 'week' ? 100 : 120;

  useEffect(() => {
    setViewStart(startOfMonth(new Date()));
    setViewEnd(endOfMonth(addDays(new Date(), 60)));
    setMounted(true);
  }, []);

  // Global mouse event handlers for drag
  useEffect(() => {
    if (!dragState) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragState || !viewStart) return;
      const deltaX = e.clientX - dragState.startX;
      const daysDelta = Math.round(deltaX / dayWidth);

      let newStart = dragState.originalStart;
      let newEnd = dragState.originalEnd;

      if (dragState.type === 'move') {
        newStart = addDays(dragState.originalStart, daysDelta);
        newEnd = addDays(dragState.originalEnd, daysDelta);
      } else if (dragState.type === 'resize-start') {
        newStart = addDays(dragState.originalStart, daysDelta);
        if (newStart > newEnd) newStart = newEnd;
      } else if (dragState.type === 'resize-end') {
        newEnd = addDays(dragState.originalEnd, daysDelta);
        if (newEnd < newStart) newEnd = newStart;
      }

      setTempDates(prev => ({
        ...prev,
        [dragState.taskId]: { start: newStart, end: newEnd }
      }));
    };

    const handleGlobalMouseUp = async () => {
      if (!dragState) return;

      const task = tasks.find(t => t.id === dragState.taskId);
      const temp = tempDates[dragState.taskId];

      if (task && temp && onTaskUpdate) {
        try {
          await onTaskUpdate(task.issueKey, {
            startDate: format(temp.start, 'yyyy-MM-dd'),
            dueDate: format(temp.end, 'yyyy-MM-dd'),
          });
        } catch (error) {
          console.error('Failed to update task dates:', error);
        }
      }

      setDragState(null);
      setTempDates({});
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragState, viewStart, dayWidth, tasks, tempDates, onTaskUpdate]);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const [statusesRes, usersRes, issueTypesRes, categoriesRes, milestonesRes] = await Promise.all([
          fetch(`/api/projects/${projectKey}/statuses`),
          fetch(`/api/projects/${projectKey}/users`),
          fetch(`/api/projects/${projectKey}/issueTypes`),
          fetch(`/api/projects/${projectKey}/categories`),
          fetch(`/api/projects/${projectKey}/milestones`)
        ]);
        if (statusesRes.ok) {
          const statuses = await statusesRes.json();
          setProjectStatuses(statuses);
        }
        if (usersRes.ok) {
          const users = await usersRes.json();
          setProjectUsers(users);
        }
        if (issueTypesRes.ok) {
          const issueTypes = await issueTypesRes.json();
          setProjectIssueTypes(issueTypes);
        }
        if (categoriesRes.ok) {
          const categories = await categoriesRes.json();
          setProjectCategories(categories);
        }
        if (milestonesRes.ok) {
          const milestones = await milestonesRes.json();
          setProjectMilestones(milestones);
        }
      } catch (error) {
        console.error('Failed to fetch project data:', error);
      }
    };
    if (projectKey) {
      fetchProjectData();
    }
  }, [projectKey]);

  const days = mounted && viewStart && viewEnd
    ? eachDayOfInterval({ start: viewStart, end: viewEnd })
    : [];

  const weeks = mounted && viewStart && viewEnd
    ? eachWeekOfInterval({ start: viewStart, end: viewEnd }, { weekStartsOn: 1 })
    : [];

  const getBarPosition = (start: Date | null, end: Date | null) => {
    if (!start || !viewStart || !viewEnd) return null;
    const taskStart = start < viewStart ? viewStart : start;
    const taskEnd = end ? (end > viewEnd ? viewEnd : end) : taskStart;

    if (scale === 'day') {
      const left = differenceInDays(taskStart, viewStart) * dayWidth;
      const width = Math.max((differenceInDays(taskEnd, taskStart) + 1) * dayWidth, dayWidth);
      return { left, width };
    } else if (scale === 'week') {
      const left = Math.floor(differenceInDays(taskStart, viewStart) / 7) * dayWidth;
      const width = Math.max(Math.ceil((differenceInDays(taskEnd, taskStart) + 1) / 7) * dayWidth, dayWidth);
      return { left, width };
    }
    return null;
  };

  const goToPrevMonth = () => {
    if (!viewStart || !viewEnd) return;
    setViewStart(addDays(viewStart, -30));
    setViewEnd(addDays(viewEnd, -30));
  };

  const goToNextMonth = () => {
    if (!viewStart || !viewEnd) return;
    setViewStart(addDays(viewStart, 30));
    setViewEnd(addDays(viewEnd, 30));
  };

  const goToToday = () => {
    setViewStart(startOfMonth(new Date()));
    setViewEnd(endOfMonth(addDays(new Date(), 60)));
  };

  // Get unique values for filters
  const statuses = [...new Set(tasks.map(t => t.status))];
  const assignees = [...new Set(tasks.filter(t => t.assignee).map(t => t.assignee!))];
  const issueTypes = [...new Set(tasks.filter(t => t.issueType).map(t => t.issueType!))];
  const categories = [...new Set(tasks.flatMap(t => t.category || []))];
  const milestones = [...new Set(tasks.flatMap(t => t.milestone || []))];

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (assigneeFilter && task.assignee !== assigneeFilter) return false;
    if (issueTypeFilter && task.issueType !== issueTypeFilter) return false;
    if (categoryFilter && !(task.category || []).includes(categoryFilter)) return false;
    if (milestoneFilter && !(task.milestone || []).includes(milestoneFilter)) return false;
    return true;
  });

  // Group tasks
  const groupedTasks = (() => {
    if (grouping === 'none') {
      return [{ key: '', label: '', tasks: filteredTasks }];
    }

    const groups: { key: string; label: string; tasks: Task[] }[] = [];
    const tasksByGroup = new Map<string, Task[]>();

    filteredTasks.forEach(task => {
      let groupKey = '';
      if (grouping === 'status') {
        groupKey = task.status || '未設定';
      } else if (grouping === 'assignee') {
        groupKey = task.assignee || '未設定';
      } else if (grouping === 'issueType') {
        groupKey = task.issueType || '未設定';
      } else if (grouping === 'milestone') {
        groupKey = (task.milestone || [])[0] || '未設定';
      }

      if (!tasksByGroup.has(groupKey)) {
        tasksByGroup.set(groupKey, []);
      }
      tasksByGroup.get(groupKey)!.push(task);
    });

    tasksByGroup.forEach((tasks, key) => {
      groups.push({ key, label: key, tasks });
    });

    return groups;
  })();

  // CSV Export function
  const exportToCSV = () => {
    const headers = ['課題キー', '件名', '状態', '担当者', '種別', '開始日', '期限日', '予定時間'];
    const rows = filteredTasks.map(task => [
      task.issueKey,
      task.name,
      task.status,
      task.assignee || '',
      task.issueType || '',
      task.start ? format(task.start, 'yyyy-MM-dd') : '',
      task.end ? format(task.end, 'yyyy-MM-dd') : '',
      task.estimatedHours?.toString() || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName}_gantt_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  // Print function
  const handlePrint = () => {
    setShowExportMenu(false);
    // Add print-specific class to body for better styling
    document.body.classList.add('printing-gantt');
    window.print();
    // Remove class after print dialog closes
    setTimeout(() => {
      document.body.classList.remove('printing-gantt');
    }, 100);
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent, task: Task, type: DragState['type']) => {
    if (!task.start || !task.end) return;
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      taskId: task.id,
      type,
      startX: e.clientX,
      originalStart: task.start,
      originalEnd: task.end,
    });
  };

  // Get task dates (use temp dates if dragging)
  const getTaskDates = (task: Task) => {
    if (tempDates[task.id]) {
      return { start: tempDates[task.id].start, end: tempDates[task.id].end };
    }
    return { start: task.start, end: task.end };
  };

  if (!mounted || !viewStart || !viewEnd) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#42b983] border-t-transparent mx-auto"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header - Backlog Style */}
        <div className="border-b bg-gray-50 p-4" data-print-hidden="true">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-gray-400">∧</span>
              ガントチャート
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 flex items-center gap-1"
              >
                <span>⚙</span> 表示設定
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                >
                  <span>⋯</span>
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <button
                      onClick={exportToCSV}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      CSV出力
                    </button>
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      印刷
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters - Row 1 */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <label className="text-gray-500 mr-2">種別</label>
              <select
                value={issueTypeFilter}
                onChange={(e) => setIssueTypeFilter(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-gray-700 bg-[#fffde7]"
              >
                <option value="">すべて</option>
                {issueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 mr-2">状態</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-gray-700 bg-[#fffde7]"
              >
                <option value="">すべて</option>
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 mr-2">カテゴリー</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-gray-700 bg-[#fffde7]"
              >
                <option value="">すべて</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 mr-2">マイルストーン</label>
              <select
                value={milestoneFilter}
                onChange={(e) => setMilestoneFilter(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-gray-700 bg-[#fffde7]"
              >
                <option value="">すべて</option>
                {milestones.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 mr-2">担当者</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-gray-700 bg-[#fffde7]"
              >
                <option value="">すべて</option>
                {assignees.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Navigation & Scale & Grouping */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-gray-500">開始日</label>
              <div className="flex items-center border border-gray-300 rounded">
                <input
                  type="date"
                  value={format(viewStart, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const newStart = new Date(e.target.value);
                    setViewStart(newStart);
                    setViewEnd(endOfMonth(addDays(newStart, 60)));
                  }}
                  className="px-2 py-1 text-gray-700 rounded"
                />
              </div>
              <button
                onClick={goToToday}
                className="px-3 py-1 bg-[#42b983] text-white rounded text-sm hover:bg-[#3aa876]"
              >
                今日
              </button>
              <button onClick={goToPrevMonth} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">
                ＜
              </button>
              <button onClick={goToNextMonth} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">
                ＞
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-500">スケール</label>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value as ScaleType)}
                className="border border-gray-300 rounded px-2 py-1 text-gray-700"
              >
                <option value="day">日</option>
                <option value="week">週</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-gray-500">グルーピング</label>
              <select
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as GroupingType)}
                className="border border-gray-300 rounded px-2 py-1 text-gray-700"
              >
                <option value="none">なし</option>
                <option value="status">状態</option>
                <option value="assignee">担当者</option>
                <option value="issueType">種別</option>
                <option value="milestone">マイルストーン</option>
              </select>
            </div>
            <div className="ml-auto text-gray-500">
              {filteredTasks.length} 件の課題
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="overflow-x-auto" ref={containerRef}>
          <div className="min-w-max flex">
            {/* Left Side - Task List */}
            <div className="sticky left-0 z-20 bg-white border-r shadow-sm">
              {/* Header */}
              <div className="flex border-b bg-gray-50">
                <div className="w-[280px] min-w-[280px] p-2 text-sm font-medium text-gray-700 border-r">
                  件名
                </div>
                <div className="w-[100px] min-w-[100px] p-2 text-sm font-medium text-gray-700 text-center border-r">
                  担当者
                </div>
                <div className="w-[100px] min-w-[100px] p-2 text-sm font-medium text-gray-700 text-center">
                  状態
                </div>
              </div>
              {/* Task Rows */}
              {filteredTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`flex border-b hover:bg-[#f0f9f4] ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <div
                    className="w-[280px] min-w-[280px] p-2 border-r cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <span className="text-gray-800 text-sm truncate block" title={task.name}>
                      {task.name}
                    </span>
                  </div>
                  <div className="w-[100px] min-w-[100px] p-1 text-center border-r">
                    <UserSelect
                      users={projectUsers}
                      value={task.assigneeId}
                      onChange={async (newAssigneeId) => {
                        if (onTaskUpdate) {
                          await onTaskUpdate(task.issueKey, { assigneeId: newAssigneeId });
                        }
                      }}
                    />
                  </div>
                  <div className="w-[100px] min-w-[100px] p-1 text-center">
                    <StatusSelect
                      statuses={projectStatuses}
                      value={task.statusId}
                      currentColor={task.statusColor}
                      onChange={async (statusId) => {
                        if (onTaskUpdate) {
                          await onTaskUpdate(task.issueKey, { statusId });
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Right Side - Gantt Bars */}
            <div className="flex-1">
              {/* Date Header */}
              <div className="flex border-b bg-gray-50">
                {scale === 'day' && days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`text-center text-xs border-r flex-shrink-0 ${
                      isWeekend(day) ? 'bg-[#fff5f5]' : 'bg-gray-50'
                    } ${isToday(day) ? 'bg-[#e8f5e9]' : ''}`}
                    style={{ width: dayWidth, minWidth: dayWidth }}
                  >
                    <div className="border-b py-1 font-medium text-gray-600">
                      {format(day, 'd')}
                    </div>
                    <div className={`py-1 ${isWeekend(day) ? 'text-red-400' : 'text-gray-400'}`}>
                      {format(day, 'E', { locale: ja })}
                    </div>
                  </div>
                ))}
                {scale === 'week' && weeks.map((week) => (
                  <div
                    key={week.toISOString()}
                    className="text-center text-xs border-r flex-shrink-0 bg-gray-50"
                    style={{ width: dayWidth, minWidth: dayWidth }}
                  >
                    <div className="border-b py-1 font-medium text-gray-600">
                      {format(week, 'M/d')}
                    </div>
                    <div className="py-1 text-gray-400">
                      週
                    </div>
                  </div>
                ))}
              </div>

              {/* Task Bars */}
              {filteredTasks.map((task, index) => {
                const { start, end } = getTaskDates(task);
                const barPos = getBarPosition(start, end);
                const isDragging = dragState?.taskId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`flex relative border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    style={{ height: 37 }}
                  >
                    {scale === 'day' && days.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={`border-r flex-shrink-0 ${isWeekend(day) ? 'bg-[#fff5f5]' : ''} ${isToday(day) ? 'bg-[#e8f5e9]' : ''}`}
                        style={{ width: dayWidth, minWidth: dayWidth }}
                      />
                    ))}
                    {scale === 'week' && weeks.map((week) => (
                      <div
                        key={week.toISOString()}
                        className="border-r flex-shrink-0"
                        style={{ width: dayWidth, minWidth: dayWidth }}
                      />
                    ))}
                    {barPos && (() => {
                      // Check if task is overdue (past due date and not completed)
                      const isOverdue = end &&
                        end < new Date() &&
                        task.status !== '完了' &&
                        task.status !== 'Closed' &&
                        task.status !== 'Done';

                      return (
                        <div
                          className="absolute top-2 flex items-center"
                          style={{ left: barPos.left }}
                        >
                          {/* Fire icon for overdue tasks */}
                          {isOverdue && (
                            <div className="absolute -left-5 top-0 text-sm" title="遅延中" style={{ filter: 'drop-shadow(0 0 2px orange)' }}>
                              🔥
                            </div>
                          )}
                          {/* Task Bar */}
                          <div
                            className={`h-5 rounded shadow-sm flex items-center cursor-move hover:opacity-90 ${isDragging ? 'opacity-70' : ''} ${isOverdue ? 'ring-2 ring-red-400' : ''}`}
                            style={{
                              width: barPos.width,
                              backgroundColor: isOverdue ? '#ef4444' : task.statusColor,
                            }}
                            onMouseDown={(e) => handleDragStart(e, task, 'move')}
                            onClick={(e) => {
                              if (!isDragging) {
                                e.stopPropagation();
                                setSelectedTask(task);
                              }
                            }}
                            title={`${task.name} (${task.estimatedHours || '-'}h)${isOverdue ? ' - 遅延中!' : ''}`}
                          >
                            {/* Resize handle - left */}
                            <div
                              className="absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-black/20 rounded-l"
                              onMouseDown={(e) => handleDragStart(e, task, 'resize-start')}
                            />
                            {/* Resize handle - right */}
                            <div
                              className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-black/20 rounded-r"
                              onMouseDown={(e) => handleDragStart(e, task, 'resize-end')}
                            />
                          </div>
                          {/* Label outside the bar */}
                          <div className="ml-2 flex items-center gap-1 whitespace-nowrap text-xs text-gray-700">
                            {showIssueKey && (
                              <span className="font-medium text-gray-500">{task.issueKey}</span>
                            )}
                            <span className="truncate max-w-[200px]">{task.name}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {filteredTasks.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  表示する課題がありません
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#42b983] text-white p-4 flex items-center justify-between">
              <h3 className="font-medium">検索結果の表示設定</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white/80 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {}}
                  className="w-4 h-4 accent-[#42b983]"
                />
                <span className="text-gray-700">親子関係を無視して表示</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showIssueKey}
                  onChange={(e) => setShowIssueKey(e.target.checked)}
                  className="w-4 h-4 accent-[#42b983]"
                />
                <span className="text-gray-700">課題キーを表示</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedTask(null);
            setIsEditing(false);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#42b983] text-white p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <a
                    href={`https://feer.backlog.com/view/${selectedTask.issueKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono hover:underline opacity-90"
                  >
                    {selectedTask.issueKey}
                  </a>
                  <h3 className="text-lg font-bold mt-1">{selectedTask.name}</h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setIsEditing(false);
                  }}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">状態</span>
                  <div className="mt-1">
                    {isEditing ? (
                      <select
                        value={editStatusId ?? selectedTask.statusId}
                        onChange={(e) => setEditStatusId(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-gray-700"
                      >
                        {projectStatuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="px-3 py-1 rounded text-sm text-white"
                        style={{ backgroundColor: selectedTask.statusColor }}
                      >
                        {selectedTask.status}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">担当者</span>
                  <div className="mt-1">
                    {isEditing ? (
                      <select
                        value={editAssigneeId ?? selectedTask.assigneeId ?? ''}
                        onChange={(e) => setEditAssigneeId(e.target.value === '' ? null : Number(e.target.value))}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-gray-700"
                      >
                        <option value="">未設定</option>
                        {projectUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-800">{selectedTask.assignee || '未設定'}</p>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">開始日</span>
                  <p className="mt-1 text-gray-800">
                    {selectedTask.start ? format(selectedTask.start, 'yyyy/MM/dd', { locale: ja }) : '未設定'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">期限日</span>
                  <p className="mt-1 text-gray-800">
                    {selectedTask.end ? format(selectedTask.end, 'yyyy/MM/dd', { locale: ja }) : '未設定'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">予定時間</span>
                  <p className="mt-1 text-gray-800">{selectedTask.estimatedHours ? `${selectedTask.estimatedHours}h` : '未設定'}</p>
                </div>
              </div>
              {selectedTask.description && (
                <div>
                  <span className="text-sm text-gray-500">詳細</span>
                  <div className="mt-1 p-3 bg-gray-50 rounded text-gray-800 whitespace-pre-wrap text-sm">
                    {selectedTask.description}
                  </div>
                </div>
              )}
              <div className="pt-4 border-t flex items-center gap-3">
                <a
                  href={`https://feer.backlog.com/view/${selectedTask.issueKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-[#42b983] text-white rounded hover:bg-[#3aa876] transition"
                >
                  Backlogで開く →
                </a>
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditStatusId(selectedTask.statusId);
                      setEditAssigneeId(selectedTask.assigneeId);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition"
                  >
                    編集
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        if (!onTaskUpdate) return;
                        setIsSaving(true);
                        try {
                          const updates: { statusId?: number; assigneeId?: number | null } = {};
                          if (editStatusId !== null && editStatusId !== selectedTask.statusId) {
                            updates.statusId = editStatusId;
                          }
                          if (editAssigneeId !== selectedTask.assigneeId) {
                            updates.assigneeId = editAssigneeId;
                          }
                          if (Object.keys(updates).length > 0) {
                            await onTaskUpdate(selectedTask.issueKey, updates);
                          }
                          setIsEditing(false);
                          setSelectedTask(null);
                        } catch (error) {
                          console.error('Failed to update task:', error);
                          alert('更新に失敗しました');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      {isSaving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditStatusId(null);
                        setEditAssigneeId(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition"
                    >
                      キャンセル
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
