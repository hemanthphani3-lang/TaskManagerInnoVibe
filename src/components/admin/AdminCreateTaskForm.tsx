"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { createAdminTask } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2, Users, UploadCloud } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Employee {
  id: string
  employee_name: string
  employee_code: string
  designation?: string
  department_id: string
  departments: {
    department_name: string
  } | null
}

export function AdminCreateTaskForm({ employees }: { employees: Employee[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine file names for display if files selected
  const [fileNames, setFileNames] = useState<string[]>([])
  
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("")
  const [selectedDesignation, setSelectedDesignation] = useState<string>("")
  
  // Format employees to show their department correctly
  const formattedEmployees = employees.map(emp => ({
    ...emp,
    deptName: emp.departments ? (Array.isArray(emp.departments) ? emp.departments[0].department_name : emp.departments.department_name) : "Unknown Dept"
  }))

  const uniqueDepartments = Array.from(new Map(formattedEmployees.map(emp => [emp.department_id, { id: emp.department_id, name: emp.deptName }])).values())
  const uniqueDesignations = Array.from(new Set(formattedEmployees.map(emp => emp.designation).filter(Boolean))) as string[]
  
  const filteredEmployees = formattedEmployees.filter(emp => {
    const matchesDept = selectedDepartmentId ? emp.department_id === selectedDepartmentId : true
    const matchesRole = selectedDesignation ? emp.designation === selectedDesignation : true
    return matchesDept && matchesRole
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    // Check if employee is selected
    const assigned_employee_id = formData.get('assigned_employee_id') as string
    if (!assigned_employee_id) {
      setError("Please select an employee.")
      setLoading(false)
      return
    }

    // Get the employee's department
    const selectedEmp = formattedEmployees.find(emp => emp.id === assigned_employee_id)
    if (selectedEmp) {
      formData.append('department_id', selectedEmp.department_id)
    }

    const result = await createAdminTask(formData)

    if (!result || !result.success) {
      setError(result?.error || "Failed to create task")
      setLoading(false)
    } else {
      toast.success("Task assigned successfully!")
      router.push('/admin/tasks')
      router.refresh()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map(f => f.name)
      setFileNames(names)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/admin/tasks" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </Link>
        
        <PageHeader 
          title="Assign New Task" 
          description="Create a task and assign it to any employee across the organization."
        />

        <Card className="p-6 sm:p-8 rounded-2xl border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 border-b border-slate-100 dark:border-slate-700">
              {/* Department Dropdown (Filter) */}
              <div className="space-y-2">
                <Label htmlFor="department_filter" className="flex items-center gap-2 dark:text-slate-200">
                  <Users className="w-4 h-4 text-[#0066FF]" />
                  Filter by Department
                </Label>
                <select
                  id="department_filter"
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="">All Departments</option>
                  {uniqueDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Dropdown (Filter) */}
              <div className="space-y-2">
                <Label htmlFor="role_filter" className="flex items-center gap-2 dark:text-slate-200">
                  <Users className="w-4 h-4 text-[#0066FF]" />
                  Filter by Role
                </Label>
                <select
                  id="role_filter"
                  value={selectedDesignation}
                  onChange={(e) => setSelectedDesignation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="">All Roles</option>
                  {uniqueDesignations.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="assigned_employee_id" className="flex items-center gap-2 dark:text-slate-200">
                  Assign to Employee
                </Label>
                <select
                  id="assigned_employee_id"
                  name="assigned_employee_id"
                  required
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="" disabled>Select an employee...</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_name} ({emp.employee_code}) {emp.designation ? `- ${emp.designation}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="dark:text-slate-200">Task Title</Label>
              <Input id="title" name="title" required placeholder="e.g. Q3 Financial Report" className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="dark:text-slate-200">Task Description</Label>
              <textarea 
                id="description"
                name="description" 
                required 
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm resize-none dark:text-slate-200"
                placeholder="Detailed instructions for the task..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="priority" className="dark:text-slate-200">Priority Level</Label>
                <select 
                  id="priority"
                  name="priority"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-medium dark:text-slate-200"
                  defaultValue="MEDIUM"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="dark:text-slate-200">Due Date</Label>
                <Input id="due_date" name="due_date" type="date" required className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_time" className="dark:text-slate-200">Est. Time (Optional)</Label>
                <Input id="estimated_time" name="estimated_time" placeholder="e.g. 4h 30m" className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" />
              </div>
            </div>

            {/* Attachments */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Label className="dark:text-slate-200">Attachments (Optional)</Label>
              <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group text-center">
                <input 
                  type="file" 
                  name="attachments"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-3 group-hover:text-[#0066FF] transition-colors" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {fileNames.length > 0 ? `${fileNames.length} file(s) selected` : "Click or drag files here to attach"}
                </p>
              </div>
              {fileNames.length > 0 && (
                <ul className="text-xs text-slate-500 space-y-1">
                  {fileNames.map((name, i) => <li key={i}>• {name}</li>)}
                </ul>
              )}
            </div>

            <div className="pt-6 flex justify-end">
              <Button type="submit" disabled={loading} className="bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl px-8 py-6 shadow-md shadow-[#0066FF]/20">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? "Assigning Task..." : "Assign Task"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
