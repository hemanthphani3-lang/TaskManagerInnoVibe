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

async function broadcastTaskCounts() {
  try {
    const adminSupabase = getSupabaseAdmin();
    const channel = adminSupabase.channel('public:tasks_counts');
    await new Promise<void>((resolve) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'counts_update',
            payload: {}
          });
          resolve();
        } else {
          // Resolve anyway on error status to prevent hanging
          resolve();
        }
      });
    });
  } catch (err) {
    console.error('Failed to broadcast task counts:', err);
  }
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
        if (a.id !== user.id) {
          allUsers.push({
            id: a.id,
            name: a.full_name || 'System Admin',
            email: a.email,
            role: 'ADMIN',
            department: 'Administration'
          })
        }
      })
    }

    if (depts) {
      depts.forEach(d => {
        if (d.id !== user.id) {
          allUsers.push({
            id: d.id,
            name: d.department_head_name || 'Dept Head',
            email: d.department_email,
            role: 'DEPARTMENT',
            department: d.department_name || 'Department'
          })
        }
      })
    }

    if (employees) {
      employees.forEach(e => {
        if (e.id !== user.id) {
          allUsers.push({
            id: e.id,
            name: e.employee_name || 'Employee',
            email: e.employee_email,
            role: 'EMPLOYEE',
            department: (e.departments as any)?.department_name || 'Unassigned'
          })
        }
      })
    }

    return { success: true, users: allUsers }
  } catch (err: any) {
    console.error("CRITICAL ERROR inside getCrossRoleUsers action:", err);
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
  assigned_to: string | string[]
  assigned_to_role: string
  priority: string
  due_date: string
  deadline?: string
  category: string
  attachments: any[]
  attachment_urls?: any[]
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Validate target due date/deadline is not in the past
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`
    const targetDate = data.due_date || data.deadline
    if (targetDate && targetDate < todayStr) {
      return { success: false, error: "The deadline/due date cannot be in the past. Please select today or a future date." }
    }

    const profileRes = await getCurrentUserRoleAndProfile()
    if (!profileRes.success || !profileRes.role || !profileRes.profile) {
      return { success: false, error: profileRes.error || "Failed to fetch creator profile" }
    }

    const creator = profileRes.profile
    const creatorRole = profileRes.role

    let assigneeIds = Array.isArray(data.assigned_to)
      ? data.assigned_to
      : (typeof data.assigned_to === 'string' && data.assigned_to ? data.assigned_to.split(',').map(s => s.trim()).filter(Boolean) : [])

    // Filter out the creator (self) from the assignees list
    assigneeIds = assigneeIds.filter(id => id !== user.id)

    if (assigneeIds.length === 0) {
      return { success: false, error: "You cannot assign a task to yourself." }
    }

    const primaryAssigneeId = assigneeIds[0]

    // Fetch employee's department if assignee is an employee
    let targetDepartmentId = null
    let actualAssignedToRole = data.assigned_to_role
    let actualAssignedEmployeeId = null

    const { data: empData } = await getSupabaseAdmin()
      .from('employees')
      .select('department_id')
      .eq('id', primaryAssigneeId)
      .maybeSingle()

    if (empData) {
      targetDepartmentId = empData.department_id
      actualAssignedToRole = 'EMPLOYEE'
      actualAssignedEmployeeId = primaryAssigneeId
    } else {
      // Check if it is a department head
      const { data: deptData } = await getSupabaseAdmin()
        .from('departments')
        .select('id')
        .eq('id', primaryAssigneeId)
        .maybeSingle()
      if (deptData) {
        targetDepartmentId = deptData.id
        actualAssignedToRole = 'DEPARTMENT'
      }
      actualAssignedEmployeeId = null // Set to null to prevent foreign key constraint violations
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
        assigned_to: primaryAssigneeId,
        assigned_to_role: actualAssignedToRole,
        department: creator.department || data.category || 'Operations',
        priority: data.priority || 'MEDIUM',
        status: 'PENDING',
        due_date: data.due_date,
        // New fields
        deadline: data.deadline,
        attachments: data.attachments || [],
        attachment_urls: data.attachment_urls || [],
        comments: [],

        // Old columns for backward compatibility / database constraints
        task_title: data.title,
        task_description: data.description,
        assigned_by_department: creatorRole === 'DEPARTMENT' ? user.id : finalDeptId,
        assigned_employee_id: actualAssignedEmployeeId,
        department_id: finalDeptId,
        priority_level: (data.priority || 'MEDIUM') as any,
        task_status: 'PENDING'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Insert task assignees
    const assigneeInserts = assigneeIds.map(uid => ({
      task_id: task.id,
      user_id: uid,
      status: 'PENDING'
    }))

    const { error: assError } = await getSupabaseAdmin()
      .from('task_assignees')
      .insert(assigneeInserts)

    if (assError) {
      console.error("Failed to insert task assignees:", assError.message)
    }

    // Insert task activity log
    await getSupabaseAdmin().from('task_activity_logs').insert({
      task_id: task.id,
      action_type: 'CREATED',
      action_by: user.id,
      action_description: `Task created and assigned to ${assigneeIds.length} collaborators by ${creator.name}.`
    })

    // Setup route-based links for notification
    const linkUrl = data.assigned_to_role === 'ADMIN' ? `/admin/tasks`
                  : data.assigned_to_role === 'DEPARTMENT' ? `/department/tasks`
                  : `/employee/tasks`

    // Notify all collaborators
    const notificationInserts = assigneeIds.map(uid => ({
      user_id: uid,
      title: '📬 New Task Assigned',
      message: `You have been added to Task: "${data.title}" by ${creator.name} (${creatorRole})`,
      type: 'TASK',
      link_url: linkUrl
    }))

    await getSupabaseAdmin().from('notifications').insert(notificationInserts)

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    // Broadcast realtime updates for dashboard task counts
    await broadcastTaskCounts()

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

    // Check if user is one of the collaborators
    const { data: assigneeRecord } = await getSupabaseAdmin()
      .from('task_assignees')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!assigneeRecord && profileRes.role !== 'ADMIN') {
      return { success: false, error: "Only the assigned users can respond to this task." }
    }

    const targetUserId = assigneeRecord ? user.id : task.assigned_to

    let logMsg = ""
    let notificationTitle = ""
    let notificationMessage = ""
    let nextAssigneeStatus = 'PENDING'

    if (action === 'ACCEPT') {
      nextAssigneeStatus = 'ACCEPTED'
      logMsg = `Task accepted by ${responderName}.`
      notificationTitle = '✅ Task Accepted'
      notificationMessage = `${responderName} has accepted the task: "${task.title || task.task_title}"`
    } else if (action === 'REJECT') {
      nextAssigneeStatus = 'BLOCKED'
      logMsg = `Task marked as blocked by ${responderName}. Reason: ${notes || 'None'}`
      notificationTitle = '❌ Task Blocked'
      notificationMessage = `${responderName} marked task as blocked: "${task.title || task.task_title}" (Reason: ${notes || 'None'})`
    } else if (action === 'CLARIFY') {
      nextAssigneeStatus = 'PENDING'
      logMsg = `Clarification requested by ${responderName}: ${notes}`
      notificationTitle = '❓ Clarification Requested'
      notificationMessage = `${responderName} requested clarification on task: "${task.title || task.task_title}"`
    }

    // Update assignee status in task_assignees
    const assigneeUpdates: Record<string, any> = {
      status: nextAssigneeStatus
    }
    if (action === 'ACCEPT') {
      assigneeUpdates.accepted_at = new Date().toISOString()
    }

    const { error: updateAssigneeErr } = await getSupabaseAdmin()
      .from('task_assignees')
      .update(assigneeUpdates)
      .eq('task_id', taskId)
      .eq('user_id', targetUserId)

    if (updateAssigneeErr) throw updateAssigneeErr

    // Recalculate overall status
    await recalculateAndUpdateTaskOverallStatus(taskId)

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

    // Notify remaining collaborators
    const { data: otherAssignees } = await getSupabaseAdmin()
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId)
      .neq('user_id', user.id)

    if (otherAssignees && otherAssignees.length > 0) {
      const notificationInserts = otherAssignees.map(oa => ({
        user_id: oa.user_id,
        title: notificationTitle,
        message: `${responderName} updated status on "${task.title || task.task_title}": ${logMsg}`,
        type: 'TASK',
        link_url: `/employee/tasks`
      }))
      await getSupabaseAdmin().from('notifications').insert(notificationInserts)
    }

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    // Broadcast realtime updates for dashboard task counts
    await broadcastTaskCounts()

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

    // Check if user is an assignee
    const { data: assigneeRecord } = await getSupabaseAdmin()
      .from('task_assignees')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (assigneeRecord) {
      const assUpdates: Record<string, any> = {
        status: nextStatus
      }
      if (nextStatus === 'COMPLETED') {
        assUpdates.completed_at = new Date().toISOString()
      } else if (nextStatus === 'IN_PROGRESS' && !assigneeRecord.accepted_at) {
        assUpdates.accepted_at = new Date().toISOString()
      }

      const { error: assErr } = await getSupabaseAdmin()
        .from('task_assignees')
        .update(assUpdates)
        .eq('id', assigneeRecord.id)

      if (assErr) throw assErr

      // Insert task activity log
      await getSupabaseAdmin().from('task_activity_logs').insert({
        task_id: taskId,
        action_type: 'STATUS_CHANGE',
        action_by: user.id,
        action_description: `${changerName} marked their portion as ${nextStatus}.`
      })

      // Recalculate overall status
      await recalculateAndUpdateTaskOverallStatus(taskId)

      // Notify task creator
      if (task.created_by !== user.id) {
        await getSupabaseAdmin().from('notifications').insert({
          user_id: task.created_by,
          title: `🔄 Task Status Updated: ${nextStatus}`,
          message: `${changerName} marked their portion as ${nextStatus} on task "${task.title || task.task_title}".`,
          type: 'TASK',
          link_url: task.created_by_role === 'ADMIN' ? `/admin/tasks` : task.created_by_role === 'DEPARTMENT' ? `/department/tasks` : `/employee/tasks`
        })
      }

      // Notify remaining collaborators
      const { data: otherAssignees } = await getSupabaseAdmin()
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', taskId)
        .neq('user_id', user.id)

      if (otherAssignees && otherAssignees.length > 0) {
        const notificationInserts = otherAssignees.map(oa => ({
          user_id: oa.user_id,
          title: `🔄 Collaborator Progress Update`,
          message: `${changerName} marked their portion as ${nextStatus} on task "${task.title || task.task_title}".`,
          type: 'TASK',
          link_url: `/employee/tasks`
        }))
        await getSupabaseAdmin().from('notifications').insert(notificationInserts)
      }
    } else {
      // If user is not assignee (e.g. creator or admin), update overall status directly
      const updates: Record<string, any> = {
        status: nextStatus,
        task_status: nextStatus,
        updated_at: new Date().toISOString()
      }
      if (nextStatus === 'COMPLETED') {
        updates.completed_at = new Date().toISOString()
      }

      const { error: taskErr } = await getSupabaseAdmin()
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (taskErr) throw taskErr

      // Update all assignees to match if completed
      if (nextStatus === 'COMPLETED') {
        await getSupabaseAdmin()
          .from('task_assignees')
          .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
          .eq('task_id', taskId)
      }

      await getSupabaseAdmin().from('task_activity_logs').insert({
        task_id: taskId,
        action_type: 'STATUS_CHANGE',
        action_by: user.id,
        action_description: `Task overall status updated to ${nextStatus} by ${changerName}.`
      })

      // Notify all assignees
      const { data: allAssignees } = await getSupabaseAdmin()
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', taskId)

      if (allAssignees && allAssignees.length > 0) {
        const notificationInserts = allAssignees.map(a => ({
          user_id: a.user_id,
          title: `🔄 Task Overall Status Updated: ${nextStatus}`,
          message: `The overall status of task "${task.title || task.task_title}" was updated to ${nextStatus} by ${changerName}.`,
          type: 'TASK',
          link_url: `/employee/tasks`
        }))
        await getSupabaseAdmin().from('notifications').insert(notificationInserts)
      }
    }

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    // Broadcast realtime updates for dashboard task counts
    await broadcastTaskCounts()

    return { success: true }
  } catch (err: any) {
    console.error("Update task status error:", err)
    return { success: false, error: err.message || String(err) }
  }
}

// ==========================================
// 5.5 RECALCULATE & UPDATE OVERALL STATUS
// ==========================================
export async function recalculateAndUpdateTaskOverallStatus(taskId: string) {
  try {
    const { data: assignees, error } = await getSupabaseAdmin()
      .from('task_assignees')
      .select('status, completed_at')
      .eq('task_id', taskId)

    if (error || !assignees || assignees.length === 0) return

    const { data: task } = await getSupabaseAdmin()
      .from('tasks')
      .select('due_date, deadline, status')
      .eq('id', taskId)
      .single()

    if (!task) return

    let overallStatus = 'PENDING'
    
    const todayStr = new Date().toISOString().split('T')[0]
    const isDeadlinePassed = (task.deadline || task.due_date) && (task.deadline || task.due_date) < todayStr

    const allCompleted = assignees.every(a => a.status === 'COMPLETED')
    const atLeastOneStarted = assignees.some(a => ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].includes(a.status))

    if (allCompleted) {
      overallStatus = 'COMPLETED'
    } else if (isDeadlinePassed) {
      overallStatus = 'OVERDUE'
    } else if (atLeastOneStarted) {
      overallStatus = 'IN_PROGRESS'
    } else {
      overallStatus = 'PENDING'
    }

    const updates: Record<string, any> = {
      status: overallStatus,
      task_status: overallStatus
    }

    if (overallStatus === 'COMPLETED') {
      updates.completed_at = new Date().toISOString()
    }

    await getSupabaseAdmin()
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    // Broadcast counts update
    await broadcastTaskCounts()
  } catch (err) {
    console.error("Error recalculating overall status:", err)
  }
}

// ==========================================
// 5.6 SUBTASK SYSTEM ACTIONS
// ==========================================
export async function createSubtask(taskId: string, title: string, assignedTo?: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: subtask, error } = await getSupabaseAdmin()
      .from('task_subtasks')
      .insert({
        task_id: taskId,
        title: title,
        assigned_to: assignedTo || null,
        is_completed: false
      })
      .select()
      .single()

    if (error) throw error

    await getSupabaseAdmin().from('task_activity_logs').insert({
      task_id: taskId,
      action_type: 'SUBTASK_ADDED',
      action_by: user.id,
      action_description: `Subtask "${title}" was created.`
    })

    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    // Broadcast realtime updates for dashboard task counts
    await broadcastTaskCounts()

    return { success: true, subtask }
  } catch (err: any) {
    console.error("Create subtask error:", err)
    return { success: false, error: err.message || String(err) }
  }
}

export async function toggleSubtask(subtaskId: string, isCompleted: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: subtask } = await getSupabaseAdmin()
      .from('task_subtasks')
      .select('*')
      .eq('id', subtaskId)
      .single()

    if (!subtask) return { success: false, error: "Subtask not found" }

    const { error } = await getSupabaseAdmin()
      .from('task_subtasks')
      .update({ is_completed: isCompleted })
      .eq('id', subtaskId)

    if (error) throw error

    await getSupabaseAdmin().from('task_activity_logs').insert({
      task_id: subtask.task_id,
      action_type: 'SUBTASK_TOGGLED',
      action_by: user.id,
      action_description: `Subtask "${subtask.title}" marked as ${isCompleted ? 'completed' : 'incomplete'}.`
    })

    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    // Broadcast realtime updates for dashboard task counts
    await broadcastTaskCounts()

    return { success: true }
  } catch (err: any) {
    console.error("Toggle subtask error:", err)
    return { success: false, error: err.message || String(err) }
  }
}

export async function deleteSubtask(subtaskId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: subtask } = await getSupabaseAdmin()
      .from('task_subtasks')
      .select('*')
      .eq('id', subtaskId)
      .single()

    if (!subtask) return { success: false, error: "Subtask not found" }

    const { error } = await getSupabaseAdmin()
      .from('task_subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) throw error

    await getSupabaseAdmin().from('task_activity_logs').insert({
      task_id: subtask.task_id,
      action_type: 'SUBTASK_DELETED',
      action_by: user.id,
      action_description: `Subtask "${subtask.title}" was deleted.`
    })

    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    // Broadcast realtime updates for dashboard task counts
    await broadcastTaskCounts()

    return { success: true }
  } catch (err: any) {
    console.error("Delete subtask error:", err)
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

    // Fetch all assignees of this task to notify
    const { data: assignees } = await getSupabaseAdmin()
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId)

    const notifyUserIds = new Set<string>()
    if (assignees) {
      assignees.forEach(a => {
        if (a.user_id !== user.id) {
          notifyUserIds.add(a.user_id)
        }
      })
    }
    if (task.created_by !== user.id) {
      notifyUserIds.add(task.created_by)
    }

    if (notifyUserIds.size > 0) {
      const notificationInserts = Array.from(notifyUserIds).map(targetId => ({
        user_id: targetId,
        title: '💬 New Comment Added',
        message: `${commenterName} commented on "${task.title || task.task_title}": "${message.substring(0, 40)}${message.length > 40 ? '...' : ''}"`,
        type: 'TASK',
        link_url: `/employee/tasks`
      }))
      await getSupabaseAdmin().from('notifications').insert(notificationInserts)
    }

    // Revalidate paths
    revalidatePath('/admin/tasks')
    revalidatePath('/department/tasks')
    revalidatePath('/employee/tasks')

    // Broadcast realtime updates for dashboard task counts
    await broadcastTaskCounts()

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

    // Broadcast realtime updates for dashboard task counts
    await broadcastTaskCounts()

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
  const assigned_employee_ids = formData.getAll('assigned_employee_id') as string[]
  const priority = formData.get('priority') as string
  const due_date = formData.get('due_date') as string

  const res = await createCrossRoleTask({
    title,
    description,
    assigned_to: assigned_employee_ids,
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

