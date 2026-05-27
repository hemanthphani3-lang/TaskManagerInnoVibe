"use client"

import React, { useState } from "react"
import { TaskStatusBadge } from "./TaskStatusBadge"
import { PriorityBadge } from "./PriorityBadge"
import { CreateTaskDialog } from "./CreateTaskDialog"
import { TaskDetailsModal } from "./TaskDetailsModal"
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
  const handleRefresh = async () => {
    // Simply reloading window or re-fetching via client component makes it robust
    window.location.reload()
  }

  // Parse task fields securely supporting both new/old formats
  const getTaskTitle = (t: Task) => t.title || t.task_title || "Untitled Task"
  const getTaskDescription = (t: Task) => t.description || t.task_description || ""
  const getTaskStatus = (t: Task) => t.status || t.task_status || "PENDING"
  const getTaskPriority = (t: Task) => t.priority || t.priority_level || "MEDIUM"

  const todayStr = new Date().toISOString().split('T')[0]

  // KPI Calculations
  const totalCount = tasks.length
  const assignedToMeCount = tasks.filter(t => t.assigned_to === currentUserId).length
  const assignedByMeCount = tasks.filter(t => t.created_by === currentUserId).length
  
  const pendingActionsCount = tasks.filter(t => {
    const status = getTaskStatus(t)
    return (status === 'PENDING' && t.assigned_to === currentUserId) || 
           (t.clarification_text && t.created_by === currentUserId && status === 'PENDING')
  }).length
  
  const overdueCount = tasks.filter(t => {
    const status = getTaskStatus(t)
    return status !== 'COMPLETED' && t.due_date < todayStr
  }).length

  const highPriorityCount = tasks.filter(t => {
    const p = getTaskPriority(t)
    return p === 'HIGH' || p === 'CRITICAL'
  }).length

  // Filter Pipeline
  const filteredTasks = tasks.filter(t => {
    const status = getTaskStatus(t)
    const priority = getTaskPriority(t)
    const desc = getTaskDescription(t)
    const title = getTaskTitle(t)

    // 1. Search Query Match
    const matchesSearch = 
      title.toLowerCase().includes(search.toLowerCase()) ||
      desc.toLowerCase().includes(search.toLowerCase()) ||
      t.department.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    // 2. Custom dropdown filters
    if (priorityFilter !== 'ALL' && priority !== priorityFilter) return false
    if (statusFilter !== 'ALL' && status !== statusFilter) return false
    if (categoryFilter !== 'ALL' && t.department !== categoryFilter) return false
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'ASSIGNED_TO_ME' && t.assigned_to !== currentUserId) return false
      if (roleFilter === 'ASSIGNED_BY_ME' && t.created_by !== currentUserId) return false
    }

    // 3. Tab restrictions
    if (activeTab === 'assigned_to_me' && t.assigned_to !== currentUserId) return false
    if (activeTab === 'assigned_by_me' && t.created_by !== currentUserId) return false
    if (activeTab === 'pending_actions') {
      const isPendingAction = (status === 'PENDING' && t.assigned_to === currentUserId) || 
                              (t.clarification_text && t.created_by === currentUserId && status === 'PENDING')
      if (!isPendingAction) return false
    }
    if (activeTab === 'overdue' && (status === 'COMPLETED' || t.due_date >= todayStr)) return false
    if (activeTab === 'completed' && status !== 'COMPLETED') return false
    if (activeTab === 'high_priority' && priority !== 'HIGH' && priority !== 'CRITICAL') return false

    return true
  })

  // Group upcoming timeline tasks (upcoming 5 due tasks)
  const timelineTasks = [...tasks]
    .filter(t => getTaskStatus(t) !== 'COMPLETED')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
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
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#0066FF] flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">For Me</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{assignedToMeCount}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Pending Act</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{pendingActionsCount}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Overdue</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{overdueCount}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm col-span-2 lg:col-span-1 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Critical</span>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">{highPriorityCount}</h4>
            </div>
          </div>

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
                { id: "completed", label: "Achievements", count: tasks.filter(t => getTaskStatus(t) === 'COMPLETED').length },
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-16 text-center shadow-sm">
                <ListTodo className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="text-slate-900 dark:text-white font-black">No tasks found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Either no tasks are assigned in this workspace segment, or search keywords do not yield any parameters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredTasks.map((t, idx) => {
                  const status = getTaskStatus(t)
                  const priority = getTaskPriority(t)
                  const isOverdue = status !== 'COMPLETED' && t.due_date < todayStr

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
                            {new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
                    const isOverdue = t.due_date < todayStr
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
                          {new Date(t.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick tips card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-xs space-y-3">
              <h5 className="font-extrabold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#0066FF]" />
                Cross-Role Guidelines
              </h5>
              <p className="text-slate-400 leading-relaxed">
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
