"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

// Lazy getter — only creates the admin client at request time, never at build time
function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ==========================================
// 1. GET ALL DIRECTORY USERS CROSS-ROLE
// ==========================================
export async function getCrossRoleUsers() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Fetch admins
    const { data: admins, error: errAdmins } = await getSupabaseAdmin()
      .from('admins')
      .select('id, full_name, email')

    // Fetch departments
    const { data: depts, error: errDepts } = await getSupabaseAdmin()
      .from('departments')
      .select('id, department_head_name, department_email, department_name')

    // Fetch employees
    const { data: employees, error: errEmps } = await getSupabaseAdmin()
      .from('employees')
      .select('id, employee_name, employee_email, departments!department_id(department_name)')

    const allUsers: any[] = []

    if (admins) {
      admins.forEach(a => {
        allUsers.push({
          id: a.id,
          name: a.full_name || 'System Admin',
          email: a.email,
          role: 'ADMIN',
          department: 'Administration'
        })
      })
    }

    if (depts) {
      depts.forEach(d => {
        allUsers.push({
          id: d.id,
          name: d.department_head_name || 'Dept Head',
          email: d.department_email,
          role: 'DEPARTMENT',
          department: d.department_name || 'Department'
        })
      })
    }

    if (employees) {
      employees.forEach(e => {
        allUsers.push({
          id: e.id,
          name: e.employee_name || 'Employee',
          email: e.employee_email,
          role: 'EMPLOYEE',
          department: (e.departments as any)?.department_name || 'Unassigned'
        })
      })
    }

    return { success: true, users: allUsers }
  } catch (err: any) {
    return { success: false, error: err.message || String(err) }
  }
}

// ==========================================
// 2. HELPER: GET CURRENT USER INFO & ROLE
// ==========================================
export async function getCurrentUserRoleAndProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // Check admin
  const { data: adm } = await getSupabaseAdmin()
    .from('admins')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (adm) {
    return {
      success: true,
      role: 'ADMIN' as const,
      profile: {
        id: user.id,
        name: adm.full_name || 'Admin User',
        email: adm.email,
        department: 'Administration'
      }
    }
  }

  // Check department head
  const { data: dept } = await getSupabaseAdmin()
    .from('departments')
    .select('department_head_name, department_email, department_name')
    .eq('id', user.id)
    .maybeSingle()

  if (dept) {
    return {
      success: true,
      role: 'DEPARTMENT' as const,
      profile: {
        id: user.id,
        name: dept.department_head_name || 'Dept Head',
        email: dept.department_email,
        department: dept.department_name
      }
    }
  }

  // Check employee
  const { data: emp } = await getSupabaseAdmin()
    .from('employees')
    .select('employee_name, employee_email, departments!department_id(department_name)')
    .eq('id', user.id)
    .maybeSingle()

  if (emp) {
    return {
      success: true,
      role: 'EMPLOYEE' as const,
      profile: {
        id: user.id,
        name: emp.employee_name || 'Employee',
        email: emp.employee_email,
        department: (emp.departments as any)?.department_name || 'Unassigned'
      }
    }
  }

  return { success: false, error: "Profile not found" }
}

