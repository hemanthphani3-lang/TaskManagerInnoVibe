import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmployeeSessionManager } from "@/components/employee/EmployeeSessionManager"

import { TaskCountsProvider } from "@/context/TaskCountsContext"

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (_e) {}

  if (!user) redirect("/login")

  // IST-aware today bounds
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
  const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
  const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

  // Run both queries in parallel — saves 1 full sequential round-trip
  const [{ data: employee }, { data: attendance }] = await Promise.all([
    supabase
      .from('employees')
      .select('employee_code, onboarding_completed_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('attendance')
      .select('work_status')
      .eq('employee_id', user.id)
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  const empCode = employee?.employee_code || "dashboard"
  const employeeLinks = [
    { label: "Dashboard", href: `/employee/${empCode}/dashboard`, iconName: "dashboard" },
    { label: "Tasks", href: "/employee/tasks", iconName: "tasks" },
    { label: "Leave", href: "/employee/leave", iconName: "calendar" },
    { label: "Logout reports", href: `/employee/${empCode}/logouts`, iconName: "identity" },
    { label: "Announcements", href: "/employee/announcements", iconName: "megaphone" },
    { label: "Reports", href: "/employee/reports", iconName: "file" },
    { label: "Notifications", href: "/employee/notifications", iconName: "bell" },
    { label: "Profile", href: "/employee/profile", iconName: "profile" },
  ]

  const onboardedToday = employee?.onboarding_completed_at 
    ? new Date(employee.onboarding_completed_at) >= new Date(startUTC)
    : false;

  // If no attendance record today, or already officially logged out, redirect to check in
  // Allow bypass if they literally just completed onboarding today!
  if (!onboardedToday && (!attendance || attendance.work_status === 'LOGGED_OUT')) {
    redirect("/employee/identity-check")
  }

  return (
    <TaskCountsProvider>
      <EmployeeSessionManager links={employeeLinks}>
        {children}
      </EmployeeSessionManager>
    </TaskCountsProvider>
  )
}
