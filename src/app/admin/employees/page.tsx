import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { Card } from "@/components/ui/card"
import { Users, Plus, Building2, Calendar, Phone } from "lucide-react"
import Link from "next/link"
import { ResetPasswordButton } from "@/components/settings/ResetPasswordButton"

export const revalidate = 0

export default async function AdminEmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: employees, error } = await supabase
    .from("employees")
    .select("*, departments!department_id(department_name)")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching employees:", error)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader 
          title="Company Employees" 
          description="Manage all employees across all departments."
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <Card className="px-6 py-4 rounded-2xl flex items-center gap-4 shadow-sm border-slate-200 bg-white">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[#0066FF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Employees</p>
              <h3 className="text-2xl font-bold text-slate-900">{employees?.length || 0}</h3>
            </div>
          </Card>
          <Link 
            href="/admin/employees/create" 
            className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm shadow-[#0066FF]/20"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </Link>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Employee</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Department</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Contact</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">Joining Date</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No employees found. Click &quot;Add Employee&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  employees?.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#0066FF] font-bold text-sm">
                            {emp.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{emp.employee_name}</div>
                            <div className="text-xs text-slate-500 font-medium">{emp.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Building2 className="w-3.5 h-3.5" />
                          {emp.departments?.department_name || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-700 text-sm">{emp.designation}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">{emp.employee_email}</div>
                        {emp.phone_number && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {emp.phone_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(emp.joining_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ResetPasswordButton userId={emp.id} userName={emp.employee_name} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
