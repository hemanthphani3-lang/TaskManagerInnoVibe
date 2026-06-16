"use client"

import React, { useState, useMemo } from 'react'
import { Search, Clock, User, ShieldAlert, FileText, Calendar } from 'lucide-react'

interface Activity {
  id: string
  activity_type: string
  activity_user: string
  activity_user_name: string
  activity_description: string
  department_id: string
  created_at: string
}

interface AuditLogsClientProps {
  initialActivities: Activity[]
}

export function AuditLogsClient({ initialActivities }: AuditLogsClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("ALL")

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(initialActivities.map(a => a.activity_type))).sort()
  }, [initialActivities])

  const filteredActivities = useMemo(() => {
    return initialActivities.filter(activity => {
      const matchesSearch = 
        activity.activity_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.activity_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.activity_type.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = filterType === "ALL" || activity.activity_type === filterType

      return matchesSearch && matchesType
    })
  }, [initialActivities, searchQuery, filterType])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    })
  }

  const getActivityColor = (type: string) => {
    const t = type.toUpperCase()
    if (t.includes('LOGIN') || t.includes('SESSION_START')) return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (t.includes('LOGOUT') || t.includes('SESSION_END')) return 'bg-slate-100 text-slate-700 border-slate-200'
    if (t.includes('CREATE') || t.includes('ADD')) return 'bg-blue-50 text-blue-700 border-blue-100'
    if (t.includes('DELETE') || t.includes('REMOVE')) return 'bg-red-50 text-red-700 border-red-100'
    if (t.includes('UPDATE') || t.includes('EDIT')) return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-purple-50 text-purple-700 border-purple-100'
  }

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs by user, action, or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition duration-150"
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 min-w-[180px]">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Action</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none w-full cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time (IST)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-semibold">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              filteredActivities.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/40 transition-colors text-sm">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] border">
                        {log.activity_user_name?.charAt(0).toUpperCase()}
                      </div>
                      {log.activity_user_name || "Unknown"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActivityColor(log.activity_type)}`}>
                      {log.activity_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-md break-words">
                    {log.activity_description}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
