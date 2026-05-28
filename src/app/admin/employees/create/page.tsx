export const dynamic = 'force-dynamic'

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminCreateEmployeeForm } from "@/components/admin/AdminCreateEmployeeForm"

export default async function AdminCreateEmployeePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch departments for the dropdown
  const { data: departments, error } = await supabase
    .from("departments")
    .select("id, department_name, department_code")
    .order("department_name")

  if (error) {
    console.error("Error fetching departments:", error)
  }

  return <AdminCreateEmployeeForm departments={departments || []} />
}
