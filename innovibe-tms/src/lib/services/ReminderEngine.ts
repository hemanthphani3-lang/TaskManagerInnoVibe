import { createServiceClient } from "@/lib/supabase/service"

export class ReminderEngine {

  /**
   * Evaluates conditions and generates reminders for a specific employee.
   * Uses user-scoped client for reads, service client for writes.
   */
  static async evaluateEmployeeReminders(employeeId: string, departmentId: string) {
    const admin = createServiceClient()    // uses service role

    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
    const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()

    // 1. Check for Pending Tasks approaching or past deadline
    const { data: tasks } = await admin
      .from('tasks')
      .select('id, task_title, due_date, task_status')
      .eq('assigned_employee_id', employeeId)
      .in('task_status', ['PENDING', 'IN_PROGRESS'])

    if (tasks) {
      for (const task of tasks) {
        const dueDate = new Date(task.due_date)
        const diffMs = dueDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays <= 2 && diffDays >= 0) {
          await this.createReminderIfNotExists(
            admin, employeeId, departmentId,
            'DEADLINE_WARNING',
            `Task "${task.task_title}" is due in ${diffDays} day(s).`
          )
        } else if (diffMs < 0) {
          await this.createReminderIfNotExists(
            admin, employeeId, departmentId,
            'TASK_PENDING',
            `Task "${task.task_title}" is overdue!`
          )
        }
      }
    }

    // 2. Check for missing check-ins (IST 10 AM = UTC 04:30)
    const istHour = new Date(now.getTime() + istOffset).getUTCHours()
    if (istHour >= 10) {
      const { data: attendance } = await admin
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .gte('created_at', startUTC)
        .maybeSingle()

      if (!attendance) {
        await this.createReminderIfNotExists(
          admin, employeeId, departmentId,
          'ATTENDANCE_REMINDER',
          "You haven't checked in today. Please check in or request leave."
        )
      }
    }

    // 3. No Activity Updates for 24 hours
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString()
    const { count: recentActivity } = await admin
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .eq('activity_user', employeeId)
      .gte('created_at', yesterday)

    if (recentActivity === 0) {
      await this.createReminderIfNotExists(
        admin, employeeId, departmentId,
        'NO_UPDATE',
        "We haven't seen any task updates or activity from you in the last 24 hours."
      )
    }
  }

  /**
   * Inserts a reminder only if one of the same type doesn't already exist today.
   * Uses service client so the insert bypasses RLS.
   */
  private static async createReminderIfNotExists(
    admin: ReturnType<typeof createServiceClient>,
    employeeId: string,
    departmentId: string,
    type: string,
    message: string
  ) {
    const istOffset = 5.5 * 60 * 60 * 1000
    const todayIST = new Date(new Date().getTime() + istOffset).toISOString().split('T')[0]
    const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()

    // Check if similar reminder already sent today (use service client to bypass RLS on read too)
    const { data: existing } = await admin
      .from('reminders')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('reminder_type', type)
      .gte('created_at', startUTC)
      .maybeSingle()

    if (!existing) {
      await admin
        .from('reminders')
        .insert({
          employee_id: employeeId,
          department_id: departmentId,
          reminder_type: type,
          reminder_message: message,
          reminder_status: 'UNREAD',
          scheduled_time: new Date().toISOString()
        })
    }
  }
}
