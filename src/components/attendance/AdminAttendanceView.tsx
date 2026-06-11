"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getAttendanceReport } from '@/app/actions/attendance';
import AttendanceTable from './AttendanceTable';
import AttendanceStatsCard from './AttendanceStatsCard';
import ExportButton from './ExportButton';
import AttendanceDetailModal from './AttendanceDetailModal';
import AttendanceDrillDownModal from './AttendanceDrillDownModal';
import { Calendar, Filter, Users, UserCheck, Clock, UserX, Loader2 } from 'lucide-react';

// IST helpers
const getISTToday = () => {
  const d = new Date();
  const istTime = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return istTime.toISOString().split('T')[0];
};

const getPastDateIST = (daysAgo: number) => {
  const d = new Date();
  const istTime = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  istTime.setDate(istTime.getDate() - daysAgo);
  return istTime.toISOString().split('T')[0];
};

const formatDateLabel = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mIndex = parseInt(month, 10) - 1;
  return `${day}-${monthNames[mIndex] || month}-${year}`;
};

export default function AdminAttendanceView() {
  const supabase = createClient();
  
  // Date ranges
  const [preset, setPreset] = useState<'today' | '7days' | '30days' | 'custom' | 'specific'>('today');
  const [startDate, setStartDate] = useState(getISTToday());
  const [endDate, setEndDate] = useState(getISTToday());
  const [selectedDate, setSelectedDate] = useState(getISTToday());
  
  // Department filter
  const [departments, setDepartments] = useState<{ id: string; department_name: string }[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("All");

  // Report data
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalStrength: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal state
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [drillDownType, setDrillDownType] = useState<'totalStrength' | 'present' | 'late' | 'absent' | null>(null);

  // Fetch departments list
  useEffect(() => {
    async function loadDepartments() {
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_name')
        .order('department_name');
      if (data) {
        setDepartments(data);
      }
    }
    loadDepartments();
  }, [supabase]);

  // Handle preset change
  useEffect(() => {
    const today = getISTToday();
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
      setSelectedDate(today);
    } else if (preset === '7days') {
      setStartDate(getPastDateIST(6));
      setEndDate(today);
      setSelectedDate(today);
    } else if (preset === '30days') {
      setStartDate(getPastDateIST(29));
      setEndDate(today);
      setSelectedDate(today);
    } else if (preset === 'specific') {
      setStartDate(selectedDate);
      setEndDate(selectedDate);
    }
  }, [preset]);

  // Fetch attendance report data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const deptId = selectedDeptId === "All" ? null : selectedDeptId;
      const data = await getAttendanceReport(startDate, endDate, selectedDate, deptId);
      setRecords(data.records);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Failed to load attendance report:", err);
      setError(err.message || "An unexpected error occurred while loading attendance.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedDate, selectedDeptId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Realtime Supabase subscription
  useEffect(() => {
    const today = getISTToday();
    if (selectedDate !== today) {
      return; // No realtime updates for historical dates
    }

    const channelName = `realtime_attendance_admin_${Date.now()}`;
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_sessions' },
        () => {
          // Trigger data reload on any change in work sessions
          fetchReport();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => {
          // Trigger data reload on any change in attendance
          fetchReport();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, selectedDate, fetchReport]);

  return (
    <div className="space-y-6">
      {/* Date Range & Department Filter Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Preset Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPreset('today')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              preset === 'today' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPreset('7days')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              preset === '7days' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPreset('30days')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              preset === '30days' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPreset('custom')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              preset === 'custom' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Custom Range
          </button>
          <button
            onClick={() => setPreset('specific')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              preset === 'specific' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            📅 Specific Date
          </button>
        </div>

        {/* Custom Date Inputs / Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {preset === 'specific' && (
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                max={getISTToday()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const today = getISTToday();
                    const targetDate = val > today ? today : val;
                    setSelectedDate(targetDate);
                    setStartDate(targetDate);
                    setEndDate(targetDate);
                  }
                }}
                className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {preset === 'custom' && (
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
              />
              <span className="text-gray-400 text-xs font-bold">TO</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Tracking Date Selector (If date range is greater than 1 day) */}
          {startDate !== endDate && (
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase">Track Date:</span>
              <input
                type="date"
                value={selectedDate}
                min={startDate}
                max={endDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Department Filter */}
          <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AttendanceStatsCard 
          title="Total Strength" 
          value={summary.totalStrength} 
          icon={<Users className="w-6 h-6 text-indigo-600" />}
          onClick={() => setDrillDownType('totalStrength')}
        />
        <AttendanceStatsCard 
          title="Present Today" 
          value={summary.presentCount} 
          icon={<UserCheck className="w-6 h-6 text-green-600" />}
          subtitle={`Includes ${summary.lateCount} Late`}
          onClick={() => setDrillDownType('present')}
        />
        <AttendanceStatsCard 
          title="Late Check-ins" 
          value={summary.lateCount} 
          icon={<Clock className="w-6 h-6 text-amber-600" />}
          onClick={() => setDrillDownType('late')}
        />
        <AttendanceStatsCard 
          title="Absent Today" 
          value={summary.absentCount} 
          icon={<UserX className="w-6 h-6 text-red-600" />}
          onClick={() => setDrillDownType('absent')}
        />
      </div>

      {/* Export & Actions bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-transparent">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800">Attendance Roll Call</h2>
          <div className="relative flex items-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 rounded-xl font-semibold transition-all border border-indigo-100 shadow-sm cursor-pointer" title="Click to pick specific date">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            <span className="text-xs font-mono select-none">{formatDateLabel(selectedDate)}</span>
            <input
              type="date"
              value={selectedDate}
              max={getISTToday()}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const today = getISTToday();
                  const targetDate = val > today ? today : val;
                  setSelectedDate(targetDate);
                  setPreset('specific');
                  setStartDate(targetDate);
                  setEndDate(targetDate);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        </div>
        
        <ExportButton 
          records={records}
          summary={summary}
          dateRange={{ startDate, endDate }}
          selectedDate={selectedDate}
        />
      </div>

      {/* Main Table Area */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <span className="text-sm font-bold text-gray-500">Generating report data...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center font-medium shadow-sm">
          {error}
        </div>
      ) : (
        <AttendanceTable 
          records={records}
          onDetailClick={(rec) => setSelectedRecord(rec)}
        />
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <AttendanceDetailModal
          record={selectedRecord}
          selectedDate={selectedDate}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* Drill Down Modal */}
      {drillDownType && (
        <AttendanceDrillDownModal
          isOpen={!!drillDownType}
          onClose={() => setDrillDownType(null)}
          type={drillDownType}
          records={records}
          selectedDate={selectedDate}
          departmentName={
            selectedDeptId === 'All'
              ? 'All Departments'
              : departments.find(d => d.id === selectedDeptId)?.department_name || 'Department'
          }
        />
      )}
    </div>
  );
}
