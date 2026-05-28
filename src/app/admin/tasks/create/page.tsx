export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminCreateTaskForm } from "@/components/admin/AdminCreateTaskForm"

export default async function AdminCreateTaskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch all employees with their department names to pass to the dropdown
  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, employee_name, employee_code, designation, department_id, departments!department_id(department_name)")
    .order("employee_name")

  if (error) {
    console.error("Error fetching employees:", error)
  }

  return <AdminCreateTaskForm employees={(employees as any) || []} />
}
