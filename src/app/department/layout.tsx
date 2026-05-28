import { Sidebar } from "@/components/custom/Sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error in layout:", error)
  }

  let pendingLeavesCount = 0

  if (user) {
    const { count } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', user.id)
      .eq('approval_status', 'PENDING')
      
    pendingLeavesCount = count || 0
  }

  const departmentLinks = [
    { label: "Dashboard", href: "/department/dashboard", iconName: "dashboard" },
    { label: "Employees", href: "/department/employees", iconName: "employees" },
    { label: "Tasks", href: "/department/tasks", iconName: "tasks" },
    { label: "Leave Approvals", href: "/department/leave-approvals", iconName: "calendar", badgeCount: pendingLeavesCount },
    { label: "Logout reports", href: "/department/logouts", iconName: "identity" },
    { label: "Announcements", href: "/department/announcements", iconName: "megaphone" },
    { label: "Reports", href: "/department/reports", iconName: "file" },
    { label: "Notifications", href: "/department/notifications", iconName: "bell" },
    { label: "Profile", href: "/department/profile", iconName: "profile" },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar title="Department" links={departmentLinks} />
      <div className="md:pl-64 pt-16 md:pt-0 flex flex-col min-h-screen transition-all duration-300">
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
