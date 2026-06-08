import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { ListTodo, Calendar, PlayCircle, CheckCircle2, AlertOctagon } from "lucide-react"
import Link from "next/link"
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge"
import { PriorityBadge } from "@/components/tasks/PriorityBadge"

export default async function EmployeeTasksPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }
  if (!user) redirect('/login')

  // Fetch tasks assigned to this employee
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_employee_id', user.id)
    .order('due_date', { ascending: true })

  const pendingTasks = tasks?.filter(t => t.task_status === 'PENDING' || t.task_status === 'REOPENED') || []
  const inProgressTasks = tasks?.filter(t => t.task_status === 'IN_PROGRESS') || []
  const completedTasks = tasks?.filter(t => t.task_status === 'COMPLETED' || t.task_status === 'WAITING_APPROVAL') || []

  return (
    <div className="p-8">
      <PageHeader 
        title="My Tasks" 
        description="View and manage the tasks assigned to you."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">To Do</p>
            <h4 className="text-3xl font-black text-slate-900">{pendingTasks.length}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <ListTodo className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">In Progress</p>
            <h4 className="text-3xl font-black text-slate-900">{inProgressTasks.length}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
            <PlayCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Completed / Waiting</p>
            <h4 className="text-3xl font-black text-slate-900">{completedTasks.length}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Active Tasks */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-[#0066FF]" />
              Active Workspace
            </h3>
          </div>
          <div className="p-5 space-y-4 flex-1">
            {pendingTasks.length === 0 && inProgressTasks.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>You have no active tasks.</p>
              </div>
            )}
            
            {[...inProgressTasks, ...pendingTasks].map(task => (
              <Link key={task.id} href={`/employee/tasks/${task.id}`} className="block group">
                <div className="p-4 rounded-xl border border-slate-100 bg-white hover:border-[#0066FF] hover:shadow-md hover:shadow-[#0066FF]/5 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col gap-1 pr-4">
                      <h4 className="font-bold text-slate-900 group-hover:text-[#0066FF] transition-colors line-clamp-1">{task.task_title}</h4>
                      {task.is_escalated && (
                        <span className="inline-flex items-center gap-1 w-max text-[10px] uppercase font-bold tracking-wider text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 px-2 py-0.5 rounded">
                          <AlertOctagon className="w-3 h-3" />
                          Escalated
                        </span>
                      )}
                    </div>
                    <PriorityBadge priority={task.priority_level} />
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                    {task.task_description}
                  </p>
                  <div className="flex items-center justify-between">
                    <TaskStatusBadge status={task.task_status} />
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Recent Achievements
            </h3>
          </div>
          <div className="p-5 space-y-4 flex-1">
            {completedTasks.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>No completed tasks yet.</p>
              </div>
            )}
            
            {completedTasks.map(task => (
              <Link key={task.id} href={`/employee/tasks/${task.id}`} className="block group opacity-75 hover:opacity-100 transition-opacity">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/5 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-slate-900 line-clamp-1 pr-4">{task.task_title}</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <TaskStatusBadge status={task.task_status} />
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
