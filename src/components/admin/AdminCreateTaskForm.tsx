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
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)

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

  const addEmployee = (emp: Employee) => {
    if (!selectedEmployees.some(e => e.id === emp.id)) {
      setSelectedEmployees(prev => [...prev, emp])
    }
    setSearchQuery("")
    setIsSearchFocused(false)
  }

  const removeEmployee = (empId: string) => {
    setSelectedEmployees(prev => prev.filter(e => e.id !== empId))
  }

  const searchableEmployees = filteredEmployees.filter(emp => {
    const isNotSelected = !selectedEmployees.some(sel => sel.id === emp.id)
    const matchesSearch = emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (emp.designation && emp.designation.toLowerCase().includes(searchQuery.toLowerCase()))
    return isNotSelected && matchesSearch
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    // Check if employee is selected
    if (selectedEmployees.length === 0) {
      setError("Please select at least one employee.")
      setLoading(false)
      return
    }

    // Append all selected employee IDs
    formData.delete('assigned_employee_id')
    selectedEmployees.forEach(emp => {
      formData.append('assigned_employee_id', emp.id)
    })

    // Get the first employee's department for backward compatibility
    const firstEmp = selectedEmployees[0]
    if (firstEmp) {
      formData.append('department_id', firstEmp.department_id)
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

              {/* Employee Search Dropdown */}
              <div className="space-y-2 relative">
                <Label className="flex items-center gap-2 dark:text-slate-200">
                  Search & Add Employees
                </Label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type employee name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-medium text-slate-700 dark:text-slate-300 placeholder-slate-400"
                  />
                  {isSearchFocused && (searchQuery || isSearchFocused) && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1">
                      {searchableEmployees.length === 0 ? (
                        <p className="text-xs text-slate-500 p-3 text-center">No matching employees</p>
                      ) : (
                        searchableEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            onMouseDown={() => addEmployee(emp)}
                            className="px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-350 cursor-pointer transition flex items-center justify-between"
                          >
                            <span className="font-bold">{emp.employee_name} ({emp.employee_code})</span>
                            <span className="text-[10px] text-slate-400 font-medium">{emp.deptName}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Employees Chips Display */}
            {selectedEmployees.length > 0 && (
              <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-700">
                <Label className="dark:text-slate-200">Selected Team Members ({selectedEmployees.length})</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-205 dark:border-slate-750 rounded-2xl animate-fadeIn">
                  {selectedEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-1.5 bg-[#0066FF]/10 border border-[#0066FF]/35 text-[#0066FF] dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-bold"
                    >
                      <span>{emp.employee_name}</span>
                      <span className="text-[9px] text-slate-400 font-medium">({emp.deptName})</span>
                      <button
                        type="button"
                        onClick={() => removeEmployee(emp.id)}
                        className="text-slate-400 hover:text-red-500 transition font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
