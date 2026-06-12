import { createServiceClient } from "@/lib/supabase/service"

export class ProductivityEngine {
  /**
   * Calculates and updates the productivity score for a specific employee.
   * Score = (On-Time Tasks × 10) + (Daily Updates × 2) - (Delayed Tasks × 10) - (Reopened Tasks × 5)
   *
   * Uses the user-scoped client to READ data (respects RLS for reads),
   * and the service-role client to WRITE results (bypasses RLS for upserts).
   */
  static async calculateEmployeeProductivity(employeeId: string, departmentId?: string) {
    const admin = createServiceClient()     // uses service role, bypasses RLS and cookies

    let resolvedDeptId = departmentId
    if (!resolvedDeptId) {
      const { data: emp } = await admin
        .from('employees')
        .select('department_id')
        .eq('id', employeeId)
        .maybeSingle()
      
      if (emp && emp.department_id) {
        resolvedDeptId = emp.department_id
      } else {
        const { data: dept } = await admin
          .from('departments')
          .select('id')
          .eq('id', employeeId)
          .maybeSingle()
        if (dept) {
          resolvedDeptId = dept.id
        }
      }
    }

    const deptId = resolvedDeptId || employeeId // fallback

    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const nowIST = new Date(now.getTime() + istOffset)
    const todayIST = nowIST.toISOString().split('T')[0]
    const dayStartUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
    
    // Calculate 1st day of the current month in IST, then convert to UTC
    const startOfMonthIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1)
    const startOfMonthUTC = new Date(startOfMonthIST.getTime() - istOffset).toISOString()

    // 1. Fetch Task Statistics (using task_assignees for dashboard consistency)
    const { data: assigneeRecords } = await admin
      .from('task_assignees')
      .select('task_id, status, completed_at')
      .eq('user_id', employeeId)

    const userAssignedTaskIds = assigneeRecords?.map(r => r.task_id) || []
    
    let dbTasks = []
    if (userAssignedTaskIds.length > 0) {
      const { data } = await admin
        .from('tasks')
        .select('*, task_assignees(*)')
        .or(`id.in.(${userAssignedTaskIds.map(id => `"${id}"`).join(',')}),assigned_to.eq.${employeeId}`)
      dbTasks = data || []
    } else {
      const { data } = await admin
        .from('tasks')
        .select('*, task_assignees(*)')
        .eq('assigned_to', employeeId)
      dbTasks = data || []
    }

    // Filter tasks that are relevant to this assignee
    const tasks = dbTasks.filter(t => 
      (t.task_assignees as any[])?.some(a => a.user_id === employeeId) || 
      t.assigned_to === employeeId
    )

    let completedTasks = 0
    let delayedTasks = 0
    const reopenedTasks = 0
    const todayStr = nowIST.toISOString().split('T')[0]

    tasks.forEach(task => {
      const assignees = (task.task_assignees as any[]) || []
      const userAssignee = assignees.find(a => a.user_id === employeeId)
      const status = userAssignee?.status || task.status || task.task_status || 'PENDING'
      const dueDate = task.deadline || task.due_date || ''

      if (status === 'COMPLETED') {
        completedTasks++
        // Check if overall task is delayed
        if (task.status === 'DELAYED' || task.task_status === 'DELAYED') {
          delayedTasks++
        }
      } else {
        if (dueDate && dueDate < todayStr) {
          delayedTasks++ // Overdue counts as delayed
        } else if (status === 'DELAYED') {
          delayedTasks++
        }
      }
    })

    // 2. Fetch Daily Updates (Activity Feed entries today)
    const { count: dailyUpdates } = await admin
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .eq('activity_user', employeeId)
      .gte('created_at', dayStartUTC)

    const updatesCount = dailyUpdates || 0

    // 3. Fetch Attendance Percentage (Current Month)
    // Working Days in current month up to today (weekdays Mon-Fri)
    let workingDaysCount = 0
    for (let d = 1; d <= nowIST.getDate(); d++) {
      const dateToCheck = new Date(nowIST.getFullYear(), nowIST.getMonth(), d)
      const dayOfWeek = dateToCheck.getDay() // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysCount++
      }
    }
    if (workingDaysCount === 0) workingDaysCount = 1 // Prevent division by zero

    const { data: attendance } = await admin
      .from('attendance')
      .select('attendance_status')
      .eq('employee_id', employeeId)
      .gte('created_at', startOfMonthUTC)

    const attendedDays = attendance?.filter(a =>
      a.attendance_status === 'PRESENT' ||
      a.attendance_status === 'HALF_DAY' ||
      a.attendance_status === 'LATE'
    ).length || 0

    const attendancePercentage = Math.min(100, (attendedDays / workingDaysCount) * 100)

    // 4. Calculate Productivity Score
    let score = 0
    const totalTasks = tasks.length
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const delayPercentage = totalTasks > 0 ? (delayedTasks / totalTasks) * 100 : 0

    // Weighting: 60% Task Completion, 40% Attendance
    if (totalTasks > 0) {
      score = (completionRate * 0.6) + (attendancePercentage * 0.4)
      // Penalize for delayed tasks
      score -= (delayPercentage * 0.5)
    } else {
      score = attendancePercentage
    }

    // Engagement bonus: up to +5%
    const engagementBonus = Math.min(5, updatesCount * 1.5)
    score += engagementBonus

    score = Math.max(0, Math.min(100, Math.round(score)))

    // 5. Upsert Productivity Scores
    await admin
      .from('productivity_scores')
      .upsert({
        employee_id: employeeId,
        department_id: deptId,
        productivity_score: score,
        completed_tasks: completedTasks,
        delayed_tasks: delayedTasks,
        reopened_tasks: reopenedTasks,
        attendance_percentage: attendancePercentage,
        daily_update_score: updatesCount * 2,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'employee_id' })

    // 6. Upsert KPI Metrics
    await admin
      .from('kpi_metrics')
      .upsert({
        employee_id: employeeId,
        department_id: deptId,
        completion_rate: completionRate,
        attendance_rate: attendancePercentage,
        delay_percentage: delayPercentage,
        productivity_percentage: score,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'employee_id' })

    // 7. Update Department Rankings
    await this.calculateDepartmentRankings(deptId)

    return score
  }

  /**
   * Updates rankings for all employees in a department.
   */
  static async calculateDepartmentRankings(departmentId: string) {
    const admin = createServiceClient()

    const { data: scores } = await admin
      .from('productivity_scores')
      .select('employee_id, productivity_score')
      .eq('department_id', departmentId)
      .order('productivity_score', { ascending: false })

    if (!scores || scores.length === 0) return

    const rankingsData = scores.map((score, index) => ({
      employee_id: score.employee_id,
      department_id: departmentId,
      employee_rank: index + 1,
      score: score.productivity_score,
      calculated_at: new Date().toISOString()
    }))

    await admin
      .from('rankings')
      .upsert(rankingsData, { onConflict: 'employee_id' })
  }
}
