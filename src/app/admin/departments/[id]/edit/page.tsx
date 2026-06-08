import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EditDepartmentForm } from "@/components/admin/EditDepartmentForm"

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: departmentId } = await params
  const supabase = await createClient()

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error("Auth error:", error)
  }

  if (!user) redirect("/login")

  // Fetch department details
  const { data: department } = await supabase
    .from('departments')
    .select('*')
    .eq('id', departmentId)
    .single()

  if (!department) {
    return <div className="p-8">Department not found</div>
  }

  return <EditDepartmentForm department={department} />
}
