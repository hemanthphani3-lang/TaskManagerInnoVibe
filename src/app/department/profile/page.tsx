import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { UserAvatar } from "@/components/custom/UserAvatar"
import { ProfilePhotoEditor } from "@/components/settings/ProfilePhotoEditor"
import { Card } from "@/components/ui/card"
import { Settings, UserCircle, Building2, Hash, Briefcase } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Profile | Department",
}

export default async function DepartmentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: dept } = await supabase
    .from('departments')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!dept) return <div>Profile not found</div>

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Department Profile" 
          description="View your department head details and settings."
        />
        <Link 
          href="/department/settings"
          className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-[#0066FF] hover:border-[#0066FF] hover:bg-blue-50 transition-all"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>

      <Card className="p-8 rounded-2xl bg-white shadow-sm border-slate-200">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <ProfilePhotoEditor
              currentPhoto={dept.profile_photo}
              name={dept.department_name}
              userId={dept.id}
            />
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-1">{dept.department_name}</h2>
              <div className="flex items-center gap-2 text-purple-600 font-medium bg-purple-50 w-max px-3 py-1 rounded-full text-sm">
                <Building2 className="w-4 h-4" />
                Department
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Hash className="w-4 h-4" /> Department ID
                </p>
                <p className="text-lg font-bold text-slate-900">{dept.department_code}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <UserCircle className="w-4 h-4" /> Head Name
                </p>
                <p className="text-lg font-bold text-slate-900">{dept.department_head_name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-4 h-4" /> Role
                </p>
                <p className="text-lg font-bold text-slate-900">Department Admin</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
