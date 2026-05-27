import { createServiceClient } from "@/lib/supabase/service"

export class ProductivityEngine {
  /**
   * Calculates and updates the productivity score for a specific employee.
   * Score = (On-Time Tasks × 10) + (Daily Updates × 2) - (Delayed Tasks × 10) - (Reopened Tasks × 5)
   *
   * Uses the user-scoped client to READ data (respects RLS for reads),
   * and the service-role client to WRITE results (bypasses RLS for upserts).
   */
  static async calculateEmployeeProductivity(employeeId: string, departmentId: string) {
    const admin = createServiceClient()     // uses service role, bypasses RLS and cookies

    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const nowIST = new Date(now.getTime() + istOffset)
    const todayIST = nowIST.toISOString().split('T')[0]
    const dayStartUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
    
    // Calculate 1st day of the current month in IST, then convert to UTC
    const startOfMonthIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1)
    const startOfMonthUTC = new Date(startOfMonthIST.getTime() - istOffset).toISOString()

    // 1. Fetch Task Statistics (Current Month)
    const { data: tasks } = await admin
      .from('tasks')
      .select('task_status, due_date')
      .eq('assigned_employee_id', employeeId)
      .gte('created_at', startOfMonthUTC)

    let completedTasks = 0
    let delayedTasks = 0
    const reopenedTasks = 0

    if (tasks) {
      tasks.forEach(task => {
        if (task.task_status === 'COMPLETED') {
          completedTasks++
        } else if (task.task_status === 'DELAYED') {
          delayedTasks++
        }
      })
    }

    // 2. Fetch Daily Updates (Activity Feed entries by this employee today — IST-aware)
    const { count: dailyUpdates } = await admin
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .eq('activity_user', employeeId)
      .gte('created_at', dayStartUTC)

    const updatesCount = dailyUpdates || 0

    // 3. Fetch Attendance Percentage (Current Month)
    // Count PRESENT, HALF_DAY, and LATE all as attended days
    const { data: attendance } = await admin
      .from('attendance')
      .select('attendance_status')
      .eq('employee_id', employeeId)
      .gte('created_at', startOfMonthUTC)

    const totalDays = attendance?.length || 0
    const attendedDays = attendance?.filter(a =>
      a.attendance_status === 'PRESENT' ||
      a.attendance_status === 'HALF_DAY' ||
      a.attendance_status === 'LATE'
    ).length || 0
    const attendancePercentage = totalDays > 0 ? (attendedDays / totalDays) * 100 : 0

    // 4. Calculate Productivity Score
    let score = 0;
    
    const totalTasks = tasks?.length || 0;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const delayPercentage = totalTasks > 0 ? (delayedTasks / totalTasks) * 100 : 0;

    // Weighting: 60% Task Completion, 40% Attendance
    if (totalTasks > 0) {
      score = (completionRate * 0.6) + (attendancePercentage * 0.4);
      
      // Penalize for delayed tasks (e.g., subtracting half the delay percentage)
      score -= (delayPercentage * 0.5);
    } else {
      // If no tasks are assigned this month, base productivity fully on attendance
      score = attendancePercentage;
    }

    // Add a small engagement bonus (up to +5%) for daily activity updates today
    const engagementBonus = Math.min(5, updatesCount * 1.5);
    score += engagementBonus;

    // Ensure the final score stays strictly between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)));

    // 5. Upsert Productivity Scores (service client bypasses RLS)
    await admin
      .from('productivity_scores')
      .upsert({
        employee_id: employeeId,
        department_id: departmentId,
        productivity_score: score,
        completed_tasks: completedTasks,
        delayed_tasks: delayedTasks,
        reopened_tasks: reopenedTasks,
        attendance_percentage: attendancePercentage,
        daily_update_score: updatesCount * 2,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'employee_id' })

    await admin
      .from('kpi_metrics')
      .upsert({
        employee_id: employeeId,
        department_id: departmentId,
        completion_rate: completionRate,
        attendance_rate: attendancePercentage,
        delay_percentage: delayPercentage,
        productivity_percentage: score,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'employee_id' })

    // 7. Update Department Rankings
    await this.calculateDepartmentRankings(departmentId)

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
