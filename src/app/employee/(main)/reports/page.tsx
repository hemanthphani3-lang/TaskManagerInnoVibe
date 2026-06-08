import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/custom/PageHeader"
import { ReportExportModal } from "@/components/reports/ReportExportModal"

export default async function EmployeeReportsPage() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader 
          title="My Reports" 
          description="Download your personal attendance and productivity history."
        />
        
        <ReportExportModal role="EMPLOYEE" employeeId={user.id} />
      </div>
    </div>
  )
}
