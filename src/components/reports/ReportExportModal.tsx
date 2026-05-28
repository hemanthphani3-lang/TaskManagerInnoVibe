'use client'

import { useState } from 'react'
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
  const supabase = createClient()

  const handleExport = async () => {
    setIsGenerating(true)
    setValidationError('')

    try {
      // 1. Establish Timezone-safe start and end timestamps
      let startDateISO = ''
      let endDateISO = ''

      if (dateRange === '7D' || dateRange === '30D') {
        const now = new Date()
        let start = new Date()
        if (dateRange === '7D') start.setDate(now.getDate() - 7)
        if (dateRange === '30D') start.setDate(now.getDate() - 30)
        start.setHours(0, 0, 0, 0)
        startDateISO = start.toISOString()
        endDateISO = now.toISOString()
      } else if (dateRange === 'CUSTOM') {
        if (!startDate || !endDate) {
          toast.error("Please select both start and end dates.")
          setIsGenerating(false)
          return
        }
        if (startDate > endDate) {
          toast.error("Start date cannot be after end date.")
          setIsGenerating(false)
          return
        }
        // Force full day boundaries in IST (+05:30) for accurate queries
        startDateISO = new Date(`${startDate}T00:00:00+05:30`).toISOString()
        endDateISO = new Date(`${endDate}T23:59:59+05:30`).toISOString()
      }

      // Fetch dynamic context info for the header (e.g. employee name or department name)
      let scopeContextName = ''
      if (role === 'DEPARTMENT' && departmentId) {
        const { data: dept } = await supabase.from('departments').select('department_name').eq('id', departmentId).maybeSingle()
        if (dept) scopeContextName = `${dept.department_name} Department`
      } else if (role === 'EMPLOYEE' && employeeId) {
        const { data: emp } = await supabase.from('employees').select('employee_name, employee_code').eq('id', employeeId).maybeSingle()
        if (emp) scopeContextName = `${emp.employee_name} (${emp.employee_code})`
      }

      // 2. Fetch Data Based on Type & Role
      let data: Record<string, string | number>[] = []

      if (type === 'ATTENDANCE') {
        let query = supabase
          .from('attendance')
          .select('*, employees(employee_name, employee_code), departments(department_name)')
          .gte('created_at', startDateISO)
          .lte('created_at', endDateISO)

        if (role === 'DEPARTMENT' && departmentId) query = query.eq('department_id', departmentId)
        if (role === 'EMPLOYEE' && employeeId) query = query.eq('employee_id', employeeId)
        
        const { data: attendanceData, error } = await query
        if (error) throw error
        
        // Deduplicate records to prevent showing multiple check-ins per day for the same employee
        const uniqueAttendance = Array.from(new Map(
          (attendanceData || []).map(a => [`${a.employee_id}-${a.created_at.split('T')[0]}`, a])
        ).values())

        data = uniqueAttendance.map(a => ({
          Date: a.created_at.split('T')[0],
          Employee: a.employees?.employee_name || '-',
          Code: a.employees?.employee_code || '-',
          Department: a.departments?.department_name || '-',
          Status: a.attendance_status,
          WorkStatus: a.work_status,
          WorkingHours: a.working_hours || '0h 0m'
        }))
      } 
      else if (type === 'PRODUCTIVITY') {
        // Query productivity scores filtered by calculated_at for precision
        let query = supabase
          .from('productivity_scores')
          .select('*, employees(employee_name, employee_code), departments(department_name)')
          .gte('calculated_at', startDateISO)
          .lte('calculated_at', endDateISO)

        if (role === 'DEPARTMENT' && departmentId) query = query.eq('department_id', departmentId)
        if (role === 'EMPLOYEE' && employeeId) query = query.eq('employee_id', employeeId)
        
        const { data: prodData, error } = await query
        if (error) throw error

        data = (prodData || []).map(p => ({
          Employee: p.employees?.employee_name || '-',
          Code: p.employees?.employee_code || '-',
          Department: p.departments?.department_name || '-',
          Score: p.productivity_score ?? 0,
          CompletedTasks: p.completed_tasks ?? 0,
          DelayedTasks: p.delayed_tasks ?? 0,
          AttendanceRate: (p.attendance_percentage ?? 0) + '%'
        }))
      }
      else if (type === 'TASKS') {
        let query = supabase
          .from('tasks')
          .select('*, employees!assigned_employee_id(employee_name, employee_code), departments!department_id(department_name)')
          .gte('created_at', startDateISO)
          .lte('created_at', endDateISO)

        if (role === 'DEPARTMENT' && departmentId) query = query.eq('department_id', departmentId)
        if (role === 'EMPLOYEE' && employeeId) query = query.eq('assigned_employee_id', employeeId)
        
        const { data: taskData, error } = await query
        if (error) throw error

        data = (taskData || []).map(t => ({
          Title: t.task_title,
          Priority: t.priority_level || 'MEDIUM',
          Status: t.task_status,
          AssignedTo: t.employees?.employee_name || '-',
          Department: t.departments?.department_name || '-',
          DueDate: t.due_date,
          CompletedAt: t.updated_at && t.task_status === 'COMPLETED' ? t.updated_at.split('T')[0] : 'Pending'
        }))
      }

      if (data.length === 0) {
        toast.error("No data found for the selected date range.")
        setIsGenerating(false)
        return
      }

      // 3. Generate File
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `InnoVibe_${type}_Report_${timestamp}`

      const formattedRange = dateRange === '7D' 
        ? 'Last 7 Days' 
        : dateRange === '30D' 
        ? 'Last 30 Days' 
        : `Custom Range (${startDate} to ${endDate})`

      if (format === 'EXCEL') {
        // Create structured Excel layout with header/metadata blocks and auto column widths
        const excelRows = [
          [`InnoVibe ${type.charAt(0) + type.slice(1).toLowerCase()} Report`],
          [`Scope: ${role === 'ADMIN' ? 'Organization-wide' : role === 'DEPARTMENT' ? 'Department' : 'Personal'}${scopeContextName ? ` - ${scopeContextName}` : ''}`],
          [`Date Range: ${formattedRange}`],
          [`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`],
          [], // Spacing row
          Object.keys(data[0]), // Header columns
          ...data.map(obj => Object.values(obj))
        ]

        const worksheet = XLSX.utils.aoa_to_sheet(excelRows)
        const workbook = XLSX.utils.book_new()

        // Calculate and set automatic column widths for Excel layout
        const maxColWidths = excelRows[5].map((_, colIdx) => {
          return {
            wch: Math.max(
              ...excelRows.slice(5).map(row => (row[colIdx] ? String(row[colIdx]).length : 0))
            ) + 4
          }
        })
        worksheet['!cols'] = maxColWidths

        XLSX.utils.book_append_sheet(workbook, worksheet, "Report Summary")
        XLSX.writeFile(workbook, `${filename}.xlsx`)
      } 
      else if (format === 'PDF') {
        const doc = new jsPDF('landscape')
        
        // Draw elegant primary corporate header banner block
        doc.setFillColor(10, 26, 47) // Deep navy #0A1A2F
        doc.rect(0, 0, 297, 42, 'F')
        
        doc.setFontSize(22)
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.text(`InnoVibe ${type.charAt(0) + type.slice(1).toLowerCase()} Report`, 14, 20)
        
        doc.setFontSize(9)
        doc.setTextColor(165, 180, 252) // Indigo-light
        doc.setFont("helvetica", "normal")
        doc.text(`Scope: ${role === 'ADMIN' ? 'Organization-wide' : role === 'DEPARTMENT' ? 'Department' : 'Personal'}${scopeContextName ? ` (${scopeContextName})` : ''}`, 14, 30)
        doc.text(`Date Range: ${formattedRange}`, 14, 35)
        
        doc.setTextColor(203, 213, 225) // Light gray
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`, 210, 35)
        
        // Render structured body tables
        const headers = Object.keys(data[0])
        const rows = data.map(obj => Object.values(obj).map(v => String(v)))

        autoTable(doc, {
          startY: 48,
          head: [headers],
          body: rows,
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 3, textColor: [33, 41, 54] },
          headStyles: { fillColor: [0, 102, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 14, right: 14 }
        })

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

  // Generate button is disabled until all required parameters (especially start/end dates for Custom) are selected
  const isGenerateDisabled = isGenerating || (dateRange === 'CUSTOM' && (!startDate || !endDate || !!validationError))

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

