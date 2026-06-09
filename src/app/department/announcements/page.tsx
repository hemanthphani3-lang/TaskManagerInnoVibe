export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { AnnouncementsList } from "@/components/custom/AnnouncementsList"
import { DepartmentBroadcastForm } from "@/components/department/DepartmentBroadcastForm"

export const metadata = {
  title: "Announcements - Department | InnoVibe TMS",
}

export default async function DepartmentAnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Run both queries in parallel, limit to 30 most recent announcements
  const [{ data: announcementsRaw }, { data: departments }] = await Promise.all([
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('departments')
      .select('id, department_name')
  ])

  const deptMap = new Map(departments?.map(d => [d.id, d.department_name]) || [])

  const announcements = (announcementsRaw || []).map(a => ({
    ...a,
    department_name: a.sender_role === 'DEPARTMENT' ? deptMap.get(a.sender_id) : undefined
  }))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <PageHeader 
        title="Announcements" 
        description="View organization announcements and broadcast messages to your employees."
      />
      
      <DepartmentBroadcastForm />

      <div className="pt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Announcement History</h2>
        <AnnouncementsList announcements={announcements || []} viewerRole="DEPARTMENT" />
      </div>
    </div>
  )
}
