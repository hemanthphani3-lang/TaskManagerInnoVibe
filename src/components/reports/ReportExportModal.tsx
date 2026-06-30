'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ExportTypeSelector, ExportFormat } from './ExportTypeSelector'
import { DateRangeSelector, DateRangeType } from './DateRangeSelector'

type ReportType = 'ATTENDANCE' | 'PRODUCTIVITY' | 'TASKS'

interface ReportExportModalProps {
  role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE'
  departmentId?: string
  employeeId?: string
}

export function ReportExportModal({ role, departmentId, employeeId }: ReportExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('PDF')
  const [type, setType] = useState<ReportType>('ATTENDANCE')
  const [dateRange, setDateRange] = useState<DateRangeType>('30D')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [validationError, setValidationError] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Options lists
  const [departmentsList, setDepartmentsList] = useState<any[]>([])
  const [employeesList, setEmployeesList] = useState<any[]>([])
  const [isOptionsLoading, setIsOptionsLoading] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)

  // Dynamic filter selections
  const [employeeSelectType, setEmployeeSelectType] = useState<string>('ALL')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')
  const [assignmentType, setAssignmentType] = useState<string>('ALL')
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('')

  const supabase = createClient()

  // Load departments and employees based on role
  useEffect(() => {
    let isMounted = true
    const loadOptions = async () => {
      setIsOptionsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !isMounted) return

        if (role === 'ADMIN') {
          let empQuery = supabase.from('employees').select('id, employee_name, employee_email, department_id, designation, account_status').order('employee_name')
          if (!includeInactive) {
            empQuery = empQuery.eq('account_status', 'ACTIVE')
          }
          const [deptsRes, empsRes] = await Promise.all([
            supabase.from('departments').select('id, department_name').eq('status', 'ACTIVE').order('department_name'),
            empQuery
          ])
          if (isMounted) {
            setDepartmentsList(deptsRes.data || [])
            setEmployeesList((empsRes.data || [])
              .filter(emp => emp.employee_name && emp.employee_name.trim() !== '' && emp.employee_name.trim() !== '-')
              .map(emp => ({
                id: emp.id,
                full_name: emp.employee_name,
                email: emp.employee_email,
                department_id: emp.department_id,
                designation: emp.designation
              })))
          }
        } else if (role === 'DEPARTMENT') {
          const activeDeptId = departmentId || user.id
          let empQuery = supabase.from('employees').select('id, employee_name, employee_email, department_id, designation, account_status').eq('department_id', activeDeptId).order('employee_name')
          if (!includeInactive) {
            empQuery = empQuery.eq('account_status', 'ACTIVE')
          }
          const [deptsRes, empsRes] = await Promise.all([
            supabase.from('departments').select('id, department_name').eq('id', activeDeptId).eq('status', 'ACTIVE').maybeSingle(),
            empQuery
          ])
          if (isMounted) {
            if (deptsRes.data) setDepartmentsList([deptsRes.data])
            setEmployeesList((empsRes.data || [])
              .filter(emp => emp.employee_name && emp.employee_name.trim() !== '' && emp.employee_name.trim() !== '-' && emp.designation !== 'Department Head')
              .map(emp => ({
                id: emp.id,
                full_name: emp.employee_name,
                email: emp.employee_email,
                department_id: emp.department_id,
                designation: emp.designation
              })))
          }
        }
      } catch (err) {
        console.error("Error loading options:", err)
      } finally {
        if (isMounted) setIsOptionsLoading(false)
      }
    }

    loadOptions()
    return () => {
      isMounted = false
    }
  }, [role, departmentId, includeInactive])

  // Reset filter selection when type changes
  useEffect(() => {
    setSelectedEmployeeIds([])
    setSelectedDepartmentId('')
    setValidationError('')
    setEmployeeSearchQuery('')

    if (type === 'ATTENDANCE') {
      setEmployeeSelectType(role === 'ADMIN' ? 'ALL' : role === 'DEPARTMENT' ? 'ME' : 'ME')
    } else if (type === 'PRODUCTIVITY') {
      setEmployeeSelectType(role === 'ADMIN' ? 'ALL' : role === 'DEPARTMENT' ? 'ALL' : 'ME')
    } else if (type === 'TASKS') {
      setAssignmentType('ALL')
      setEmployeeSelectType('ALL')
    }
  }, [type, role])

  // Reset selection type when assignment type changes under Tasks
  useEffect(() => {
    if (type === 'TASKS') {
      setSelectedEmployeeIds([])
      setSelectedDepartmentId('')
      setEmployeeSearchQuery('')
      if (assignmentType === 'EMP') {
        setEmployeeSelectType('SINGLE')
      } else {
        setEmployeeSelectType('ALL')
      }
    }
  }, [assignmentType, type])

  const validateSelection = (): boolean => {
    if (dateRange === 'CUSTOM') {
      if (!startDate || !endDate) {
        toast.error("Please select both start and end dates.")
        return false
      }
      if (startDate > endDate) {
        toast.error("Start date cannot be after end date.")
        return false
      }
    }
    if (dateRange === 'SPECIFIC' && !startDate) {
      toast.error("Please select a date.")
      return false
    }

    // Role-based validations
    if (role === 'ADMIN' || role === 'DEPARTMENT') {
      if (type === 'ATTENDANCE' || type === 'PRODUCTIVITY' || (type === 'TASKS' && assignmentType === 'EMP')) {
        if (employeeSelectType === 'SINGLE' && selectedEmployeeIds.length === 0) {
          toast.error("Please select an employee.")
          return false
        }
        if (employeeSelectType === 'MULTIPLE' && selectedEmployeeIds.length === 0) {
          toast.error("Please select at least one employee.")
          return false
        }
        if (employeeSelectType === 'DEPT' && !selectedDepartmentId) {
          toast.error("Please select a department.")
          return false
        }
      }

      if (type === 'TASKS') {
        if (assignmentType === 'DEPT' && !selectedDepartmentId) {
          toast.error("Please select a department.")
          return false
        }
      }
    }

    return true
  }

  const handleExport = async () => {
    if (!validateSelection()) return
    setIsGenerating(true)
    setValidationError('')

    try {
      // 1. Establish ISO Start and End Timestamps
      let startDateISO = ''
      let endDateISO = ''

      if (dateRange === '7D' || dateRange === '30D') {
        const now = new Date()
        const start = new Date()
        if (dateRange === '7D') start.setDate(now.getDate() - 7)
        if (dateRange === '30D') start.setDate(now.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        startDateISO = start.toISOString()
        endDateISO = now.toISOString()
      } else if (dateRange === 'CUSTOM') {
        startDateISO = new Date(`${startDate}T00:00:00+05:30`).toISOString()
        endDateISO = new Date(`${endDate}T23:59:59+05:30`).toISOString()
      } else if (dateRange === 'SPECIFIC') {
        startDateISO = new Date(`${startDate}T00:00:00+05:30`).toISOString()
        endDateISO = new Date(`${startDate}T23:59:59+05:30`).toISOString()
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error("User session not found")

      // Fetch generator name and department name
      let generatorName = 'System User'
      let generatorRole = 'System'
      if (role === 'ADMIN') {
        const { data: adm } = await supabase.from('admins').select('full_name').eq('id', currentUser.id).maybeSingle()
        if (adm) generatorName = adm.full_name
        generatorRole = 'Admin'
      } else if (role === 'DEPARTMENT') {
        const { data: dept } = await supabase.from('departments').select('department_name').eq('id', departmentId || currentUser.id).maybeSingle()
        if (dept) generatorName = dept.department_name
        generatorRole = 'Department Head'
      } else {
        const { data: emp } = await supabase.from('employees').select('employee_name').eq('id', employeeId || currentUser.id).maybeSingle()
        if (emp) generatorName = emp.employee_name
        generatorRole = 'Employee'
      }

      // Fetch users mapping cache
      let empQuery = supabase.from('employees').select('id, employee_name, designation, department_id, employee_code, account_status')
      if (!includeInactive) {
        empQuery = empQuery.eq('account_status', 'ACTIVE')
      }
      const [adminsRes, deptsRes, empsRes] = await Promise.all([
        supabase.from('admins').select('id, full_name'),
        supabase.from('departments').select('id, department_name').eq('status', 'ACTIVE'),
        empQuery
      ])

      const userNamesMap: Record<string, string> = {}
      const userCodeMap: Record<string, string> = {}
      const userDeptMap: Record<string, string> = {}
      const userDesignationMap: Record<string, string> = {}

      adminsRes.data?.forEach(a => { userNamesMap[a.id] = a.full_name })
      deptsRes.data?.forEach(d => { userNamesMap[d.id] = d.department_name })
      empsRes.data?.forEach(e => {
        userNamesMap[e.id] = e.employee_name
        userCodeMap[e.id] = e.employee_code || '-'
        userDesignationMap[e.id] = e.designation || '-'
        const d = deptsRes.data?.find(dept => dept.id === e.department_id)
        userDeptMap[e.id] = d?.department_name || '-'
      })

      // Determine array of User IDs that this report targets
      let targetUserIds: string[] = []
      if (role === 'EMPLOYEE') {
        targetUserIds = [employeeId || currentUser.id]
      } else if (role === 'DEPARTMENT') {
        if (employeeSelectType === 'ME') {
          targetUserIds = [departmentId || currentUser.id]
        } else if (employeeSelectType === 'SINGLE' || employeeSelectType === 'MULTIPLE') {
          targetUserIds = selectedEmployeeIds
        } else {
          // Entire Department
          targetUserIds = (empsRes.data || [])
            .filter(e => e.department_id === (departmentId || currentUser.id))
            .map(e => e.id)
        }
      } else {
        // ADMIN
        if (employeeSelectType === 'SINGLE' || employeeSelectType === 'MULTIPLE') {
          targetUserIds = selectedEmployeeIds
        } else if (employeeSelectType === 'DEPT') {
          targetUserIds = (empsRes.data || [])
            .filter(e => e.department_id === selectedDepartmentId)
            .map(e => e.id)
        } else {
          // Entire Organization
          targetUserIds = (empsRes.data || []).map(e => e.id)
        }
      }

      const toISTDateString = (date: Date) => {
        return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]
      }

      const formatTimeIST = (timeStr: string | null) => {
        if (!timeStr) return '-'
        return new Date(timeStr).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        })
      }

      // 2. Fetch & Generate Data
      let reportData: any[] = []
      let excelData: any[] = []
      let headers: string[] = []

      if (type === 'ATTENDANCE') {
        const [sessionsRes, attendanceRes, leavesRes] = await Promise.all([
          supabase.from('work_sessions').select('*').in('user_id', targetUserIds).gte('login_time', startDateISO).lte('login_time', endDateISO),
          supabase.from('attendance').select('*').in('employee_id', targetUserIds).gte('created_at', startDateISO).lte('created_at', endDateISO),
          supabase.from('leave_requests').select('*').in('employee_id', targetUserIds).eq('approval_status', 'APPROVED')
        ])

        const sessions = sessionsRes.data || []
        const attendanceRecords = attendanceRes.data || []
        const leaves = leavesRes.data || []

        // Daily Loop
        const startDay = new Date(startDateISO)
        const endDay = new Date(endDateISO)
        const todayStr = toISTDateString(new Date())

        targetUserIds.forEach(uid => {
          let curr = new Date(startDay)
          while (curr <= endDay) {
            const dateStr = toISTDateString(curr)
            if (dateStr <= todayStr) {
              const sessionsForDay = sessions.filter(s => toISTDateString(new Date(s.login_time)) === dateStr && s.user_id === uid)
              const attForDay = attendanceRecords.find(a => toISTDateString(new Date(a.created_at)) === dateStr && a.employee_id === uid)
              const hasLeave = leaves.some(l => dateStr >= l.start_date && dateStr <= l.end_date && l.employee_id === uid)

              let firstLogin = '-'
              let lastLogout = '-'
              let totalWorking = '0h 0m'
              let sessionsCount = sessionsForDay.length

              if (sessionsCount > 0) {
                const sorted = [...sessionsForDay].sort((a, b) => new Date(a.login_time).getTime() - new Date(b.login_time).getTime())
                firstLogin = formatTimeIST(sorted[0].login_time)
                const lastSession = sorted[sorted.length - 1]
                lastLogout = lastSession.logout_time ? formatTimeIST(lastSession.logout_time) : 'Active'

                let totalMs = 0
                sorted.forEach(s => {
                  const login = new Date(s.login_time).getTime()
                  const logout = s.logout_time ? new Date(s.logout_time).getTime() : Date.now()
                  totalMs += (logout - login)
                })
                const hours = Math.floor(totalMs / (1000 * 60 * 60))
                const mins = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60))
                totalWorking = `${hours}h ${mins}m`
              }

              // Determine status
              let status = 'Absent'
              if (attForDay) {
                const s = attForDay.attendance_status
                status = s === 'PRESENT' ? 'Present' : s === 'LATE' ? 'Late' : s === 'HALF_DAY' ? 'Half Day' : s === 'LEAVE' ? 'Leave' : 'Absent'
              } else if (hasLeave) {
                status = 'Leave'
              } else if (sessionsCount > 0) {
                status = 'Present'
              } else {
                const dayOfWeek = curr.getDay()
                if (dayOfWeek === 0 || dayOfWeek === 6) status = 'Weekend'
              }

              const row: any = {}
              if (role !== 'EMPLOYEE') {
                row['Employee Name'] = userNamesMap[uid] || 'Unknown'
                row['Code'] = userCodeMap[uid] || '-'
                row['Department'] = userDeptMap[uid] || '-'
              }
              row['Date'] = dateStr
              row['First Login'] = firstLogin
              row['Last Logout'] = lastLogout
              row['Total Sessions'] = sessionsCount
              row['Working Duration'] = totalWorking
              row['Status'] = status

              reportData.push(row)
            }
            curr.setDate(curr.getDate() + 1)
          }
        })

        if (reportData.length === 0) {
          toast.error("No attendance records found.")
          setIsGenerating(false)
          return
        }

        headers = Object.keys(reportData[0])
        excelData = reportData.map(r => Object.values(r))
      }

      else if (type === 'PRODUCTIVITY') {
        const [tasksRes, sessionsRes, prodScoresRes, attendanceRes] = await Promise.all([
          supabase.from('tasks').select('*').in('assigned_employee_id', targetUserIds).gte('created_at', startDateISO).lte('created_at', endDateISO),
          supabase.from('work_sessions').select('*').in('user_id', targetUserIds).gte('login_time', startDateISO).lte('login_time', endDateISO),
          supabase.from('productivity_scores').select('*').in('employee_id', targetUserIds).gte('calculated_at', startDateISO).lte('calculated_at', endDateISO),
          supabase.from('attendance').select('*').in('employee_id', targetUserIds).gte('created_at', startDateISO).lte('created_at', endDateISO)
        ])

        const tasks = tasksRes.data || []
        const sessions = sessionsRes.data || []
        const prodScores = prodScoresRes.data || []
        const attendance = attendanceRes.data || []

        targetUserIds.forEach(uid => {
          const userTasks = tasks.filter(t => t.assigned_employee_id === uid)
          const assigned = userTasks.length
          const completed = userTasks.filter(t => t.task_status === 'COMPLETED').length
          const pending = userTasks.filter(t => ['PENDING', 'IN_PROGRESS', 'WAITING_APPROVAL', 'REOPENED'].includes(t.task_status)).length
          
          // Overdue calculation
          const todayStr = new Date().toISOString().split('T')[0]
          const overdue = userTasks.filter(t => t.task_status !== 'COMPLETED' && t.due_date < todayStr).length

          const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0

          // Calculate Attendance Rate
          const totalDays = attendance.filter(a => a.employee_id === uid).length
          const presentDays = attendance.filter(a => a.employee_id === uid && ['PRESENT', 'LATE', 'HALF_DAY'].includes(a.attendance_status)).length
          const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100

          // Productivity Score
          const userScores = prodScores.filter(s => s.employee_id === uid)
          let score = 0
          if (userScores.length > 0) {
            score = Math.round(userScores.reduce((acc, curr) => acc + curr.productivity_score, 0) / userScores.length)
          } else {
            score = Math.round(completionRate * 0.7 + attendanceRate * 0.3)
          }

          const reportsSubmitted = sessions.filter(s => s.user_id === uid && s.report_submitted).length

          const row: any = {}
          if (role !== 'EMPLOYEE') {
            row['Employee Name'] = userNamesMap[uid] || 'Unknown'
            row['Code'] = userCodeMap[uid] || '-'
            row['Department'] = userDeptMap[uid] || '-'
          }
          row['Productivity Score'] = `${score}%`
          row['Tasks Assigned'] = assigned
          row['Tasks Completed'] = completed
          row['Pending Tasks'] = pending
          row['Overdue Tasks'] = overdue
          row['Completion Rate'] = `${completionRate}%`
          row['Logout Reports Submitted'] = reportsSubmitted

          reportData.push(row)
        })

        if (reportData.length === 0) {
          toast.error("No productivity data available.")
          setIsGenerating(false)
          return
        }

        headers = Object.keys(reportData[0])
        excelData = reportData.map(r => Object.values(r))
      }

      else if (type === 'TASKS') {
        let query = supabase.from('tasks').select('*').gte('created_at', startDateISO).lte('created_at', endDateISO)

        if (role === 'EMPLOYEE') {
          // Employee generates reports for tasks assigned to them OR assigned by them
          query = query.or(`assigned_employee_id.eq.${currentUser.id},created_by.eq.${currentUser.id}`)
        } else if (role === 'DEPARTMENT') {
          if (assignmentType === 'BY_ME') {
            query = query.eq('created_by', currentUser.id)
          } else if (assignmentType === 'TO_ME') {
            query = query.eq('assigned_employee_id', currentUser.id)
          } else if (assignmentType === 'EMP') {
            query = query.in('assigned_employee_id', targetUserIds)
          } else {
            // Entire department tasks
            query = query.eq('department_id', departmentId || currentUser.id)
          }
        } else {
          // ADMIN
          if (assignmentType === 'BY_ME') {
            query = query.eq('created_by', currentUser.id)
          } else if (assignmentType === 'TO_ME') {
            query = query.eq('assigned_to', currentUser.id)
          } else if (assignmentType === 'DEPT') {
            query = query.eq('department_id', selectedDepartmentId)
          } else if (assignmentType === 'EMP') {
            query = query.in('assigned_employee_id', targetUserIds)
          }
        }

        const { data: tasksData, error } = await query
        if (error) throw error

        const tasksList = tasksData || []

        tasksList.forEach(t => {
          const row: any = {}
          row['Task Title'] = t.task_title || t.title || '-'
          row['Assigned By'] = userNamesMap[t.created_by || t.assigned_by_department] || '-'
          row['Assigned To'] = userNamesMap[t.assigned_employee_id || t.assigned_to] || '-'
          row['Assignment Date'] = toISTDateString(new Date(t.created_at))
          row['Deadline'] = t.due_date || t.deadline || '-'
          row['Status'] = t.task_status || t.status || '-'
          row['Completion Date'] = t.completed_at ? toISTDateString(new Date(t.completed_at)) : '-'

          reportData.push(row)
        })

        if (reportData.length === 0) {
          toast.error("No tasks found in the selected range.")
          setIsGenerating(false)
          return
        }

        headers = Object.keys(reportData[0])
        excelData = reportData.map(r => Object.values(r))
      }

      // 3. Document Branding & Generation Parameters
      const timestampStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      const rangeLabel = dateRange === '7D' 
        ? 'Last 7 Days' 
        : dateRange === '30D' 
        ? 'Last 30 Days' 
        : dateRange === 'SPECIFIC'
        ? `Specific Date (${startDate})`
        : `Custom Range (${startDate} to ${endDate})`

      const reportTitle = `${type.charAt(0) + type.slice(1).toLowerCase()} Report`
      const filename = `InnoVibe_${type}_Report_${toISTDateString(new Date())}`

      if (format === 'EXCEL') {
        const excelRows = [
          ['InnoVibe Business Intelligence Engine'],
          [`Report Type: ${reportTitle}`],
          [`Generated By: ${generatorName} (${generatorRole})`],
          [`Date Filter Scope: ${rangeLabel}`],
          [`Generated on: ${timestampStr} (IST)`],
          [], // Spacing row
          headers, // Table headers
          ...excelData
        ]

        const worksheet = XLSX.utils.aoa_to_sheet(excelRows)
        const workbook = XLSX.utils.book_new()

        // Auto-fit columns
        const maxColWidths = headers.map((_, colIdx) => {
          return {
            wch: Math.max(
              ...excelRows.slice(6).map(row => (row[colIdx] ? String(row[colIdx]).length : 0))
            ) + 4
          }
        })
        worksheet['!cols'] = maxColWidths

        XLSX.utils.book_append_sheet(workbook, worksheet, "Report Summary")
        XLSX.writeFile(workbook, `${filename}.xlsx`)
      } 
      else if (format === 'PDF') {
        const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })

        // Corporate top header banner block
        doc.setFillColor(10, 26, 47) // #0A1A2F
        doc.rect(0, 0, 297, 40, 'F')

        // Title
        doc.setFontSize(22)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('InnoVibe', 14, 16)

        // Subtitle / Report Type
        doc.setFontSize(14)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'normal')
        doc.text(reportTitle, 14, 26)

        // Metadata block (blue-light color)
        doc.setFontSize(8.5)
        doc.setTextColor(165, 180, 252)
        doc.text(`Generated By: ${generatorName} (${generatorRole})`, 14, 34)
        doc.text(`Date Range: ${rangeLabel}`, 110, 34)
        doc.text(`Generated on: ${timestampStr} (IST)`, 210, 34)

        // AutoTable body render
        autoTable(doc, {
          startY: 46,
          head: [headers],
          body: excelData.map((row: any) => row.map((cell: any) => String(cell))),
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [33, 41, 54] },
          headStyles: { fillColor: [0, 102, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 }
        })

        // Add page numbers
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.setFontSize(8)
          doc.setTextColor(148, 163, 184)
          doc.text(`Page ${i} of ${pageCount}`, 297 - 25, 210 - 10, { align: 'right' })
          doc.text('InnoVibe TMS & Analytics - Corporate Confidential Document', 14, 210 - 10)
        }

        doc.save(`${filename}.pdf`)
      }

      toast.success(`${format} report generated successfully!`)
    } catch (error: any) {
      console.error(error)
      toast.error(`Failed to generate report: ${error.message || error}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const isGenerateDisabled = isGenerating || 
    (dateRange === 'CUSTOM' && (!startDate || !endDate || !!validationError)) ||
    (dateRange === 'SPECIFIC' && !startDate)

  // Filter list of employees based on search query
  const filteredEmployeesList = employeesList.filter(e => 
    e.full_name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    e.designation.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  )

  return (
    <Card className="p-6 bg-white border-slate-200 shadow-sm rounded-3xl dark:bg-slate-900 dark:border-slate-800">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-1">Generate Export Reports</h3>
          <p className="text-sm text-slate-500 font-medium">Configure and download secure reports based on your portal scope.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Report Type */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Type</label>
            <div className="space-y-2">
              <button 
                type="button"
                onClick={() => setType('ATTENDANCE')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                  type === 'ATTENDANCE' 
                    ? 'border-[#0066FF] bg-blue-50/50 text-[#0066FF] dark:bg-[#0066FF]/10' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <span className="text-sm font-bold">Attendance</span>
              </button>
              <button 
                type="button"
                onClick={() => setType('PRODUCTIVITY')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                  type === 'PRODUCTIVITY' 
                    ? 'border-[#0066FF] bg-blue-50/50 text-[#0066FF] dark:bg-[#0066FF]/10' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <span className="text-sm font-bold">Productivity Metrics</span>
              </button>
              <button 
                type="button"
                onClick={() => setType('TASKS')}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                  type === 'TASKS' 
                    ? 'border-[#0066FF] bg-blue-50/50 text-[#0066FF] dark:bg-[#0066FF]/10' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <span className="text-sm font-bold">Tasks & Assignments</span>
              </button>
            </div>
          </div>

          {/* Reusable Date Range Selector */}
          <DateRangeSelector
            dateRange={dateRange}
            setDateRange={setDateRange}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            validationError={validationError}
            setValidationError={setValidationError}
            disabled={isGenerating}
          />

          {/* Reusable Export Format Selector */}
          <ExportTypeSelector
            format={format}
            setFormat={setFormat}
            disabled={isGenerating}
          />
        </div>

        {/* Dynamic Context & Selection Filters based on Role and Type */}
        {(role === 'ADMIN' || role === 'DEPARTMENT') && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Dynamic Context Filters</h4>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="rounded text-[#0066FF] focus:ring-[#0066FF]/20 border-slate-300 w-4 h-4 cursor-pointer"
                />
                <span>Include Inactive Employees</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tasks Assignment Categories */}
              {type === 'TASKS' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assignment Category</label>
                  <select
                    value={assignmentType}
                    disabled={isOptionsLoading}
                    onChange={(e) => {
                      setAssignmentType(e.target.value)
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white outline-none focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-semibold"
                  >
                    {role === 'ADMIN' ? (
                      <>
                        <option value="ALL">Tasks Across Organization</option>
                        <option value="BY_ME">Tasks Assigned By Me</option>
                        <option value="TO_ME">Tasks Assigned To Me</option>
                        <option value="DEPT">Tasks By Department</option>
                        <option value="EMP">Tasks By Employee(s)</option>
                      </>
                    ) : (
                      <>
                        <option value="ALL">Department Tasks</option>
                        <option value="BY_ME">Tasks Assigned By Me</option>
                        <option value="TO_ME">Tasks Assigned To Me</option>
                        <option value="EMP">Tasks By Employee(s)</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Attendance & Productivity Selection Type (or Tasks by Employee Category) */}
              {(type === 'ATTENDANCE' || type === 'PRODUCTIVITY' || (type === 'TASKS' && assignmentType === 'EMP')) && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Selection Type</label>
                  <select
                    value={employeeSelectType}
                    disabled={isOptionsLoading}
                    onChange={(e) => {
                      setEmployeeSelectType(e.target.value)
                      setSelectedEmployeeIds([])
                      setSelectedDepartmentId('')
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white outline-none focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-semibold"
                  >
                    {role === 'ADMIN' ? (
                      <>
                        <option value="ALL">Entire Organization</option>
                        {type !== 'TASKS' && <option value="DEPT">Department Filter</option>}
                        <option value="SINGLE">Single Employee</option>
                        <option value="MULTIPLE">Multiple Employees</option>
                      </>
                    ) : (
                      <>
                        {type === 'ATTENDANCE' && assignmentType !== 'EMP' && <option value="ME">My Attendance</option>}
                        <option value="ALL">Entire Department</option>
                        <option value="SINGLE">Single Employee</option>
                        <option value="MULTIPLE">Multiple Employees</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Department Selector for Admin Filter */}
              {employeeSelectType === 'DEPT' && role === 'ADMIN' && type !== 'TASKS' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Department</label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white outline-none focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-semibold"
                  >
                    <option value="">-- Choose Department --</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Department Selector for Tasks By Department (Admin only) */}
              {type === 'TASKS' && assignmentType === 'DEPT' && role === 'ADMIN' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Department</label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white outline-none focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-semibold"
                  >
                    <option value="">-- Choose Department --</option>
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Single Employee Selector */}
              {employeeSelectType === 'SINGLE' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Employee</label>
                  <select
                    value={selectedEmployeeIds[0] || ''}
                    onChange={(e) => setSelectedEmployeeIds(e.target.value ? [e.target.value] : [])}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white outline-none focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-semibold"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employeesList.map(e => (
                      <option key={e.id} value={e.id}>{e.full_name} ({e.designation})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multiple Employees Selector (Issue 2 Search, select all, clear all, chips/tags system) */}
              {employeeSelectType === 'MULTIPLE' && (
                <div className="space-y-3 col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Select Employees</label>
                    <div className="flex gap-3 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          const allFilteredIds = filteredEmployeesList.map(e => e.id)
                          setSelectedEmployeeIds(prev => Array.from(new Set([...prev, ...allFilteredIds])))
                        }}
                        className="text-[#0066FF] hover:underline focus:outline-none"
                      >
                        Select All Filtered
                      </button>
                      <span className="text-slate-350 select-none">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (employeeSearchQuery) {
                            const filteredIds = filteredEmployeesList.map(e => e.id)
                            setSelectedEmployeeIds(prev => prev.filter(id => !filteredIds.includes(id)))
                          } else {
                            setSelectedEmployeeIds([])
                          }
                        }}
                        className="text-red-500 hover:underline focus:outline-none"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <input
                    type="text"
                    placeholder="Search employees by name or designation..."
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-950 dark:text-white placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all text-xs font-semibold"
                  />

                  {/* Selected Tags Chips container */}
                  {selectedEmployeeIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl">
                      {selectedEmployeeIds.map(id => {
                        const emp = employeesList.find(e => e.id === id)
                        if (!emp) return null
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-[#0066FF] dark:text-blue-400 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-100 dark:border-blue-900/40 shadow-xs">
                            <span>{emp.full_name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeIds(prev => prev.filter(x => x !== id))}
                              className="hover:text-red-500 font-black text-xs transition-colors focus:outline-none"
                            >
                              &times;
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Scrollable Checkbox Selector list */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 max-h-48 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner">
                    {filteredEmployeesList.length === 0 ? (
                      <div className="col-span-2 py-6 text-center text-xs text-slate-400 font-medium">
                        No employees match your search query.
                      </div>
                    ) : (
                      filteredEmployeesList.map(e => {
                        const isChecked = selectedEmployeeIds.includes(e.id)
                        return (
                          <label key={e.id} className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer select-none text-xs font-semibold transition-colors ${isChecked ? 'bg-blue-50/40 dark:bg-blue-950/15 text-[#0066FF] dark:text-blue-400 border border-blue-100/30' : 'hover:bg-slate-100/60 text-slate-700 dark:text-slate-300 border border-transparent'}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedEmployeeIds(prev => prev.filter(id => id !== e.id))
                                } else {
                                  setSelectedEmployeeIds(prev => [...prev, e.id])
                                }
                              }}
                              className="rounded text-[#0066FF] focus:ring-[#0066FF]/20 border-slate-300 w-4 h-4 cursor-pointer"
                            />
                            <div className="truncate">
                              <span className="block font-bold">{e.full_name}</span>
                              <span className="block text-[10px] text-slate-400 font-normal">{e.designation}</span>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={isGenerateDisabled}
            className="flex items-center justify-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-[#0066FF]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span>{isGenerating ? 'Generating Report...' : 'Generate & Download'}</span>
          </button>
        </div>
      </div>
    </Card>
  )
}
