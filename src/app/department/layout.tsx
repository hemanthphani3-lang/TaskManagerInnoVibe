import { createClient } from "@/lib/supabase/server"
import { DepartmentSessionManager } from "@/components/department/DepartmentSessionManager"

import { TaskCountsProvider } from "@/context/TaskCountsContext"

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
    { label: "Request Leave", href: "/department/leave", iconName: "calendar" },
    { label: "Logout reports", href: "/department/logouts", iconName: "identity" },
    { label: "Announcements", href: "/department/announcements", iconName: "megaphone" },
    { label: "Reports", href: "/department/reports", iconName: "file" },
    { label: "Notifications", href: "/department/notifications", iconName: "bell" },
    { label: "Profile", href: "/department/profile", iconName: "profile" },
  ]

  return (
    <TaskCountsProvider>
      <DepartmentSessionManager links={departmentLinks}>
        {children}
      </DepartmentSessionManager>
    </TaskCountsProvider>
  )
}
