"use server"

import { createClient } from '@supabase/supabase-js'

// We use the service_role key to bypass RLS and create Auth users
// without modifying the current user's session.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createDepartmentAccount(data: Record<string, string>) {
  try {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.department_email,
      password: data.password,
      email_confirm: true,
    })

    if (authError) throw new Error(authError.message)
    const userId = authData.user.id

    // 2. Insert into departments table
    const { error: dbError } = await supabaseAdmin
      .from('departments')
      .insert({
        id: userId,
        department_name: data.department_name,
        department_email: data.department_email,
        department_head_name: data.department_head_name,
        department_code: data.department_code,
        profile_photo: data.profile_photo,
        created_by_admin: data.admin_id,
        check_in_cutoff_time: data.check_in_cutoff_time || '09:30:00',
      })

    if (dbError) {
      // Rollback Auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(dbError.message)
    }

    return { success: true, userId }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function createEmployeeAccount(data: Record<string, string>) {
  try {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.employee_email,
      password: data.password,
      email_confirm: true,
    })

    if (authError) throw new Error(authError.message)
    const userId = authData.user.id

    // 2. Insert into employees table
    const { error: dbError } = await supabaseAdmin
      .from('employees')
      .insert({
        id: userId,
        employee_name: data.employee_name,
        employee_email: data.employee_email,
        designation: data.designation,
        phone_number: data.phone_number,
        employee_code: data.employee_code,
        joining_date: data.joining_date,
        profile_photo: data.profile_photo,
        department_id: data.department_id,
        created_by_department: data.department_id,
      })

    if (dbError) {
      // Rollback Auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(dbError.message)
    }

    // Notify the department
    await supabaseAdmin.from('notifications').insert({
      user_id: data.department_id,
      title: 'New Employee Onboarded',
      message: `${data.employee_name} (${data.employee_code}) has been added to your department${data.isAdminCreation ? ' by an Admin' : ''}.`,
      type: 'SYSTEM',
      link_url: `/department/employees/${userId}`
    })

    return { success: true, userId }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function updateDepartmentAccount(departmentId: string, data: Record<string, string>) {
  try {
    // 1. Fetch current department email
    const { data: dept, error: fetchError } = await supabaseAdmin
      .from('departments')
      .select('department_email')
      .eq('id', departmentId)
      .single()
    if (fetchError) throw new Error(fetchError.message)

    // 2. If email has changed, update Auth User email
    if (dept.department_email !== data.department_email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        departmentId,
        { email: data.department_email, email_confirm: true }
      )
      if (authError) throw new Error(authError.message)
    }

    // 3. If password has been changed (provided and non-empty), update it
    if (data.password && data.password.trim().length >= 6) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        departmentId,
        { password: data.password }
      )
      if (authError) throw new Error(authError.message)
    }

    // 4. Update department details in DB
    const { error: dbError } = await supabaseAdmin
      .from('departments')
      .update({
        department_name: data.department_name,
        department_email: data.department_email,
        department_head_name: data.department_head_name,
        department_code: data.department_code,
        check_in_cutoff_time: data.check_in_cutoff_time || '09:30:00',
      })
      .eq('id', departmentId)

    if (dbError) throw new Error(dbError.message)

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}
