export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { Card } from "@/components/ui/card"
import { createServiceClient } from "@/lib/supabase/service"
import { AuditLogsClient } from "@/components/admin/AuditLogsClient"

export const metadata = {
  title: "Audit Logs | Admin",
}

export default async function AdminAuditLogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const supabaseAdmin = createServiceClient()

  // Fetch all activities from activity_feed
  const { data: activities, error } = await supabaseAdmin
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching activity feed for audit logs:", error)
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Audit Logs" 
        description="Monitor system activities, logins, logouts, task updates, and administrative actions."
      />
      <Card className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <AuditLogsClient initialActivities={activities || []} />
      </Card>
    </div>
  )
}
