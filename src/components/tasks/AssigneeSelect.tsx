"use client"

import { useState } from "react"

interface Employee {
  id: string
  employee_name: string
  designation: string
}

export function AssigneeSelect({ employees }: { employees: Employee[] }) {
  const [selectedRole, setSelectedRole] = useState("")

  const uniqueRoles = Array.from(new Set(employees.map(e => e.designation)))
  
  const filteredEmployees = selectedRole 
    ? employees.filter(e => e.designation === selectedRole)
    : employees

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Filter by Role / Designation</label>
        <select 
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm"
        >
          <option value="">All Roles</option>
          {uniqueRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <p className="text-[11px] text-slate-400 font-medium ml-1">Optional: Narrow down employees by role.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Assign To Employee</label>
        <select 
          name="assigned_employee_id" 
          required 
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#0066FF]/20 transition-all text-sm font-medium"
        >
          <option value="">Select Employee...</option>
          {filteredEmployees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.employee_name} {selectedRole ? '' : `(${emp.designation})`}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
