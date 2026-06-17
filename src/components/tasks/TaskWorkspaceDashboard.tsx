"use client"

import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from '@/lib/supabase/client';
import { useTaskCounts } from '@/context/TaskCountsContext';
import React, { useState, useEffect } from "react";

import { TaskStatusBadge } from "./TaskStatusBadge"
import { PriorityBadge } from "./PriorityBadge"
import { CreateTaskDialog } from "./CreateTaskDialog"
import { TaskDetailsModal } from "./TaskDetailsModal"
import { InteractiveCard } from "@/components/custom/InteractiveCard"
import { AnimatedCounter } from "@/components/custom/AnimatedCounter"
import { 
  ListTodo, 
  Calendar, 
  Search, 
  Plus, 
  User, 
  Layers, 
  ShieldAlert, 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  FileText,
  Clock,
  Filter,
  UserCheck
} from "lucide-react"

interface Task {
  id: string
  title: string
  task_title?: string
  description: string
  task_description?: string
  created_by: string
  created_by_role: string
  assigned_to: string
  assigned_to_role: string
  department: string
  priority: string
  priority_level?: string
  status: string
  task_status?: string
  due_date: string
  deadline?: string
  attachments?: any[]
  comments?: any[]
  created_at: string
  accepted_at?: string
  completed_at?: string
  clarification_text?: string
}

interface TaskWorkspaceDashboardProps {
  initialTasks: Task[]
  currentUserId: string
  currentUserRole: "ADMIN" | "DEPARTMENT" | "EMPLOYEE"
  currentUserDept?: string
}

