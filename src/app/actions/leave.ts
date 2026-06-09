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
      department_id: departmentId || null,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason
    })

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    // Get employee details
    const { data: employee } = await supabase
      .from('employees')
      .select('employee_name')
      .eq('id', employeeId)
      .maybeSingle()
    
    let empName = employee?.employee_name
    if (!empName) {
      // Check if it's a Department Head
      const { data: dept } = await supabase
        .from('departments')
        .select('department_head_name')
        .eq('id', employeeId)
        .maybeSingle()
      empName = dept?.department_head_name || "Department Head"
    }

    const formattedType = leaveType.replace(/_/g, ' ')
    const msg = `${empName} has submitted a leave request (${formattedType}) starting on ${startDate}.`

    // 1. Notify employee/head
    await supabase.from('notifications').insert({
      user_id: employeeId,
      title: 'Leave Request Submitted',
      message: `Your leave request for ${formattedType} starting on ${startDate} was submitted successfully.`,
      type: 'SYSTEM'
    })

    // 2. Notify Department Head (only if they are an employee, and not the requester themselves)
    if (departmentId && departmentId !== employeeId) {
      await supabase.from('notifications').insert({
        user_id: departmentId,
        title: 'New Leave Request',
        message: msg,
        type: 'SYSTEM'
      })
    }

    // 3. Notify Admins
    const { data: admins } = await supabase.from('admins').select('id')
    if (admins && admins.length > 0) {
      const adminNotifications = admins.map(admin => ({
        user_id: admin.id,
        title: 'New Leave Request',
        message: msg,
        type: 'SYSTEM'
      }))
      await supabase.from('notifications').insert(adminNotifications)
    }
  } catch (notifErr) {
    console.error("Failed to generate leave submission notifications:", notifErr)
  }

  revalidatePath('/employee/leave')
  revalidatePath('/department/leave')
  revalidatePath('/admin/leaves')
  return { success: true }
}

export async function updateLeaveStatus(requestId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  let error;

  if (status === 'REJECTED') {
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        approval_status: status,
        approved_by: user.id,
        rejection_reason: rejectionReason || null
      })
      .eq('id', requestId)
    error = updateError
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

  try {
    // Get leave request info
    const { data: request } = await supabase
      .from('leave_requests')
      .select('employee_id, leave_type, start_date')
      .eq('id', requestId)
      .maybeSingle()

    if (request) {
      const formattedType = request.leave_type.replace(/_/g, ' ')
      const msg = `Your leave request for ${formattedType} starting on ${request.start_date} has been ${status.toLowerCase()}.`
      
      await supabase.from('notifications').insert({
        user_id: request.employee_id,
        title: `Leave Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
        message: msg,
        type: 'SYSTEM'
      })
    }
  } catch (notifErr) {
    console.error("Failed to generate leave update notifications:", notifErr)
  }

  revalidatePath('/department/leave-approvals')
  revalidatePath('/department/dashboard') // Might as well refresh the dashboard cache too
  revalidatePath('/employee/leave') // Ensure employee view updates
  revalidatePath('/department/leave')
  revalidatePath('/admin/leaves')
  
  return { success: true }
}
