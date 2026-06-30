"use server"

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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

export async function updateEmployeeStatus(employeeId: string, status: 'ACTIVE' | 'INACTIVE') {
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
      return { success: false, error: "Unauthorized: Only administrators can update employee status." }
    }

    const adminClient = getSupabaseAdmin()

    // Update employees table
    const { error: dbError } = await adminClient
      .from('employees')
      .update({ account_status: status })
      .eq('id', employeeId)

    if (dbError) throw new Error(dbError.message)

    // Fetch employee details for logging
    const { data: emp } = await adminClient
      .from('employees')
      .select('employee_name, department_id')
      .eq('id', employeeId)
      .maybeSingle()

    // Write audit activity log
    await adminClient.from('activity_feed').insert({
      activity_type: status === 'INACTIVE' ? 'EMPLOYEE_DEACTIVATED' : 'EMPLOYEE_REACTIVATED',
      activity_user: employeeId,
      activity_user_name: emp?.employee_name || 'Employee',
      activity_description: `Employee account status marked as ${status} by Admin.`,
      department_id: emp?.department_id || null
    })

    revalidatePath('/admin/employees')
    revalidatePath('/department/employees')

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { success: false, error: message }
  }
}

export async function promoteToDepartmentHead(employeeId: string, targetDepartmentId: string) {
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
      return { success: false, error: "Unauthorized: Only administrators can promote employees." }
    }

    const adminClient = getSupabaseAdmin()

    // 1. Fetch employee details
    const { data: emp, error: empErr } = await adminClient
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .maybeSingle()

    if (empErr || !emp) {
      return { success: false, error: empErr?.message || "Employee not found." }
    }

    // 2. Fetch the target department details
    const { data: dept, error: deptErr } = await adminClient
      .from('departments')
      .select('*')
      .eq('id', targetDepartmentId)
      .maybeSingle()

    if (deptErr || !dept) {
      return { success: false, error: deptErr?.message || "Target department not found." }
    }

    // Clean up temporary tags from department_code and department_email if present due to a previous half-failed run
    let originalDeptCode = dept.department_code;
    if (originalDeptCode.includes('-TEMP-')) {
      originalDeptCode = originalDeptCode.split('-TEMP-')[0];
    }
    let originalDeptEmail = dept.department_email;
    const matchEmail = originalDeptEmail.match(/^temp-\d+-(.+)$/);
    if (matchEmail) {
      originalDeptEmail = matchEmail[1];
    }

    // 3. Prevent self-promotion if already head of this department
    if (dept.id === employeeId) {
      return { success: false, error: "Employee is already the department head of this department." }
    }

    // 4. Set original_head_id on old department if not set
    const originalHeadId = dept.original_head_id || dept.id;

    // 4b. Rename old department code and email to temporary to avoid unique constraint violations
    const tempCode = `${originalDeptCode}-TEMP-${Date.now()}`
    const tempEmail = `temp-${Date.now()}-${originalDeptEmail}`
    const { error: renameErr } = await adminClient
      .from('departments')
      .update({ 
        department_code: tempCode,
        department_email: tempEmail
      })
      .eq('id', targetDepartmentId)

    if (renameErr) {
      throw new Error(`Failed to temporarily rename old department: ${renameErr.message}`)
    }

    // 5. Insert new department record representing the promoted head
    const { error: insertDeptErr } = await adminClient
      .from('departments')
      .insert({
        id: employeeId,
        department_name: dept.department_name,
        department_email: emp.employee_email,
        department_head_name: emp.employee_name,
        department_code: originalDeptCode,
        profile_photo: emp.profile_photo,
        created_by_admin: user.id,
        check_in_cutoff_time: dept.check_in_cutoff_time || '09:30:00',
        status: 'ACTIVE',
        original_head_id: originalHeadId
      })

    if (insertDeptErr) {
      throw new Error(`Failed to create department head record: ${insertDeptErr.message}`)
    }

    // 6. Update references from old department ID to new department ID in all tables
    const updates = [
      { table: 'employees', column: 'department_id' },
      { table: 'employees', column: 'created_by_department' },
      { table: 'attendance', column: 'department_id' },
      { table: 'leave_requests', column: 'department_id' },
      { table: 'leave_requests', column: 'approved_by' },
      { table: 'tasks', column: 'department_id' },
      { table: 'tasks', column: 'assigned_by_department' },
      { table: 'tasks', column: 'created_by' },
      { table: 'tasks', column: 'assigned_to' },
      { table: 'logout_requests', column: 'department_id' },
      { table: 'logout_requests', column: 'approved_by_department' },
      { table: 'work_submissions', column: 'department_id' },
      { table: 'productivity_scores', column: 'department_id' },
      { table: 'kpi_metrics', column: 'department_id' },
      { table: 'rankings', column: 'department_id' },
      { table: 'announcements', column: 'department_id' },
      { table: 'notifications', column: 'user_id' }
    ]

    for (const update of updates) {
      const { table, column } = update
      const { error: updateErr } = await adminClient
        .from(table)
        .update({ [column]: employeeId })
        .eq(column, targetDepartmentId)

      if (updateErr) {
        console.warn(`Warning during promotion: Failed to update ${table}.${column}:`, updateErr)
      }
    }

    // 7. Delete the old department record
    const { error: deleteDeptErr } = await adminClient
      .from('departments')
      .delete()
      .eq('id', targetDepartmentId)

    if (deleteDeptErr) {
      console.warn("Warning: failed to delete old department record:", deleteDeptErr)
    }

    // 8. Update promoted employee profile to designate them as department head
    const { error: updateEmpProfileErr } = await adminClient
      .from('employees')
      .update({
        designation: 'Department Head',
        employee_code: `${dept.department_code}-HEAD`,
        department_id: employeeId,
        created_by_department: employeeId
      })
      .eq('id', employeeId)

    if (updateEmpProfileErr) {
      throw new Error(`Failed to update employee profile: ${updateEmpProfileErr.message}`)
    }

    // Write audit activity log
    await adminClient.from('activity_feed').insert({
      activity_type: 'ROLE_PROMOTED',
      activity_user: employeeId,
      activity_user_name: emp.employee_name,
      activity_description: `Employee ${emp.employee_name} promoted to Department Head of ${dept.department_name} by Admin.`,
      department_id: employeeId
    })

    const { revalidatePath } = require("next/cache")
    revalidatePath('/admin/employees')
    revalidatePath('/admin/departments')
    revalidatePath('/department/dashboard')

    return { success: true }
  } catch (error: any) {
    console.error("Promotion error:", error)
    return { success: false, error: error.message || String(error) }
  }
}

