"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitLeaveRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const employeeId = user.id
  const departmentId = formData.get('departmentId') as string
  const leaveType = formData.get('leaveType') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string
  const reason = formData.get('reason') as string

  if (!leaveType || !startDate || !endDate) {
    return { success: false, error: "Missing required fields" }
  }

  const { error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: employeeId,
      department_id: departmentId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/employee/leave')
  return { success: true }
}

export async function updateLeaveStatus(requestId: string, status: 'APPROVED' | 'REJECTED') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  let error;

  if (status === 'REJECTED') {
    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', requestId)
    error = deleteError
  } else {
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({ 
        approval_status: status,
        approved_by: user.id
      })
      .eq('id', requestId)
    error = updateError
  }

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/department/leave-approvals')
  revalidatePath('/department/dashboard') // Might as well refresh the dashboard cache too
  
  return { success: true }
}
