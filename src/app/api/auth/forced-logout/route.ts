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

    // Check if the user is an Employee
    const { data: employee } = await adminSupabase
      .from('employees')
      .select('department_id, employee_code, employee_name')
      .eq('id', user.id)
      .maybeSingle()

    // If they are an Employee, perform forced logout reporting and check-out
    if (employee) {
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

      // Check if employee is actively checked in
      if (attendance && attendance.work_status === 'ACTIVE') {
        // Find or create active session
        const { data: activeSessions } = await adminSupabase
          .from('work_sessions')
          .select('session_id, login_time')
          .eq('user_id', user.id)
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
              user_role: 'EMPLOYEE',
              login_time: checkInTime,
              department_id: employee.department_id,
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

          // 2. Complete active session
          await adminSupabase
            .from('work_sessions')
            .update({
              logout_time: now.toISOString(),
              report_submitted: true,
              report_id: newReport?.report_id || null
            })
            .eq('session_id', activeSession.session_id)

          // 3. Complete attendance record
          const logoutTimeStr = now.toLocaleTimeString('en-US', { hour12: false })
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
            activity_user_name: employee.employee_name || 'Employee',
            activity_description: `Forced logout due to browser close.`,
            department_id: employee.department_id
          })
        }
      }
    } else {
      // Check if they are a Department Head
      const { data: dept } = await adminSupabase
        .from('departments')
        .select('id, department_name, department_head_name')
        .eq('id', user.id)
        .maybeSingle()

      if (dept) {
        const now = new Date()
        const istOffset = 5.5 * 60 * 60 * 1000
        const todayIST = new Date(now.getTime() + istOffset).toISOString().split('T')[0]
        const checkInTime = new Date(`${todayIST}T09:00:00+05:30`).toISOString()

        // Create active work session and blank report on the fly for Department Head
        const { data: activeSession } = await adminSupabase
          .from('work_sessions')
          .insert({
            user_id: user.id,
            user_name: dept.department_head_name || 'Department Head',
            user_role: 'DEPARTMENT',
            login_time: checkInTime,
            logout_time: now.toISOString(),
            department_id: dept.id,
            department: dept.department_name,
            report_submitted: true
          })
          .select('session_id')
          .single()

        if (activeSession) {
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

          if (newReport) {
            await adminSupabase
              .from('work_sessions')
              .update({
                report_id: newReport.report_id
              })
              .eq('session_id', activeSession.session_id)
          }

          // Add to Activity Feed
          await adminSupabase.from('activity_feed').insert({
            activity_type: 'LOGOUT',
            activity_user: user.id,
            activity_user_name: dept.department_head_name || 'Department Head',
            activity_description: `Forced logout due to browser close.`,
            department_id: dept.id
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
