export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotificationsView } from "@/components/notifications/NotificationsView"

export default async function EmployeeNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: employee } = await supabase
    .from('employees')
    .select('account_status')
    .eq('id', user.id)
    .maybeSingle()

  const isInactive = employee?.account_status === 'Inactive' || employee?.account_status === 'INACTIVE'

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <NotificationsView userId={user.id} isInactive={isInactive} />
      </div>
    </div>
  )
}