export function TaskWorkspaceDashboard({
  initialTasks,
  currentUserId,
  currentUserRole,
  currentUserDept
}: TaskWorkspaceDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"assigned_to_me" | "assigned_by_me" | "pending_actions" | "overdue" | "completed" | "high_priority" | "all">("assigned_to_me")
  
  // Custom Filters State
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [categoryFilter, setCategoryFilter] = useState("ALL")

  // Modal Dialogs States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
  // Realtime refetch trigger simulation (re-syncs list)
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    
    if (tab) {
      setActiveTab(tab as any);
    }
    if (priority) {
      setPriorityFilter(priority.toUpperCase());
    }
    if (status) {
      setStatusFilter(status.toUpperCase());
    }
  }, [searchParams]);

  // Realtime task sync: listen for inserts, updates, deletes on tasks and task_assignees tables
  useEffect(() => {
    const channelName = `realtime_tasks_${currentUserId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, async (payload) => {
        const newTask = payload.new as any;
        // If the current user is the creator or the primary assignee, fetch detail and prepend
        if (newTask.created_by === currentUserId || newTask.assigned_to === currentUserId) {
          try {
            const res = await fetch(`/api/tasks/${newTask.id}/details`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.task) {
                setTasks((prev) => {
                  if (prev.some(t => t.id === newTask.id)) return prev;
                  const enrichedTask = {
                    ...data.task,
                    assignee_ids: data.task.collaborators?.map((c: any) => c.user_id) || []
                  };
                  return [enrichedTask, ...prev];
                });
              }
            }
          } catch (err) {
            console.error("Error fetching details for new task:", err);
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_assignees', filter: `user_id=eq.${currentUserId}` }, async (payload) => {
        const record = payload.new as any;
        if (record && record.task_id) {
          try {
            const res = await fetch(`/api/tasks/${record.task_id}/details`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.task) {
                setTasks((prev) => {
                  if (prev.some(t => t.id === record.task_id)) return prev;
                  const enrichedTask = {
                    ...data.task,
                    assignee_ids: data.task.collaborators?.map((c: any) => c.user_id) || []
                  };
                  return [enrichedTask, ...prev];
                });
              }
            }
          } catch (err) {
            console.error("Error fetching details for assigned task:", err);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
        const updated = payload.new as any;
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        const deleted = payload.old as any;
        setTasks((prev) => prev.filter((t) => t.id !== deleted.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, (payload) => {
        const record = (payload.new || payload.old) as any;
        if (record && record.task_id) {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setTasks((prev) => prev.map((t) => {
              if (t.id === record.task_id) {
                const existingAssignees = (t as any).task_assignees as any[] || [];
                const updatedAssignees = existingAssignees.some(a => a.id === record.id)
                  ? existingAssignees.map(a => a.id === record.id ? record : a)
                  : [...existingAssignees, record];
                const assigneeIds = updatedAssignees.map(a => a.user_id);
                let status = t.status;
                if (currentUserRole === 'EMPLOYEE' && record.user_id === currentUserId) {
                  status = record.status;
                }
                return {
                  ...t,
                  task_assignees: updatedAssignees,
                  assignee_ids: assigneeIds,
                  status: status,
                  task_status: status
                };
              }
              return t;
            }));
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => {
              // If the current user was deleted from the task collaborators, remove task from list
              if (record.user_id === currentUserId) {
                return prev.filter(t => t.id !== record.task_id);
              }
              return prev.map((t) => {
                if (t.id === record.task_id) {
                  const existingAssignees = (t as any).task_assignees as any[] || [];
                  const updatedAssignees = existingAssignees.filter(a => a.id !== record.id);
                  const assigneeIds = updatedAssignees.map(a => a.user_id);
                  return {
                    ...t,
                    task_assignees: updatedAssignees,
                    assignee_ids: assigneeIds
                  };
                }
                return t;
              });
            });
          }
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, currentUserRole]);

  // Optional manual refresh (kept for fallback)
  const handleRefresh = async () => {
    router.refresh();
  };

  // Parse task fields securely supporting both new/old formats
  const getTaskTitle = (t: Task) => t.title || t.task_title || "Untitled Task"
  const getTaskDescription = (t: Task) => t?.description || t?.task_description || "";
  const getTaskStatus = (t: Task) => t.status || t.task_status || "PENDING"
  const getTaskPriority = (t: Task) => t.priority || t.priority_level || "MEDIUM"

  const todayStr = new Date().toISOString().split('T')[0]

  // Use realtime task counts from TaskCountsContext for global metrics
  const { 
    total: dbTotalCount, 
    assignedToMe: dbAssignedToMeCount, 
    assignedByMe: dbAssignedByMeCount, 
    pending: dbPendingCount, 
    completed: dbCompletedCount,
  } = useTaskCounts();

  const safeTasks = tasks?.filter(Boolean) ?? [];

  // Local workspace counts calculated client-side for absolute reliability in tabs
  const assignedToMeCount = safeTasks.filter(t => (t as any).assignee_ids?.includes(currentUserId) || t.assigned_to === currentUserId).length;
  const assignedByMeCount = safeTasks.filter(t => t.created_by === currentUserId).length;
  const pendingActionsCount = safeTasks.filter(t => {
    const status = getTaskStatus(t);
    const isUserAssignee = (t as any).assignee_ids?.includes(currentUserId) || t.assigned_to === currentUserId;
    return (status === 'PENDING' && isUserAssignee) ||
           (t.clarification_text && t.created_by === currentUserId && status === 'PENDING');
  }).length;
  const overdueCount = safeTasks.filter(t => {
    const status = getTaskStatus(t);
    const tDueDate = t.deadline || t.due_date || "";
    return status !== 'COMPLETED' && tDueDate < todayStr;
  }).length;
  const completedCount = safeTasks.filter(t => getTaskStatus(t) === 'COMPLETED').length;
  const highPriorityCount = safeTasks.filter(t => {
    const priority = getTaskPriority(t);
    return priority === 'HIGH' || priority === 'CRITICAL';
  }).length;
  const totalCount = safeTasks.length;
  const filteredTasks = safeTasks.filter(t => {
    // Guard against null task objects
    if (!t) return false;
    const status = getTaskStatus(t);
    const priority = getTaskPriority(t);
    const desc = getTaskDescription(t);
    const title = getTaskTitle(t);
    const isUserAssignee = (t as any).assignee_ids?.includes(currentUserId) || t.assigned_to === currentUserId;
    
    // 1. Search Query Match
    const matchesSearch = 
      title.toLowerCase().includes(search.toLowerCase()) ||
      desc.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // 2. Custom dropdown filters
    if (priorityFilter !== 'ALL' && priority !== priorityFilter) return false;
    if (statusFilter !== 'ALL' && status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && t.department !== categoryFilter) return false;
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'ASSIGNED_TO_ME' && !isUserAssignee) return false;
      if (roleFilter === 'ASSIGNED_BY_ME' && t.created_by !== currentUserId) return false;
    }
    
    // 3. Tab restrictions
    if (activeTab === 'assigned_to_me' && !isUserAssignee) return false;
    if (activeTab === 'assigned_by_me' && t.created_by !== currentUserId) return false;
    if (activeTab === 'pending_actions') {
      const isPendingAction = (status === 'PENDING' && isUserAssignee) ||
                              (t.clarification_text && t.created_by === currentUserId && status === 'PENDING');
      if (!isPendingAction) return false;
    }
    const tDueDate = t.deadline || t.due_date || "";
    if (activeTab === 'overdue' && (status === 'COMPLETED' || tDueDate >= todayStr)) return false;
    if (activeTab === 'completed' && status !== 'COMPLETED') return false;
    if (activeTab === 'high_priority' && priority !== 'HIGH' && priority !== 'CRITICAL') return false;
    
    return true;
  });

  // Group upcoming timeline tasks (upcoming 5 due tasks)
  const timelineTasks = [...tasks]
    .filter(t => getTaskStatus(t) !== 'COMPLETED')
    .sort((a, b) => (a.deadline || a.due_date || "").localeCompare(b.deadline || b.due_date || ""))
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ListTodo className="w-8 h-8 text-[#0066FF]" />
              Workforce Task Hub
            </h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Collaborative enterprise work distribution and discussion portal.
            </p>
          </div>

          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-5 py-3 rounded-2xl font-bold transition-all shadow-md shadow-[#0066FF]/25 active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Create & Assign</span>
          </button>
        </div>

        {/* Metrics Grid Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          
          <InteractiveCard className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4 h-full">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#0066FF] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/glow:scale-110">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Tasks</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={dbTotalCount} />
              </h4>
            </div>
          </InteractiveCard>

          <InteractiveCard className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4 h-full">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/glow:scale-110">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Assigned To Me</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={dbAssignedToMeCount} />
              </h4>
            </div>
          </InteractiveCard>

          <InteractiveCard className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4 h-full">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/glow:scale-110">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Assigned By Me</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={dbAssignedByMeCount} />
              </h4>
            </div>
          </InteractiveCard>

          <InteractiveCard className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4 h-full">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/glow:scale-110">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Pending Tasks</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={dbPendingCount} />
              </h4>
            </div>
          </InteractiveCard>

          <InteractiveCard className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm col-span-2 lg:col-span-1 flex items-center gap-4 h-full">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/glow:scale-110">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Completed Tasks</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={dbCompletedCount} />
              </h4>
            </div>
          </InteractiveCard>

        </div>

        {/* Filters & Workspace Grid */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main workspace section */}
          <div className="flex-1 space-y-6">
            
            {/* Filter Search bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-4">
              
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search tasks by title, category, department..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0066FF]/40 outline-none transition"
                />
              </div>

              {/* Action dropdowns */}
              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 shrink-0">
                
                {/* Priority */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  <select 
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 outline-none transition font-semibold"
                  >
                    <option value="ALL">Priority (All)</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                {/* Status */}
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 outline-none transition font-semibold text-xs shrink-0"
                >
                  <option value="ALL">Status (All)</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="OVERDUE">Overdue</option>
                </select>

                {/* Category */}
                <select 
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 outline-none transition font-semibold text-xs shrink-0"
                >
                  <option value="ALL">Category (All)</option>
                  <option value="Operations">Operations</option>
                  <option value="Development">Development</option>
                  <option value="HR">HR</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="Sales">Sales</option>
                  <option value="Design">Design</option>
                  <option value="Other">Other</option>
                </select>

              </div>

            </div>

            {/* Segmented Section Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0.5 gap-2 text-sm">
              {[
                { id: "assigned_to_me", label: "Assigned To Me", count: assignedToMeCount },
                { id: "assigned_by_me", label: "Assigned By Me", count: assignedByMeCount },
                { id: "pending_actions", label: "Pending Actions", count: pendingActionsCount, alert: pendingActionsCount > 0 },
                { id: "overdue", label: "Overdue Timeline", count: overdueCount, alert: overdueCount > 0 },
                { id: "completed", label: "Achievements", count: completedCount },
                { id: "high_priority", label: "High Priority", count: highPriorityCount },
                { id: "all", label: "Global Scope", count: totalCount }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 select-none ${
                    activeTab === tab.id
                      ? 'border-[#0066FF] text-[#0066FF]'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-[#0066FF]'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                  {tab.alert && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Tasks Cards Grid layout */}
            {filteredTasks.length === 0 ? (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 rounded-3xl p-16 text-center shadow-sm max-w-xl mx-auto my-8 space-y-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-[#0066FF] rounded-2xl flex items-center justify-center mx-auto shadow-sm animate-bounce duration-1000">
                  <ListTodo className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-slate-900 dark:text-white font-extrabold text-lg">No tasks found in this view</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Either no tasks are assigned in this segment, or your search keywords and filter criteria did not yield any matches.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-[#0066FF] hover:text-[#0052CC] font-bold py-2 px-4 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition duration-200"
                  data-slot="button"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create a new task</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredTasks.map((t, idx) => {
                  const status = getTaskStatus(t)
                  const priority = getTaskPriority(t)
                  const dueDateVal = t.deadline || t.due_date || ""
                  const isOverdue = status !== 'COMPLETED' && dueDateVal < todayStr

                  return (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[#0066FF] hover:shadow-lg rounded-2xl p-5 shadow-sm transition duration-300 cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
                    >
                      <div className="space-y-3">
                        {/* Title and Category tag */}
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-[9px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {t.department}
                          </span>
                          <PriorityBadge priority={priority} />
                        </div>

                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                            {getTaskTitle(t)}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {getTaskDescription(t)}
                          </p>
                        </div>
                      </div>

                      {/* Info & badges footer */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 text-xs flex-wrap">
                        
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                          <span className={`font-semibold ${isOverdue ? 'text-red-500 font-extrabold' : ''}`}>
                            {dueDateVal ? new Date(dueDateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No due date'}
                          </span>
                        </div>

                        <TaskStatusBadge status={status} />

                      </div>

                    </div>
                  )
                })}
              </div>
            )}

          </div>

          {/* Right sidebar: timeline timeline preview */}
          <div className="w-full lg:w-[300px] shrink-0 space-y-6">
            
            {/* Timeline Task card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calendar className="w-5 h-5 text-[#0066FF]" />
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Task Timeline due</h4>
              </div>

              {timelineTasks.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold py-4 text-center">
                  No upcoming deadlines! All tasks finished.
                </p>
              ) : (
                <div className="space-y-4">
                   {timelineTasks.map(t => {
                    const dueDateVal = t.deadline || t.due_date || ""
                    const isOverdue = dueDateVal < todayStr
                    return (
                      <div 
                        key={t.id} 
                        onClick={() => setSelectedTaskId(t.id)}
                        className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-xl flex justify-between items-center gap-3 transition cursor-pointer hover:border-[#0066FF]/60"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate block">
                            {getTaskTitle(t)}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5 uppercase tracking-wide">
                            Assignee role: {t.assigned_to_role}
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded shrink-0 ${
                          isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#0066FF]'
                        }`}>
                          {dueDateVal ? new Date(dueDateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No due date'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick tips card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl text-xs space-y-3 shadow-sm">
              <h5 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#0066FF]" />
                Cross-Role Guidelines
              </h5>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                TMS Collaborative Hub supports fluid hierarchy delegation. Employees can assign tasks to Department managers or Admins, who in turn can accept or discuss deliverables in real-time.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Task Creation Dialog Overlay */}
      <CreateTaskDialog 
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleRefresh}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />

      {/* Task Inspection Drawer Modal */}
      {selectedTaskId && (
        <TaskDetailsModal 
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onActionSuccess={handleRefresh}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      )}

    </div>
  )
}
