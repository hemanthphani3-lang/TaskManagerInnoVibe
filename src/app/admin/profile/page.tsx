export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { ProfilePhotoEditor } from "@/components/settings/ProfilePhotoEditor"
import { Card } from "@/components/ui/card"
import { Settings, Shield, Mail } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Profile | Admin",
}

export default async function AdminProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: adminData } = await supabase
    .from('admins')
    .select('full_name, profile_photo')
    .eq('id', user.id)
    .maybeSingle()

  const displayName = adminData?.full_name || user.email || "Admin"
  const currentPhoto = adminData?.profile_photo

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader 
          title="Admin Profile" 
          description="View your system administrator details."
        />
        <div className="flex items-center gap-3">
          <Link 
            href="/onboarding"
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#0066FF] hover:bg-[#0052CC] rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            title="Complete or Update Profile Details"
          >
            Update Profile
          </Link>
          <Link 
            href="/admin/settings"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-[#0066FF] hover:border-[#0066FF] hover:bg-blue-50 transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <Card className="p-8 rounded-2xl bg-white shadow-sm border-slate-200">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <ProfilePhotoEditor
            currentPhoto={currentPhoto}
            name={displayName}
            userId={user.id}
          />
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-1">System Administrator</h2>
              <div className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 w-max px-3 py-1 rounded-full text-sm">
                <Shield className="w-4 h-4" />
                Super Admin
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
                  <Mail className="w-4 h-4" /> Email Address
                </p>
                <p className="text-lg font-bold text-slate-900">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
