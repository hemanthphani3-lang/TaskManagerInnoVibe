import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { Plus, ListTodo } from "lucide-react"
import Link from "next/link"
import { TasksTable, type Task } from "./TasksTable"

export default async function DepartmentTasksPage() {
  const supabase = await createClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (_e) {}

  if (!user) redirect('/login')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, is_escalated, employees!assigned_employee_id(employee_name, profile_photo)')
    .eq('department_id', user!.id)
    .order('created_at', { ascending: false })

  const pendingCount = tasks?.filter(t => t.task_status !== 'COMPLETED').length || 0
  const completedCount = tasks?.filter(t => t.task_status === 'COMPLETED').length || 0
  const approvalCount = tasks?.filter(t => t.task_status === 'WAITING_APPROVAL').length || 0

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Task Management"
          description="Assign, track, and manage employee tasks across your department."
          action={
            <Link
              href="/department/tasks/create"
              className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-[#0066FF]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </Link>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#0066FF] transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Tasks</p>
              <h4 className="text-3xl font-black text-slate-900">{pendingCount}</h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center group-hover:scale-110 transition-transform">
              <ListTodo className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-500 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Completed</p>
              <h4 className="text-3xl font-black text-slate-900">{completedCount}</h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ListTodo className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-purple-500 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending Approval</p>
              <h4 className="text-3xl font-black text-slate-900">{approvalCount}</h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform relative">
              {approvalCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </span>
              )}
              <ListTodo className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Fully interactive tasks table — clickable rows + live search */}
        {(() => {
          const formattedTasks: Task[] = (tasks || []).map(t => {
            const rawEmp = t.employees;
            const emp = Array.isArray(rawEmp) ? rawEmp[0] : rawEmp;
            return {
              id: t.id,
              task_title: t.task_title,
              task_description: t.task_description || "",
              task_status: t.task_status || "PENDING",
              priority_level: t.priority_level || "MEDIUM",
              due_date: t.due_date || "",
              is_escalated: !!t.is_escalated,
              employees: emp ? {
                employee_name: emp.employee_name,
                profile_photo: emp.profile_photo,
                departments: null
              } : null
            };
          });
          return <TasksTable tasks={formattedTasks} />;
        })()}
      </div>
    </div>
  )
}
