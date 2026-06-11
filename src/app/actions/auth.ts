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

    // 3. Sync Department Head to employees table
    const { error: empError } = await getSupabaseAdmin()
      .from('employees')
      .insert({
        id: userId,
        employee_name: data.department_head_name,
        employee_email: data.department_email,
        designation: 'Department Head',
        employee_code: `${data.department_code}-HEAD`,
        profile_photo: data.profile_photo,
        department_id: userId,
        created_by_department: userId
      })

    if (empError) {
      // Rollback Auth user and department record if employee insert fails
      await getSupabaseAdmin().from('departments').delete().eq('id', userId)
      await getSupabaseAdmin().auth.admin.deleteUser(userId)
      throw new Error(empError.message)
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

    const adminClient = getSupabaseAdmin()

    // 1. Clean up dependent records that do not have ON DELETE CASCADE
    // Delete work submissions
    const { error: workErr } = await adminClient
      .from('work_submissions')
      .delete()
      .eq('employee_id', employeeId)
    if (workErr) console.warn("Work submissions deletion warning:", workErr)

    // Delete logout requests
    const { error: logoutErr } = await adminClient
      .from('logout_requests')
      .delete()
      .eq('employee_id', employeeId)
    if (logoutErr) console.warn("Logout requests deletion warning:", logoutErr)

    // Delete tasks (this cascades to task comments, attachments, logs)
    const { error: taskErr } = await adminClient
      .from('tasks')
      .delete()
      .eq('assigned_employee_id', employeeId)
    if (taskErr) console.warn("Tasks deletion warning:", taskErr)

    // 2. Delete employee record from DB (this cascades to attendance, leave_requests, kpis, etc.)
    const { error: dbError } = await adminClient
      .from('employees')
      .delete()
      .eq('id', employeeId)

    if (dbError) throw new Error(dbError.message)

    // 3. Delete employee auth user from Supabase Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(employeeId)
    if (authError) {
      console.warn("Auth delete employee warning (might not have auth user):", authError)
    }

    const { revalidatePath } = require("next/cache")
    revalidatePath('/admin/employees')

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function sendForgotPasswordRequest(email: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Fetch all admins
    const { data: admins, error: fetchError } = await supabaseAdmin
      .from('admins')
      .select('id')
      
    if (fetchError) throw fetchError

    if (admins && admins.length > 0) {
      // Send a notification to each admin
      for (const admin of admins) {
        await supabaseAdmin.from('notifications').insert({
          user_id: admin.id,
          title: '🔑 Forgot Password Request',
          message: `A user has requested a password reset. Email ID: ${email || 'Unknown User'}`,
          type: 'SYSTEM',
          link_url: '/admin/dashboard'
        })
      }
    }
    
    return { success: true }
  } catch (error: any) {
    console.error("Forgot password request error:", error)
    return { success: false, error: error.message || String(error) }
  }
}

export async function deleteDepartmentAccount(departmentId: string) {
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
      return { success: false, error: "Unauthorized: Only administrators can delete departments." }
    }

    const adminClient = getSupabaseAdmin()

    // 1. Fetch all employees in this department to clean up their dependents and delete them
    const { data: emps } = await adminClient
      .from('employees')
      .select('id')
      .eq('department_id', departmentId)

    if (emps && emps.length > 0) {
      const empIds = emps.map(emp => emp.id)

      // Clean up dependents for all employees of the department
      await adminClient.from('work_submissions').delete().in('employee_id', empIds)
      await adminClient.from('logout_requests').delete().in('employee_id', empIds)
      await adminClient.from('tasks').delete().in('assigned_employee_id', empIds)

      // Delete employee records from DB (cascades to attendance, leave_requests, kpi_metrics, etc.)
      await adminClient.from('employees').delete().in('id', empIds)

      // Delete Auth users for all department employees
      for (const empId of empIds) {
        try {
          await adminClient.auth.admin.deleteUser(empId)
        } catch (e) {
          console.error("Auth delete department employee warning:", e)
        }
      }
    }

    // 2. Clean up department-level dependents
    // Delete any remaining tasks created by or assigned to the department directly
    await adminClient.from('tasks').delete().eq('department_id', departmentId)
    await adminClient.from('tasks').delete().eq('assigned_by_department', departmentId)

    // Delete work submissions & logout requests of the department directly just in case
    await adminClient.from('work_submissions').delete().eq('department_id', departmentId)
    await adminClient.from('logout_requests').delete().eq('department_id', departmentId)

    // 3. Delete department from DB
    const { error: dbError } = await adminClient
      .from('departments')
      .delete()
      .eq('id', departmentId)

    if (dbError) throw new Error(dbError.message)

    // 4. Delete department head auth user from Supabase Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(departmentId)
    if (authError) {
      console.warn("Auth delete dept head warning (might not have auth user):", authError)
    }

    const { revalidatePath } = require("next/cache")
    revalidatePath('/admin/departments')

    return { success: true }
  } catch (err: any) {
    console.error("Delete department error:", err)
    return { success: false, error: err.message || String(err) }
  }
}
