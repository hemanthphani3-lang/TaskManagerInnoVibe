import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { TasksTable, type Task } from "@/app/department/tasks/TasksTable"
import { Button } from "@/components/ui/button"
import { Plus, ListTodo } from "lucide-react"
import Link from "next/link"

export const revalidate = 0

export default async function AdminTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all tasks globally
  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      id,
      task_title,
      task_description,
      task_status,
      priority_level,
      due_date,
      is_escalated,
      employees:assigned_employee_id (
        employee_name,
        profile_photo,
        departments!department_id ( department_name )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
  }

  // Type assertion since we know the shape matches what TasksTable expects
  const formattedTasks: Task[] = (tasks || []).map(t => {
    const rawEmp = t.employees;
    const emp = Array.isArray(rawEmp) ? rawEmp[0] : rawEmp;
    return {
      id: t.id,
      task_title: t.task_title,
      task_description: t.task_description,
      task_status: t.task_status,
      priority_level: t.priority_level,
      due_date: t.due_date,
      is_escalated: t.is_escalated,
      employees: emp ? {
        employee_name: emp.employee_name,
        profile_photo: emp.profile_photo,
        departments: emp.departments ? {
          department_name: Array.isArray(emp.departments) 
            ? emp.departments[0]?.department_name || "" 
            : emp.departments.department_name
        } : null
      } : null
    };
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageHeader 
            title="Global Task Management" 
            description="View and assign tasks across all departments in the organization."
          />
          <Link href="/admin/tasks/create">
            <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl shadow-sm shadow-[#0066FF]/20 px-6 py-5 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Assign Task
            </Button>
          </Link>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-[#0066FF] dark:text-blue-400">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Tasks</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{tasks?.length || 0}</h4>
            </div>
          </div>
          {/* Add more stats if needed, simplified for now */}
        </div>

        <div className="h-[600px]">
          <TasksTable tasks={formattedTasks} basePath="/admin/tasks" />
        </div>
      </div>
    </div>
  )
}
