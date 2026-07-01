export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { AnnouncementsList } from "@/components/custom/AnnouncementsList"

export const metadata = {
  title: "Announcements - Employee | InnoVibe TMS",
}

export default async function EmployeeAnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch employee account status
  const { data: employee } = await supabase
    .from('employees')
    .select('account_status')
    .eq('id', user.id)
    .maybeSingle()

  const isInactive = employee?.account_status === 'Inactive' || employee?.account_status === 'INACTIVE'

  // Run both queries in parallel, limit to 30 most recent announcements
  const [{ data: announcementsRaw }, { data: departments }] = await Promise.all([
    isInactive
      ? Promise.resolve({ data: [] })
      : supabase
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
        description="Stay updated with the latest news and broadcasts from your company."
      />

      <div className="pt-2">
        <AnnouncementsList announcements={announcements || []} viewerRole="EMPLOYEE" />
      </div>
    </div>
  )
}