// ==========================================
// 3. CREATE COLLABORATIVE TASK
// ==========================================
export async function createCrossRoleTask(data: {
  title: string
  description: string
  assigned_to: string
  assigned_to_role: string
  priority: string
  due_date: string
  category: string
  attachments: { name: string; url: string; type: string }[]
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const profileRes = await getCurrentUserRoleAndProfile()
    if (!profileRes.success || !profileRes.role || !profileRes.profile) {
      return { success: false, error: profileRes.error || "Failed to fetch creator profile" }
    }

    const creator = profileRes.profile
    const creatorRole = profileRes.role

    // Fetch employee's department if assignee is an employee
    let targetDepartmentId = null
    if (data.assigned_to_role === 'EMPLOYEE') {
      const { data: empData } = await getSupabaseAdmin()
        .from('employees')
        .select('department_id')
        .eq('id', data.assigned_to)
        .maybeSingle()
      if (empData) {
        targetDepartmentId = empData.department_id
      }
    }

    // Ensure we have a valid department ID for SQL constraints
    let finalDeptId = targetDepartmentId
    if (!finalDeptId) {
      const { data: firstDept } = await getSupabaseAdmin()
        .from('departments')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (firstDept) {
        finalDeptId = firstDept.id
      }
    }

    // Create task using the admin/service client to ensure RLS doesn't block cross-role insertion
    const { data: task, error: insertError } = await getSupabaseAdmin()
      .from('tasks')
      .insert({
        // New columns
        title: data.title,
        description: data.description,
        created_by: user.id,
        created_by_role: creatorRole,
        assigned_to: data.assigned_to,
        assigned_to_role: data.assigned_to_role,
        department: creator.department || data.category || 'Operations',
        priority: data.priority || 'MEDIUM',
        status: 'PENDING',
        due_date: data.due_date,
        attachments: data.attachments || [],
        comments: [],

        // Old columns for backward compatibility / database constraints
        task_title: data.title,
        task_description: data.description,
        assigned_by_department: creatorRole === 'DEPARTMENT' ? user.id : finalDeptId,
        assigned_employee_id: data.assigned_to,
        department_id: finalDeptId,
        priority_level: (data.priority || 'MEDIUM') as any,
        task_status: 'PENDING'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Insert task activity log
    await getSupabaseAdmin().from('task_activity_logs').insert({
      task_id: task.id,
      action_type: 'CREATED',
      action_by: user.id,
      action_description: `Task created and assigned to ${data.assigned_to_role} by ${creator.name}.`
    })

    // Setup route-based links for notification
    const linkUrl = data.assigned_to_role === 'ADMIN' ? `/admin/tasks`
                  : data.assigned_to_role === 'DEPARTMENT' ? `/department/tasks`
                  : `/employee/tasks`

    // Notify the assignee
    await getSupabaseAdmin().from('notifications').insert({
      user_id: data.assigned_to,
      title: '📬 New Task Assigned',
      message: `You have been assigned a new task: "${data.title}" by ${creator.name} (${creatorRole})`,
      type: 'TASK',
      link_url: linkUrl
    })

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    return { success: true, taskId: task.id }
  } catch (err: any) {
    console.error("Create task error:", err)
    return { success: false, error: err.message || String(err) }
  }
}

// ==========================================
// 4. TASK STATE TRANSITIONS (ACCEPT / REJECT / CLARIFY)
// ==========================================
export async function respondToTask(
  taskId: string,
  action: 'ACCEPT' | 'REJECT' | 'CLARIFY',
  notes?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const profileRes = await getCurrentUserRoleAndProfile()
    if (!profileRes.success || !profileRes.profile) {
      return { success: false, error: "Profile not found" }
    }
    const responderName = profileRes.profile.name

    // Fetch the task
    const { data: task, error: fetchErr } = await getSupabaseAdmin()
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (fetchErr || !task) return { success: false, error: "Task not found" }

    // RLS override validation
    if (task.assigned_to !== user.id && profileRes.role !== 'ADMIN') {
      return { success: false, error: "Only the assigned user can respond to this task." }
    }

    const updates: Record<string, any> = {}
    let logMsg = ""
    let notificationTitle = ""
    let notificationMessage = ""

    if (action === 'ACCEPT') {
      updates.status = 'IN_PROGRESS'
      updates.accepted_at = new Date().toISOString()
      logMsg = `Task accepted by ${responderName}. Status changed to In Progress.`
      notificationTitle = '✅ Task Accepted'
      notificationMessage = `${responderName} has accepted the task: "${task.title || task.task_title}"`
    } else if (action === 'REJECT') {
      updates.status = 'REJECTED'
      updates.rejected_at = new Date().toISOString()
      updates.rejection_reason = notes || 'No reason provided'
      logMsg = `Task rejected by ${responderName}. Reason: ${notes || 'None'}`
      notificationTitle = '❌ Task Rejected'
      notificationMessage = `${responderName} rejected the task: "${task.title || task.task_title}" (Reason: ${notes || 'None'})`
    } else if (action === 'CLARIFY') {
      updates.clarification_requested_at = new Date().toISOString()
      updates.clarification_text = notes || 'Clarification needed'
      logMsg = `Clarification requested by ${responderName}: ${notes}`
      notificationTitle = '❓ Clarification Requested'
      notificationMessage = `${responderName} requested clarification on task: "${task.title || task.task_title}"`
    }

    const { error: updateErr } = await getSupabaseAdmin()
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    if (updateErr) throw updateErr

    // Insert task activity log
    await getSupabaseAdmin().from('task_activity_logs').insert({
      task_id: taskId,
      action_type: action,
      action_by: user.id,
      action_description: logMsg
    })

    // Setup route-based links for notification
    const creatorLinkUrl = task.created_by_role === 'ADMIN' ? `/admin/tasks`
                         : task.created_by_role === 'DEPARTMENT' ? `/department/tasks`
                         : `/employee/tasks`

    // Notify the task creator
    await getSupabaseAdmin().from('notifications').insert({
      user_id: task.created_by,
      title: notificationTitle,
      message: notificationMessage,
      type: 'TASK',
      link_url: creatorLinkUrl
    })

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    return { success: true }
  } catch (err: any) {
    console.error("Respond task error:", err)
    return { success: false, error: err.message || String(err) }
  }
}

// ==========================================
// 5. TASK COMPLETION & OTHER STATUS CHANGES
// ==========================================
export async function updateCrossRoleTaskStatus(taskId: string, nextStatus: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const profileRes = await getCurrentUserRoleAndProfile()
    if (!profileRes.success || !profileRes.profile) {
      return { success: false, error: "Profile not found" }
    }
    const changerName = profileRes.profile.name

    const { data: task, error: fetchErr } = await getSupabaseAdmin()
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (fetchErr || !task) return { success: false, error: "Task not found" }

    const updates: Record<string, any> = {
      status: nextStatus,
      updated_at: new Date().toISOString()
    }

    if (nextStatus === 'COMPLETED') {
      updates.completed_at = new Date().toISOString()
    }

    const { error: updateErr } = await getSupabaseAdmin()
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    if (updateErr) throw updateErr

    // Insert task activity log
    await getSupabaseAdmin().from('task_activity_logs').insert({
      task_id: taskId,
      action_type: 'STATUS_CHANGE',
      action_by: user.id,
      action_description: `Status updated to ${nextStatus} by ${changerName}.`
    })

    // Notify other party
    const isCreator = task.created_by === user.id
    const notifyTarget = isCreator ? task.assigned_to : task.created_by
    const notifyTargetRole = isCreator ? task.assigned_to_role : task.created_by_role

    const linkUrl = notifyTargetRole === 'ADMIN' ? `/admin/tasks`
                  : notifyTargetRole === 'DEPARTMENT' ? `/department/tasks`
                  : `/employee/tasks`

    await getSupabaseAdmin().from('notifications').insert({
      user_id: notifyTarget,
      title: `🔄 Task Status Updated: ${nextStatus}`,
      message: `The task "${task.title || task.task_title}" was marked as ${nextStatus} by ${changerName}.`,
      type: 'TASK',
      link_url: linkUrl
    })

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    return { success: true }
  } catch (err: any) {
    console.error("Update task status error:", err)
    return { success: false, error: err.message || String(err) }
  }
}

