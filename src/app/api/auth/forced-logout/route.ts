import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // If no user is logged in, return success since there is nothing to force logout
    if (!user) {
      return NextResponse.json({ success: true, message: "No active user session." })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if the user is an Employee/Department Head
    const { data: employee } = await adminSupabase
      .from('employees')
      .select('department_id, employee_code, employee_name, designation')
      .eq('id', user.id)
      .maybeSingle()

    // If they are an Employee/Department Head, perform forced logout reporting and check-out
    if (employee) {
      const isDeptHead = employee.designation === 'Department Head'
      const role = isDeptHead ? 'DEPARTMENT' : 'EMPLOYEE'

      // Get today's attendance record (IST-aware)
      const now = new Date()
      const istOffset = 5.5 * 60 * 60 * 1000
      const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
      const startUTC = new Date(`${todayIST}T00:00:00+05:30`).toISOString()
      const endUTC = new Date(`${todayIST}T23:59:59+05:30`).toISOString()

      const { data: attendances } = await adminSupabase
        .from('attendance')
        .select('id, check_in_time, work_status')
        .eq('employee_id', user.id)
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
        .order('created_at', { ascending: false })
        .limit(1)

      const attendance = attendances?.[0]

      // Check if user is actively checked in
      if (attendance && attendance.work_status === 'ACTIVE') {
        // Find or create active session
        const { data: activeSessions } = await adminSupabase
          .from('work_sessions')
          .select('session_id, login_time')
          .eq('user_id', user.id)
          .eq('status', 'ACTIVE')
          .is('logout_time', null)
          .order('login_time', { ascending: false })
          .limit(1)

        let activeSession: any = activeSessions?.[0]

        if (!activeSession) {
          const checkInTime = attendance.check_in_time || now.toISOString()
          const { data: newSess } = await adminSupabase
            .from('work_sessions')
            .insert({
              user_id: user.id,
              user_name: employee.employee_name || 'Employee',
              user_role: role,
              login_time: checkInTime,
              department_id: employee.department_id,
              status: 'ACTIVE',
              report_submitted: false
            })
            .select('session_id, login_time')
            .single()
          activeSession = newSess
        }

        if (activeSession) {
          // 1. Create Blank Report indicating forced logout
          const { data: newReport } = await adminSupabase
            .from('logout_reports')
            .insert({
              session_id: activeSession.session_id,
              user_id: user.id,
              summary: "No report was sent due to forced logout.",
              completed_tasks: "",
              pending_tasks: "",
              blockers: "",
              notes: "System-generated report due to user closing browser without logging out.",
              attachments: [],
              time_spent_notes: "",
              submitted_at: now.toISOString()
            })
            .select('report_id')
            .single()

          // Calculate duration
          const loginTimeObj = new Date(activeSession.login_time)
          const durationMs = now.getTime() - loginTimeObj.getTime()
          const durationHrs = Math.floor(durationMs / (1000 * 60 * 60))
          const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
          const durationStr = `${durationHrs}h ${durationMins}m`

          // 2. Complete active session
          await adminSupabase
            .from('work_sessions')
            .update({
              logout_time: now.toISOString(),
              duration: durationStr,
              status: 'COMPLETED',
              report_submitted: true,
              report_id: newReport?.report_id || null
            })
            .eq('session_id', activeSession.session_id)

          // 3. Complete attendance record
          const logoutTimeStr = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' })
          await adminSupabase
            .from('attendance')
            .update({
              logout_time: logoutTimeStr,
              work_status: 'LOGGED_OUT'
            })
            .eq('id', attendance.id)

          // 4. Add to Activity Feed
          await adminSupabase.from('activity_feed').insert({
            activity_type: 'LOGOUT',
            activity_user: user.id,
            activity_user_name: employee.employee_name || (isDeptHead ? 'Department Head' : 'Employee'),
            activity_description: `Forced logout due to browser close.`,
            department_id: employee.department_id
          })
        }
      }
    }

    // Sign out user on the client (clears authentication cookies)
    await supabase.auth.signOut()

    return NextResponse.json({ success: true, message: "Forced logout successful." })
  } catch (err: any) {
    console.error("Forced logout error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
