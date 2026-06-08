import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { BroadcastForm } from "@/components/admin/BroadcastForm"
import { AnnouncementsList } from "@/components/custom/AnnouncementsList"

export const metadata = {
  title: "Announcements - Admin | InnoVibe TMS",
}

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: announcementsRaw } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: departments } = await supabase.from('departments').select('id, department_name')
  const deptMap = new Map(departments?.map(d => [d.id, d.department_name]) || [])

  const announcements = (announcementsRaw || []).map(a => ({
    ...a,
    department_name: a.sender_role === 'DEPARTMENT' ? deptMap.get(a.sender_id) : undefined
  }))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <PageHeader 
        title="Announcements" 
        description="Broadcast important messages to your departments and employees."
      />
      
      <BroadcastForm />

      <div className="pt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Announcement History</h2>
        <AnnouncementsList announcements={announcements || []} viewerRole="ADMIN" />
      </div>
    </div>
  )
}
