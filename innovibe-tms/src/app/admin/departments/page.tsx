export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { DepartmentCard } from "@/components/custom/DepartmentCard"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function AdminDepartmentsPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }
  if (!user) redirect('/login')

  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader 
          title="Departments" 
          description="Manage all organizational departments and their heads."
          action={
            <Link 
              href="/admin/departments/create" 
              className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-[#0066FF]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </Link>
          }
        />

        {departments?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No departments found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Get started by creating your first department. You can assign a department head and configure access.</p>
            <Link 
              href="/admin/departments/create" 
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Department</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments?.map((dept) => (
              <DepartmentCard
                key={dept.id}
                id={dept.id}
                name={dept.department_name}
                code={dept.department_code}
                email={dept.department_email}
                headName={dept.department_head_name}
                status={dept.status}
                photo={dept.profile_photo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
