import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function RedirectToEmployeeDashboard() {
  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {}

  if (!user) redirect("/login")

  // Fetch employee details to retrieve employee_code
  const { data: employee } = await supabase
    .from('employees')
    .select('employee_code')
    .eq('id', user.id)
    .single()

  if (employee?.employee_code) {
    redirect(`/employee/${employee.employee_code}/dashboard`)
  } else {
    redirect("/login")
  }
}
