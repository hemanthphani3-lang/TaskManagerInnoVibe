'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { FileText, FileSpreadsheet, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type ExportFormat = 'PDF' | 'EXCEL' | 'CSV'
type ReportType = 'ATTENDANCE' | 'PRODUCTIVITY' | 'TASKS'

interface ReportExportModalProps {
  role: 'ADMIN' | 'DEPARTMENT' | 'EMPLOYEE'
  departmentId?: string
  employeeId?: string
}

export function ReportExportModal({ role, departmentId, employeeId }: ReportExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('PDF')
  const [type, setType] = useState<ReportType>('ATTENDANCE')
  const [dateRange, setDateRange] = useState<'7D' | '30D' | 'ALL'>('30D')
  const [isGenerating, setIsGenerating] = useState(false)
  const supabase = createClient()

  const handleExport = async () => {
    setIsGenerating(true)
    try {
      // 1. Fetch Data Based on Type & Role
      let data: Record<string, string | number>[] = []
      
      const now = new Date()
      let startDate = new Date()
      if (dateRange === '7D') startDate.setDate(now.getDate() - 7)
      if (dateRange === '30D') startDate.setDate(now.getDate() - 30)
      if (dateRange === 'ALL') startDate = new Date(0) // Very old date

      if (type === 'ATTENDANCE') {
        let query = supabase.from('attendance').select('*, employees(employee_name, employee_code), departments(department_name)').gte('created_at', startDate.toISOString())
        if (role === 'DEPARTMENT' && departmentId) query = query.eq('department_id', departmentId)
        if (role === 'EMPLOYEE' && employeeId) query = query.eq('employee_id', employeeId)
        
        const { data: attendanceData } = await query
        
        // Deduplicate records to prevent showing multiple check-ins per day for the same employee
        // This resolves issues where rapid clicks created duplicate DB records
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
        let query = supabase.from('productivity_scores').select('*, employees(employee_name, employee_code), departments(department_name)')
        if (role === 'DEPARTMENT' && departmentId) query = query.eq('department_id', departmentId)
        if (role === 'EMPLOYEE' && employeeId) query = query.eq('employee_id', employeeId)
        
        const { data: prodData } = await query
        data = (prodData || []).map(p => ({
          Employee: p.employees?.employee_name || '-',
          Code: p.employees?.employee_code || '-',
          Department: p.departments?.department_name || '-',
          Score: p.productivity_score,
          CompletedTasks: p.completed_tasks,
          DelayedTasks: p.delayed_tasks,
          AttendanceRate: p.attendance_percentage + '%'
        }))
      }
      else if (type === 'TASKS') {
        let query = supabase.from('tasks').select('*, employees!assigned_employee_id(employee_name, employee_code), departments!department_id(department_name)').gte('created_at', startDate.toISOString())
        if (role === 'DEPARTMENT' && departmentId) query = query.eq('department_id', departmentId)
        if (role === 'EMPLOYEE' && employeeId) query = query.eq('assigned_employee_id', employeeId)
        
        const { data: taskData } = await query
        data = (taskData || []).map(t => ({
          Title: t.task_title,
          Priority: t.task_priority,
          Status: t.task_status,
          AssignedTo: t.employees?.employee_name || '-',
          Department: t.departments?.department_name || '-',
          DueDate: t.due_date,
          CompletedAt: t.completed_at ? t.completed_at.split('T')[0] : 'Pending'
        }))
      }

      if (data.length === 0) {
        toast.error("No data found for the selected criteria.")
        setIsGenerating(false)
        return
      }

      // 2. Generate File
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `InnoVibe_${type}_Report_${timestamp}`

      if (format === 'EXCEL' || format === 'CSV') {
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report")
        XLSX.writeFile(workbook, `${filename}.${format.toLowerCase()}`)
      } 
      else if (format === 'PDF') {
        const doc = new jsPDF('landscape')
        
        doc.setFontSize(20)
        doc.text(`InnoVibe ${type} Report`, 14, 22)
        doc.setFontSize(11)
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 14, 30)
        doc.text(`Role: ${role}`, 14, 36)

        const headers = Object.keys(data[0])
        const rows = data.map(obj => Object.values(obj).map(v => String(v)))

        autoTable(doc, {
          startY: 45,
          head: [headers],
          body: rows,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [0, 102, 255], textColor: [255, 255, 255] }
        })

        doc.save(`${filename}.pdf`)
      }

      toast.success(`${format} report generated successfully!`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="p-6 bg-white border-slate-200">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Generate Report</h3>
          <p className="text-sm text-slate-500">Configure your report parameters below.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Report Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Report Type</label>
            <div className="space-y-2">
              <button 
                onClick={() => setType('ATTENDANCE')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border ${type === 'ATTENDANCE' ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <span className="text-sm font-medium">Attendance</span>
              </button>
              <button 
                onClick={() => setType('PRODUCTIVITY')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border ${type === 'PRODUCTIVITY' ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <span className="text-sm font-medium">Productivity</span>
              </button>
              <button 
                onClick={() => setType('TASKS')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border ${type === 'TASKS' ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <span className="text-sm font-medium">Tasks & Work</span>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Date Range</label>
            <div className="space-y-2">
              <button 
                onClick={() => setDateRange('7D')}
                className={`w-full p-3 rounded-xl border text-left ${dateRange === '7D' ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <span className="text-sm font-medium block">Last 7 Days</span>
              </button>
              <button 
                onClick={() => setDateRange('30D')}
                className={`w-full p-3 rounded-xl border text-left ${dateRange === '30D' ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <span className="text-sm font-medium block">Last 30 Days</span>
              </button>
              <button 
                onClick={() => setDateRange('ALL')}
                className={`w-full p-3 rounded-xl border text-left ${dateRange === 'ALL' ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <span className="text-sm font-medium block">All Time</span>
              </button>
            </div>
          </div>

          {/* Export Format */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Export Format</label>
            <div className="space-y-2">
              <button 
                onClick={() => setFormat('PDF')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border ${format === 'PDF' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">PDF Document</span>
              </button>
              <button 
                onClick={() => setFormat('EXCEL')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border ${format === 'EXCEL' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span className="text-sm font-medium">Excel Spreadsheet</span>
              </button>
              <button 
                onClick={() => setFormat('CSV')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border ${format === 'CSV' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">CSV Data</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleExport}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052CC] text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            <span>Generate & Download</span>
          </button>
        </div>
      </div>
    </Card>
  )
}