// ==========================================
// 6. ADD TASK COMMENT
// ==========================================
export async function addCrossRoleComment(
  taskId: string,
  message: string,
  attachmentUrl?: string
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const profileRes = await getCurrentUserRoleAndProfile()
    if (!profileRes.success || !profileRes.profile) {
      return { success: false, error: "Profile not found" }
    }
    const commenterName = profileRes.profile.name

    const { data: task, error: fetchErr } = await getSupabaseAdmin()
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (fetchErr || !task) return { success: false, error: "Task not found" }

    // Insert relational comment
    const { error: commentErr } = await getSupabaseAdmin()
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        message: message,
        attachment: attachmentUrl || null
      })

    if (commentErr) throw commentErr

    // Insert task activity log
    await getSupabaseAdmin().from('task_activity_logs').insert({
      task_id: taskId,
      action_type: 'COMMENT_ADDED',
      action_by: user.id,
      action_description: `${commenterName} added a comment: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`
    })

    // Notify other party
    const isCreator = task.created_by === user.id
    const notifyTarget = isCreator ? task.assigned_to : task.created_by
    const notifyTargetRole = isCreator ? task.assigned_to_role : task.created_by_role

    const linkUrl = notifyTargetRole === 'ADMIN' ? `/admin/tasks`
                  : notifyTargetRole === 'DEPARTMENT' ? `/department/tasks`
                  : `/employee/tasks`

    await getSupabaseAdmin().from('notifications').insert({
      user_id: notifyTarget,
      title: '💬 New Comment Added',
      message: `${commenterName} commented on "${task.title || task.task_title}": "${message.substring(0, 40)}${message.length > 40 ? '...' : ''}"`,
      type: 'TASK',
      link_url: linkUrl
    })

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    return { success: true }
  } catch (err: any) {
    console.error("Add comment error:", err)
    return { success: false, error: err.message || String(err) }
  }
}

