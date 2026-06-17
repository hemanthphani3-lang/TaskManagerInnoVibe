import { Sidebar } from "@/components/custom/Sidebar"
import { TaskCountsProvider } from "@/context/TaskCountsContext"
import { createClient } from "@/lib/supabase/server"
import { PageTransition } from "@/components/custom/PageTransition"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  let pendingLeavesCount = 0

  try {
    const { count } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'PENDING')
      
    pendingLeavesCount = count || 0
  } catch (error) {
    console.error("Error fetching pending leaves count in admin layout:", error)
  }
  const adminLinks = [
    { label: "Dashboard", href: "/admin/dashboard", iconName: "dashboard" },
    { label: "Tasks", href: "/admin/tasks", iconName: "tasks" },
    { label: "Attendance", href: "/admin/attendance", iconName: "calendar" },
    { label: "Departments", href: "/admin/departments", iconName: "departments" },
    { label: "Employees", href: "/admin/employees", iconName: "employees" },
    { label: "Leave Approvals", href: "/admin/leaves", iconName: "calendar", badgeCount: pendingLeavesCount },
    { label: "Reports", href: "/admin/reports", iconName: "file" },
    { label: "Logout Reports", href: "/admin/logouts", iconName: "identity" },
    { label: "Announcements", href: "/admin/announcements", iconName: "megaphone" },
    { label: "Notifications", href: "/admin/notifications", iconName: "bell" },
    { label: "Settings", href: "/admin/settings", iconName: "settings" },
    { label: "Audit Logs", href: "/admin/audit-logs", iconName: "file" },
    { label: "Profile", href: "/admin/profile", iconName: "profile" },
  ];


  return (
    <TaskCountsProvider>
      <div className="min-h-screen bg-[#F8FAFC]">
        <Sidebar title="Admin Portal" links={adminLinks} />
        <div className="md:pl-64 pt-16 md:pt-0 flex flex-col min-h-screen md:h-screen md:overflow-hidden transition-all duration-300">
          <main className="flex-1 w-full flex flex-col min-h-0 overflow-y-auto">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
    </TaskCountsProvider>
  )
}

