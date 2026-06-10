"use client";

import React, { useState } from 'react';
import { Search, Eye, Filter, User, ShieldAlert } from 'lucide-react';
import styles from './attendance.module.css';

interface AttendanceRecord {
  userId: string;
  name: string;
  role: string;
  departmentName: string;
  status: 'Present' | 'Late' | 'Absent';
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  attendancePercentage: number;
  history: Record<string, 'Present' | 'Late' | 'Absent'>;
  sessions: any[];
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onDetailClick: (record: AttendanceRecord) => void;
}

export default function AttendanceTable({ records, onDetailClick }: AttendanceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Filtering records based on user search & filter criteria
  const filteredRecords = records.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "All" || r.role === roleFilter;
    
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Table Filters Header */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-700"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-500 uppercase">Filters:</span>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
          >
            <option value="All">All Roles</option>
            <option value="Employee">Employees</option>
            <option value="Department Head">Department Heads</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
          >
            <option value="All">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
          </select>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <th className="py-4 px-6">Name</th>
              <th className="py-4 px-6">Role</th>
              <th className="py-4 px-6">Department</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">First Check-in</th>
              <th className="py-4 px-6">Last Check-out</th>
              <th className="py-4 px-6 text-center">Attendance %</th>
              <th className="py-4 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                  <div className="flex flex-col items-center justify-center">
                    <ShieldAlert className="w-10 h-10 text-gray-300 mb-2" />
                    <span>No attendance records found matching your filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                let statusBadge = "";
                if (record.status === 'Present') {
                  statusBadge = "bg-green-50 text-green-700 border-green-200";
                } else if (record.status === 'Late') {
                  statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                } else {
                  statusBadge = "bg-red-50 text-red-700 border-red-200";
                }

                return (
                  <tr 
                    key={record.userId} 
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-semibold text-gray-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <span>{record.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {record.role}
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {record.departmentName}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-bold inline-block ${statusBadge}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-gray-700">
                      {record.firstCheckIn || "--"}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-gray-700">
                      {record.lastCheckOut === 'Active' ? (
                        <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Active</span>
                      ) : (
                        record.lastCheckOut || "--"
                      )}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-gray-800">
                      <div className="flex items-center justify-center space-x-2">
                        <span className={`${
                          record.attendancePercentage >= 90 ? 'text-green-600' :
                          record.attendancePercentage >= 75 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {record.attendancePercentage}%
                        </span>
                        {/* Simple progress bar */}
                        <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${
                              record.attendancePercentage >= 90 ? 'bg-green-500' :
                              record.attendancePercentage >= 75 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${record.attendancePercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => onDetailClick(record)}
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-900 font-semibold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all text-xs"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
