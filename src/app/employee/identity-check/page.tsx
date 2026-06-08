export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserCircle2 } from "lucide-react"
import ActionButtons from "./ActionButtons"

export default async function EmployeeIdentityCheck() {
  const supabase = await createClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (_e) {}

  if (!user) redirect("/login")

  // Fetch employee profile + department name
  const { data: employee } = await supabase
    .from('employees')
    .select(`
      *,
      departments!department_id(department_name)
    `)
    .eq('id', user!.id)
    .single()

  const departmentName = (employee?.departments as { department_name: string } | null)?.department_name || "Unassigned"

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-[#0A1A2F]/5 p-8 border border-slate-100 text-center">

        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-[#0066FF] to-[#00D4FF] rounded-t-2xl" />

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Identity Verification</p>

        {/* Avatar */}
        <div className="flex justify-center mb-5">
          {employee?.profile_photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.profile_photo}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-slate-100 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-50 to-slate-100 flex items-center justify-center ring-4 ring-slate-100 shadow-md">
              <UserCircle2 className="w-12 h-12 text-slate-300" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1 mb-7">
          <h3 className="text-xl font-bold text-[#0A1A2F]">{employee?.employee_name || user!.email}</h3>
          <p className="text-[#0066FF] text-sm font-semibold">{employee?.designation || "Employee"}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
            {departmentName}
          </span>
        </div>

        {/* Action Buttons */}
        <ActionButtons
          employeeId={employee?.id || ""}
          departmentId={employee?.department_id || ""}
        />
      </div>
    </div>
  )
}
