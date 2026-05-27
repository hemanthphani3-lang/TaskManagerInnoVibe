"use server"

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from "@/lib/supabase/server"

// Lazy getter — only creates the admin client at request time, never at build time
function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function createDepartmentAccount(data: Record<string, string>) {
  try {
    // 1. Create Auth User
    const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
      email: data.department_email,
      password: data.password,
      email_confirm: true,
    })

    if (authError) throw new Error(authError.message)
    const userId = authData.user.id

    // 2. Insert into departments table
    const { error: dbError } = await getSupabaseAdmin()
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
      await getSupabaseAdmin().auth.admin.deleteUser(userId)
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
    const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
      email: data.employee_email,
      password: data.password,
      email_confirm: true,
    })

    if (authError) throw new Error(authError.message)
    const userId = authData.user.id

    // 2. Insert into employees table
    const { error: dbError } = await getSupabaseAdmin()
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
      await getSupabaseAdmin().auth.admin.deleteUser(userId)
      throw new Error(dbError.message)
    }

    // Notify the department
    await getSupabaseAdmin().from('notifications').insert({
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

export async function deleteEmployeeAccount(employeeId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify user is an Admin
    const { data: adminCheck } = await getSupabaseAdmin()
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!adminCheck) {
      return { success: false, error: "Unauthorized: Only administrators can delete employee profiles." }
    }

    // 1. Delete employee record from DB
    const { error: dbError } = await getSupabaseAdmin()
      .from('employees')
      .delete()
      .eq('id', employeeId)

    if (dbError) throw new Error(dbError.message)

    // 2. Delete employee auth user from Supabase Auth
    const { error: authError } = await getSupabaseAdmin().auth.admin.deleteUser(employeeId)
    if (authError) throw new Error(authError.message)

    const { revalidatePath } = require("next/cache")
    revalidatePath('/admin/employees')

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}