// ==========================================
// 7. DELETE CROSS-ROLE TASK
// ==========================================
export async function deleteCrossRoleTask(taskId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const profileRes = await getCurrentUserRoleAndProfile()
    if (!profileRes.success || !profileRes.profile) {
      return { success: false, error: "Profile not found" }
    }

    const { data: task, error: fetchErr } = await getSupabaseAdmin()
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (fetchErr || !task) return { success: false, error: "Task not found" }

    // Deletion allowed only to Creator or Admins
    if (task.created_by !== user.id && profileRes.role !== 'ADMIN') {
      return { success: false, error: "Unauthorized: Only the task creator or system administrator can delete this task." }
    }

    const { error: deleteErr } = await getSupabaseAdmin()
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (deleteErr) throw deleteErr

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    return { success: true }
  } catch (err: any) {
    console.error("Delete task error:", err)
    return { success: false, error: err.message || String(err) }
  }
}

// ==========================================
// LEGACY COMPATIBILITY WRAPPERS
// ==========================================

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const assigned_employee_id = formData.get('assigned_employee_id') as string
  const priority = formData.get('priority') as string
  const due_date = formData.get('due_date') as string

  const res = await createCrossRoleTask({
    title,
    description,
    assigned_to: assigned_employee_id,
    assigned_to_role: 'EMPLOYEE',
    priority: priority || 'MEDIUM',
    due_date,
    category: 'Operations',
    attachments: []
  })

  if (!res.success) {
    throw new Error(res.error)
  }

  // Handle Attachments
  const rawFiles = formData.getAll('attachments') as File[]
  const files = rawFiles.filter(f => f.size > 0 && f.name)

  const supabase = await createClient()
  for (const file of files) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${res.taskId}-${Math.random()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(fileName, file)

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName)
      
      await supabase.from('task_attachments').insert({
        task_id: res.taskId,
        uploaded_by: assigned_employee_id,
        file_url: publicUrl,
        file_type: file.type || 'application/octet-stream'
      })
    }
  }

  revalidatePath('/department/tasks')
  const { redirect } = require("next/navigation")
  redirect('/department/tasks')
}

export async function updateTaskStatus(taskId: string, newStatus: string, reopenReason?: string) {
  return updateCrossRoleTaskStatus(taskId, newStatus)
}

export async function addComment(taskId: string, comment: string) {
  return addCrossRoleComment(taskId, comment)
}

export async function addTaskAttachment(taskId: string, fileUrl: string, fileType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      uploaded_by: user.id,
      file_url: fileUrl,
      file_type: fileType
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function createAdminTask(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const assigned_employee_id = formData.get('assigned_employee_id') as string
  const priority = formData.get('priority') as string
  const due_date = formData.get('due_date') as string

  const res = await createCrossRoleTask({
    title,
    description,
    assigned_to: assigned_employee_id,
    assigned_to_role: 'EMPLOYEE',
    priority: priority || 'MEDIUM',
    due_date,
    category: 'Operations',
    attachments: []
  })

  if (!res.success) {
    return { success: false, error: res.error }
  }

  revalidatePath('/admin/tasks')
  return { success: true }
}

export async function escalateTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('tasks')
    .update({ is_escalated: true })
    .eq('id', taskId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/department/tasks')
  return { success: true }
}

export async function deescalateTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('tasks')
    .update({ is_escalated: false })
    .eq('id', taskId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/tasks')
  return { success: true }
}

