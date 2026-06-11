export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createTask } from "@/app/actions/tasks"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AssigneeSelect } from "@/components/tasks/AssigneeSelect"
import { DeadlineDatePicker } from "@/components/tasks/DeadlineDatePicker"

export default async function CreateTaskPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }
  if (!user) redirect('/login')

  // Fetch employees to populate the assignee dropdown
  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_name, designation')
    .eq('department_id', user.id)
    .order('employee_name')

  // Filter out the logged-in department head from assignee options
  const filteredEmployees = (employees || []).filter((emp: any) => emp.designation !== 'Department Head' && emp.id !== user.id)

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 shadow-sm">
            <span className="font-bold">Failed to create task:</span> {error}
          </div>
        )}
        <Link href="/department/tasks" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Link>

        <PageHeader 
          title="Create New Task" 
          description="Assign a new task to an employee in your department."
        />

        <Card className="p-6 sm:p-8 rounded-2xl border-slate-200 shadow-sm bg-white">
          <form action={async (formData) => { "use server"; await createTask(formData); }} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Task Title</label>
              <input 
                type="text" 
                name="title" 
                required 
                placeholder="e.g. Q3 Financial Report Update" 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-medium" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Detailed Description</label>
              <textarea 
                name="description" 
                rows={5}
                required 
                placeholder="Provide detailed instructions..." 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm resize-none" 
              />
            </div>

            <AssigneeSelect employees={filteredEmployees} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Priority Level</label>
                <select 
                  name="priority" 
                  defaultValue="MEDIUM"
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-medium"
                >
                  <option value="CRITICAL">🔴 Critical</option>
                  <option value="HIGH">🟠 High</option>
                  <option value="MEDIUM">🔵 Medium</option>
                  <option value="LOW">⚪ Low</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Due Date</label>
                <DeadlineDatePicker name="due_date" id="due_date" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Estimated Time (Optional)</label>
                <input 
                  type="text" 
                  name="estimated_time" 
                  placeholder="e.g. 4 hours, 2 days" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Attach Files (Optional)</label>
              <input 
                type="file" 
                name="attachments" 
                multiple
                accept=".zip,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#0066FF] hover:file:bg-blue-100" 
              />
              <p className="text-xs text-slate-500">You can attach multiple files (Images, PDFs, Word, Excel, PowerPoint, ZIPs).</p>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <Button type="submit" className="bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl px-8 py-6 text-base shadow-lg shadow-[#0066FF]/20">
                Create & Assign Task
              </Button>
            </div>
            
          </form>
        </Card>
      </div>
    </div>
  )
}
