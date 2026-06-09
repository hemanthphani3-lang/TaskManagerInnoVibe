"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"

/**
 * Server action to update an employee profile.
 * Restricted to department heads managing their own department.
 */
export async function deptUpdateEmployeeProfile(employeeId: string, updatedData: Record<string, any>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // 1. Verify caller is a Department Head
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!dept) {
      return { success: false, error: "Unauthorized: Department Head privileges required." }
    }

    // 2. Verify employee belongs to Department Head's department
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (empErr || !employee) {
      return { success: false, error: "Employee profile not found." }
    }

    if (employee.department_id !== user.id) {
      return { success: false, error: "Unauthorized: You can only edit employees within your own department." }
    }

    // 3. Detect changes & construct updates
    const changedFields: string[] = []
    const dbUpdate: Record<string, any> = {}

    // Personal Details
    if (updatedData.employee_name !== undefined && updatedData.employee_name !== employee.employee_name) {
      changedFields.push('Full Name')
      dbUpdate.employee_name = updatedData.employee_name
    }
    if (updatedData.phone_number !== undefined && updatedData.phone_number !== employee.phone_number) {
      changedFields.push('Phone Number')
      dbUpdate.phone_number = updatedData.phone_number
    }
    if (updatedData.alternate_phone !== undefined && updatedData.alternate_phone !== employee.alternate_phone) {
      changedFields.push('Alternate Phone')
      dbUpdate.alternate_phone = updatedData.alternate_phone
    }
    if (updatedData.address !== undefined && updatedData.address !== employee.address) {
      changedFields.push('Address')
      dbUpdate.address = updatedData.address
    }
    if (updatedData.emergency_contact !== undefined && JSON.stringify(updatedData.emergency_contact) !== JSON.stringify(employee.emergency_contact)) {
      changedFields.push('Emergency Contact')
      dbUpdate.emergency_contact = updatedData.emergency_contact
    }

    // Employment Details
    if (updatedData.designation !== undefined && updatedData.designation !== employee.designation) {
      changedFields.push('Designation')
      dbUpdate.designation = updatedData.designation
    }
    if (updatedData.reporting_manager !== undefined && updatedData.reporting_manager !== employee.reporting_manager) {
      changedFields.push('Reporting Manager')
      dbUpdate.reporting_manager = updatedData.reporting_manager
    }
    if (updatedData.employee_code !== undefined && updatedData.employee_code !== employee.employee_code) {
      changedFields.push('Employee ID')
      dbUpdate.employee_code = updatedData.employee_code
    }
    if (updatedData.employment_type !== undefined && updatedData.employment_type !== employee.employment_type) {
      changedFields.push('Employment Type')
      dbUpdate.employment_type = updatedData.employment_type
    }
    if (updatedData.work_mode !== undefined && updatedData.work_mode !== employee.work_mode) {
      changedFields.push('Work Mode')
      dbUpdate.work_mode = updatedData.work_mode
    }
    if (updatedData.joining_date !== undefined && updatedData.joining_date !== employee.joining_date) {
      changedFields.push('Joining Date')
      dbUpdate.joining_date = updatedData.joining_date
    }
    if (updatedData.profile_photo !== undefined && updatedData.profile_photo !== employee.profile_photo) {
      changedFields.push('Profile Photo')
      dbUpdate.profile_photo = updatedData.profile_photo
    }

    // Account Status
    if (updatedData.account_status !== undefined && updatedData.account_status !== employee.account_status) {
      changedFields.push('Account Status')
      dbUpdate.account_status = updatedData.account_status
    }

    // Email change
    let emailChanged = false
    if (updatedData.employee_email !== undefined && updatedData.employee_email !== employee.employee_email) {
      changedFields.push('Login Email')
      dbUpdate.employee_email = updatedData.employee_email
      emailChanged = true
    }

    if (changedFields.length === 0) {
      return { success: true, message: "No fields modified." }
    }

    // 4. Save updates via service client (bypasses RLS limits on employee updates)
    const serviceSupabase = createServiceClient()

    if (emailChanged) {
      const { error: authErr } = await serviceSupabase.auth.admin.updateUserById(employeeId, {
        email: updatedData.employee_email
      })
      if (authErr) {
        return { success: false, error: `Auth Email Update Error: ${authErr.message}` }
      }
    }

    const { error: dbErr } = await serviceSupabase
      .from('employees')
      .update(dbUpdate)
      .eq('id', employeeId)

    if (dbErr) {
      return { success: false, error: dbErr.message }
    }

    // 5. Write audit log entry
    await serviceSupabase.from('activity_feed').insert({
      activity_type: 'PROFILE_EDIT',
      activity_user: employeeId,
      activity_user_name: dbUpdate.employee_name || employee.employee_name,
      activity_description: `Profile edited by Dept Head. Changes: ${changedFields.join(', ')}`,
      department_id: user.id
    })

    revalidatePath(`/department/employees/${employeeId}`)
    revalidatePath('/department/employees')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  }
}

/**
 * Server action to reset an employee's password.
 * Restricted to department heads managing their own department.
 */
export async function deptResetEmployeePassword(employeeId: string, newPassword: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // 1. Verify caller is a Department Head
    const { data: dept } = await supabase
      .from('departments')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!dept) {
      return { success: false, error: "Unauthorized: Department Head privileges required." }
    }

    // 2. Verify employee belongs to Department Head's department
    const { data: employee, error: empErr } = await supabase
      .from('employees')
      .select('employee_name, department_id')
      .eq('id', employeeId)
      .single()

    if (empErr || !employee) {
      return { success: false, error: "Employee profile not found." }
    }

    if (employee.department_id !== user.id) {
      return { success: false, error: "Unauthorized: You can only reset passwords for employees within your own department." }
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." }
    }

    // 3. Reset password using service role client
    const serviceSupabase = createServiceClient()

    const { error: authErr } = await serviceSupabase.auth.admin.updateUserById(employeeId, {
      password: newPassword
    })

    if (authErr) {
      return { success: false, error: authErr.message }
    }

    // 4. Write audit log entry
    await serviceSupabase.from('activity_feed').insert({
      activity_type: 'PASSWORD_RESET',
      activity_user: employeeId,
      activity_user_name: employee.employee_name,
      activity_description: 'Password forced reset by Department Head.',
      department_id: user.id
    })

    // 5. Send notification to employee
    await serviceSupabase.from('notifications').insert({
      user_id: employeeId,
      title: 'Password Reset',
      message: 'Your password was reset by your Department Head.',
      type: 'SYSTEM',
      link_url: '#'
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  }
}
