import { createClient } from "@/lib/supabase/server"
import { DepartmentSessionManager } from "@/components/department/DepartmentSessionManager"
import { redirect } from "next/navigation"

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

  if (!user) redirect("/login")

  // Check attendance status for the Department Head (user.id is their employee id)
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

  const { data: attendance } = await supabase
    .from('attendance')
    .select('work_status')
    .eq('employee_id', user.id)
    .gte('created_at', startUTC)
    .lte('created_at', endUTC)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!attendance || attendance.work_status === 'LOGGED_OUT') {
    redirect("/employee/identity-check")
  }

  let pendingLeavesCount = 0

  const { count } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', user.id)
    .eq('approval_status', 'PENDING')
    
  pendingLeavesCount = count || 0

  const departmentLinks = [
    { label: "Dashboard", href: "/department/dashboard", iconName: "dashboard" },
    { label: "Attendance", href: "/department/attendance", iconName: "calendar" },
    { label: "Employees", href: "/department/employees", iconName: "employees" },
    { label: "Tasks", href: "/department/tasks", iconName: "tasks" },
    { label: "Leave Approvals", href: "/department/leave-approvals", iconName: "calendar", badgeCount: pendingLeavesCount },
    { label: "Apply Leave", href: "/department/leave", iconName: "calendar" },
    { label: "Reports", href: "/department/reports", iconName: "file" },
    { label: "Logout Reports", href: "/department/logouts", iconName: "identity" },
    { label: "Announcements", href: "/department/announcements", iconName: "megaphone" },
    { label: "Notifications", href: "/department/notifications", iconName: "bell" },
    { label: "Profile", href: "/department/profile", iconName: "profile" },
  ];
  return (
    <TaskCountsProvider>
      <DepartmentSessionManager links={departmentLinks}>
        {children}
      </DepartmentSessionManager>
    </TaskCountsProvider>
  )
}
