import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotificationsView } from "@/components/notifications/NotificationsView"

export default async function DepartmentNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <NotificationsView />
      </div>
    </div>
  )
}