export async function demoteFromDepartmentHead(departmentHeadId: string) {
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
      return { success: false, error: "Unauthorized: Only administrators can demote department heads." }
    }

    const adminClient = getSupabaseAdmin()

    // 1. Fetch current department head's department record
    const { data: dept, error: deptErr } = await adminClient
      .from('departments')
      .select('*')
      .eq('id', departmentHeadId)
      .maybeSingle()

    if (deptErr || !dept) {
      return { success: false, error: deptErr?.message || "Department record not found." }
    }

    // Clean up temporary tags from department_code and department_email if present due to a previous half-failed run
    let originalDeptCode = dept.department_code;
    if (originalDeptCode.includes('-TEMP-')) {
      originalDeptCode = originalDeptCode.split('-TEMP-')[0];
    }
    let originalDeptEmail = dept.department_email;
    const matchEmail = originalDeptEmail.match(/^temp-\d+-(.+)$/);
    if (matchEmail) {
      originalDeptEmail = matchEmail[1];
    }

    const originalHeadId = dept.original_head_id || dept.id;
    const isOriginalHeadActive = (originalHeadId === departmentHeadId);

    let targetHeadId: string;
    let targetHeadName: string;
    let targetHeadEmail: string;
    let targetHeadPhoto: string | null = null;

    if (isOriginalHeadActive) {
      // If we are demoting the original head, the department becomes vacant.
      // Since departments.id references auth.users(id), we must create a placeholder auth user first.
      const tempEmail = `vacant-${originalDeptCode.toLowerCase()}-${Date.now()}@innovibe.com`
      const crypto = require("crypto")
      const tempPassword = crypto.randomBytes(16).toString("hex")
      const { data: vacantAuth, error: vacantAuthErr } = await adminClient.auth.admin.createUser({
        email: tempEmail,
        password: tempPassword,
        email_confirm: true
      })

      if (vacantAuthErr || !vacantAuth?.user) {
        throw new Error(`Failed to create vacant auth user placeholder: ${vacantAuthErr?.message || "Unknown error"}`)
      }

      targetHeadId = vacantAuth.user.id
      targetHeadName = "Vacant"
      targetHeadEmail = tempEmail
      targetHeadPhoto = null
    } else {
      // Revert back to original head
      // Fetch original department head details from employees table
      const { data: origHeadEmp, error: origHeadErr } = await adminClient
        .from('employees')
        .select('*')
        .eq('id', originalHeadId)
        .maybeSingle()

      if (origHeadErr || !origHeadEmp) {
        return { success: false, error: origHeadErr?.message || "Original department head profile not found." }
      }

      targetHeadId = originalHeadId
      targetHeadName = origHeadEmp.employee_name
      targetHeadEmail = origHeadEmp.employee_email
      targetHeadPhoto = origHeadEmp.profile_photo
    }

    // Rename old department code and email to temporary to avoid unique constraint violations
    const tempCode = `${originalDeptCode}-TEMP-${Date.now()}`
    const tempEmail = `temp-${Date.now()}-${originalDeptEmail}`
    const { error: renameErr } = await adminClient
      .from('departments')
      .update({ 
        department_code: tempCode,
        department_email: tempEmail
      })
      .eq('id', departmentHeadId)

    if (renameErr) {
      throw new Error(`Failed to temporarily rename old department: ${renameErr.message}`)
    }

    // 2. Insert original department head back into departments table
    const { error: insertDeptErr } = await adminClient
      .from('departments')
      .insert({
        id: targetHeadId,
        department_name: dept.department_name,
        department_email: targetHeadEmail,
        department_head_name: targetHeadName,
        department_code: dept.department_code,
        profile_photo: targetHeadPhoto,
        created_by_admin: user.id,
        check_in_cutoff_time: dept.check_in_cutoff_time || '09:30:00',
        status: 'ACTIVE',
        original_head_id: originalHeadId
      })

    if (insertDeptErr) {
      throw new Error(`Failed to restore active department head record: ${insertDeptErr.message}`)
    }

    // 3. Update references from current department head ID to target department head ID
    const updates = [
      { table: 'employees', column: 'department_id' },
      { table: 'employees', column: 'created_by_department' },
      { table: 'attendance', column: 'department_id' },
      { table: 'leave_requests', column: 'department_id' },
      { table: 'leave_requests', column: 'approved_by' },
      { table: 'tasks', column: 'department_id' },
      { table: 'tasks', column: 'assigned_by_department' },
      { table: 'tasks', column: 'created_by' },
      { table: 'tasks', column: 'assigned_to' },
      { table: 'logout_requests', column: 'department_id' },
      { table: 'logout_requests', column: 'approved_by_department' },
      { table: 'work_submissions', column: 'department_id' },
      { table: 'productivity_scores', column: 'department_id' },
      { table: 'kpi_metrics', column: 'department_id' },
      { table: 'rankings', column: 'department_id' },
      { table: 'announcements', column: 'department_id' },
      { table: 'notifications', column: 'user_id' }
    ]

    for (const update of updates) {
      const { table, column } = update
      const { error: updateErr } = await adminClient
        .from(table)
        .update({ [column]: targetHeadId })
        .eq(column, departmentHeadId)

      if (updateErr) {
        console.warn(`Warning during demotion: Failed to update ${table}.${column}:`, updateErr)
      }
    }

    // 4. Delete the demoted head's department record
    const { error: deleteDeptErr } = await adminClient
      .from('departments')
      .delete()
      .eq('id', departmentHeadId)

    if (deleteDeptErr) {
      console.warn("Warning: failed to delete demoted head's department record:", deleteDeptErr)
    }

    // 5. Restore demoted head's employee profile details (regular employee)
    const { error: updateDemotedProfileErr } = await adminClient
      .from('employees')
      .update({
        designation: 'Employee',
        employee_code: `EMP-${dept.department_code}-${departmentHeadId.substring(0, 4).toUpperCase()}`,
        department_id: targetHeadId,
        created_by_department: targetHeadId
      })
      .eq('id', departmentHeadId)

    if (updateDemotedProfileErr) {
      throw new Error(`Failed to restore demoted employee profile: ${updateDemotedProfileErr.message}`)
    }

    if (!isOriginalHeadActive) {
      // 6. Ensure original head profile is marked as 'Department Head'
      await adminClient
        .from('employees')
        .update({
          designation: 'Department Head',
          employee_code: `${dept.department_code}-HEAD`,
          department_id: originalHeadId,
          created_by_department: originalHeadId
        })
        .eq('id', originalHeadId)
    }

    // Write audit activity log
    await adminClient.from('activity_feed').insert({
      activity_type: 'ROLE_DEMOTED',
      activity_user: departmentHeadId,
      activity_user_name: dept.department_head_name || 'Department Head',
      activity_description: `Department Head role removed from ${dept.department_head_name || 'Department Head'}. Permissions restored to regular Employee.`,
      department_id: targetHeadId
    })

    const { revalidatePath } = require("next/cache")
    revalidatePath('/admin/employees')
    revalidatePath('/admin/departments')
    revalidatePath('/department/dashboard')

    return { success: true }
  } catch (error: any) {
    console.error("Demotion error:", error)
    return { success: false, error: error.message || String(error) }
  }
}


