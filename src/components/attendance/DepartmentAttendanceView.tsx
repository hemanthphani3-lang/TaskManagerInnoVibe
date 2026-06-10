"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getAttendanceReport } from '@/app/actions/attendance';
import AttendanceTable from './AttendanceTable';
import AttendanceStatsCard from './AttendanceStatsCard';
import ExportButton from './ExportButton';
import AttendanceDetailModal from './AttendanceDetailModal';
import { Calendar, Users, UserCheck, Clock, UserX, Loader2 } from 'lucide-react';

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

export default function DepartmentAttendanceView() {
  const supabase = createClient();
  
  // Department Head ID
  const [deptId, setDeptId] = useState<string | null>(null);

  // Date ranges
  const [preset, setPreset] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [startDate, setStartDate] = useState(getISTToday());
  const [endDate, setEndDate] = useState(getISTToday());
  const [selectedDate, setSelectedDate] = useState(getISTToday());

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

  // Fetch department head user info to get ID
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setDeptId(user.id);
      }
    }
    loadUser();
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
    }
  }, [preset]);

  // Fetch attendance report data
  const fetchReport = useCallback(async () => {
    if (!deptId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getAttendanceReport(startDate, endDate, selectedDate, deptId);
      setRecords(data.records);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Failed to load department attendance report:", err);
      setError(err.message || "An unexpected error occurred while loading department attendance.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedDate, deptId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Realtime Supabase subscription
  useEffect(() => {
    if (!deptId) return;

    const channelName = `realtime_attendance_dept_${deptId}_${Date.now()}`;
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'work_sessions',
          filter: `department_id=eq.${deptId}`
        },
        () => {
          fetchReport();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, deptId, fetchReport]);

  if (!deptId) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <span className="text-sm font-semibold text-gray-500">Verifying session...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter Bar */}
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
        </div>

        {/* Custom Date Inputs */}
        <div className="flex flex-wrap items-center gap-3">
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
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AttendanceStatsCard 
          title="Department Strength" 
          value={summary.totalStrength} 
          icon={<Users className="w-6 h-6 text-indigo-600" />}
        />
        <AttendanceStatsCard 
          title="Present Today" 
          value={summary.presentCount} 
          icon={<UserCheck className="w-6 h-6 text-green-600" />}
          subtitle={`Includes ${summary.lateCount} Late`}
        />
        <AttendanceStatsCard 
          title="Late Check-ins" 
          value={summary.lateCount} 
          icon={<Clock className="w-6 h-6 text-amber-600" />}
        />
        <AttendanceStatsCard 
          title="Absent Today" 
          value={summary.absentCount} 
          icon={<UserX className="w-6 h-6 text-red-600" />}
        />
      </div>

      {/* Export & Actions bar */}
      <div className="flex justify-between items-center bg-transparent">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          Department Roll Call
          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md ml-2 font-semibold font-mono">
            {selectedDate}
          </span>
        </h2>
        
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
    </div>
  );
}
