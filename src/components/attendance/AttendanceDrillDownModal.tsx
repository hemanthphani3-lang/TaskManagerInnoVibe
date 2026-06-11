import React, { useState } from 'react';
import { X, Search, Users, UserCheck, Clock, UserX, AlertCircle } from 'lucide-react';

interface AttendanceDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'totalStrength' | 'present' | 'late' | 'absent' | null;
  records: any[];
  selectedDate: string;
  departmentName: string;
}

export default function AttendanceDrillDownModal({
  isOpen,
  onClose,
  type,
  records,
  selectedDate,
  departmentName
}: AttendanceDrillDownModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !type) return null;

  // 1. Filter records by type
  let filteredRecords = [...records];
  let modalTitle = '';
  let modalIcon = null;

  switch (type) {
    case 'totalStrength':
      modalTitle = 'Total Strength';
      modalIcon = <Users className="w-6 h-6 text-indigo-600" />;
      break;
    case 'present':
      filteredRecords = records.filter(r => r.status === 'Present' || r.status === 'Late');
      modalTitle = 'Present Today';
      modalIcon = <UserCheck className="w-6 h-6 text-green-600" />;
      break;
    case 'late':
      filteredRecords = records.filter(r => r.status === 'Late');
      modalTitle = 'Late Check-ins';
      modalIcon = <Clock className="w-6 h-6 text-amber-600" />;
      break;
    case 'absent':
      filteredRecords = records.filter(r => r.status === 'Absent');
      modalTitle = 'Absent Today';
      modalIcon = <UserX className="w-6 h-6 text-red-600" />;
      break;
  }

  // 2. Filter by search query
  const searchedRecords = filteredRecords.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      (r.name || '').toLowerCase().includes(q) ||
      (r.employeeCode || '').toLowerCase().includes(q) ||
      (r.role || '').toLowerCase().includes(q) ||
      (r.departmentName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
              {modalIcon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {modalTitle} ({filteredRecords.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {departmentName} • <span className="font-mono">{selectedDate}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, employee ID, role, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {searchedRecords.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">No matching records found.</p>
              <p className="text-xs text-slate-400 mt-1">Try modifying your search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4.5 px-6">Name</th>
                    {type === 'totalStrength' && <th className="py-4.5 px-6">Employee ID</th>}
                    {type !== 'late' && <th className="py-4.5 px-6">Role</th>}
                    <th className="py-4.5 px-6">Department</th>
                    
                    {/* Conditional columns based on clicked card */}
                    {type === 'totalStrength' && <th className="py-4.5 px-6">Status</th>}
                    {type === 'present' && (
                      <>
                        <th className="py-4.5 px-6">Check-In Time</th>
                        <th className="py-4.5 px-6">Session Status</th>
                      </>
                    )}
                    {type === 'late' && (
                      <>
                        <th className="py-4.5 px-6">Check-In Time</th>
                        <th className="py-4.5 px-6">Cutoff Time</th>
                        <th className="py-4.5 px-6">Delay Duration</th>
                      </>
                    )}
                    {type === 'absent' && <th className="py-4.5 px-6">Leave Status</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {searchedRecords.map((record, index) => (
                    <tr key={record.userId || index} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name */}
                      <td className="py-4 px-6 font-bold text-slate-800">{record.name}</td>
                      
                      {/* Employee ID */}
                      {type === 'totalStrength' && (
                        <td className="py-4 px-6 font-mono text-xs text-slate-500 font-semibold">
                          {record.employeeCode}
                        </td>
                      )}
                      
                      {/* Role */}
                      {type !== 'late' && (
                        <td className="py-4 px-6 font-medium text-slate-600">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            record.role === 'Department Head' 
                              ? 'bg-purple-50 text-purple-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {record.role}
                          </span>
                        </td>
                      )}
                      
                      {/* Department */}
                      <td className="py-4 px-6 font-medium text-slate-500">{record.departmentName}</td>

                      {/* Total Strength Status Column */}
                      {type === 'totalStrength' && (
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full border text-xs font-bold inline-block ${
                            record.status === 'Present'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : record.status === 'Late'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      )}

                      {/* Present Today Columns */}
                      {type === 'present' && (
                        <>
                          <td className="py-4 px-6 font-mono text-xs font-bold text-slate-600">
                            {record.firstCheckIn}
                          </td>
                          <td className="py-4 px-6">
                            <span className="flex items-center space-x-1.5">
                              {record.sessionStatus === 'Active' ? (
                                <>
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600">Active</span>
                                </>
                              ) : (
                                <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                                  {record.lastCheckOut}
                                </span>
                              )}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Late Check-ins Columns */}
                      {type === 'late' && (
                        <>
                          <td className="py-4 px-6 font-mono text-xs font-bold text-slate-600">
                            {record.firstCheckIn}
                          </td>
                          <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-400">
                            {record.cutoffTime}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-xs font-bold font-mono">
                              +{record.delayDuration || '0m'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Absent Today Columns */}
                      {type === 'absent' && (
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full border text-xs font-bold inline-block ${
                            record.leaveStatus === 'Leave Approved'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : record.leaveStatus === 'Leave Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {record.leaveStatus}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
