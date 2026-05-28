import { Sidebar } from "@/components/custom/Sidebar"
import { LayoutDashboard, Building2 } from "lucide-react"

const adminLinks = [
  { label: "Dashboard", href: "/admin/dashboard", iconName: "dashboard" },
  { label: "Tasks", href: "/admin/tasks", iconName: "tasks" },
  { label: "Departments", href: "/admin/departments", iconName: "departments" },
  { label: "Employees", href: "/admin/employees", iconName: "employees" },
  { label: "Logout reports", href: "/admin/logouts", iconName: "identity" },
  { label: "Holidays", href: "/admin/holidays", iconName: "calendar" },
  { label: "Announcements", href: "/admin/announcements", iconName: "megaphone" },
  { label: "Notifications", href: "/admin/notifications", iconName: "bell" },
  { label: "Reports", href: "/admin/reports", iconName: "file" },
  { label: "Profile", href: "/admin/profile", iconName: "profile" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar title="Admin Portal" links={adminLinks} />
      <div className="md:pl-64 pt-16 md:pt-0 flex flex-col min-h-screen transition-all duration-300">
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
