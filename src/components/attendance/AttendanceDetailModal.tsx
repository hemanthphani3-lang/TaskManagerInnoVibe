"use client";

import React, { useState, useEffect } from 'react';
import styles from './attendance.module.css';
import { X, Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { getUserDailySessions } from '@/app/actions/attendance';

interface AttendanceDetailModalProps {
  record: {
    userId: string;
    name: string;
    role: string;
    departmentName: string;
    attendancePercentage: number;
    history: Record<string, 'Present' | 'Late' | 'Absent'>;
    sessions: any[];
  };
  selectedDate: string;
  onClose: () => void;
}

export default function AttendanceDetailModal({ record, selectedDate, onClose }: AttendanceDetailModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [activeDate, setActiveDate] = useState(selectedDate);
  const [activeSessions, setActiveSessions] = useState<any[]>(record.sessions);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // When active date changes, fetch daily sessions
  useEffect(() => {
    if (activeDate === selectedDate) {
      setActiveSessions(record.sessions);
      return;
    }

    async function loadSessions() {
      setLoadingSessions(true);
      try {
        const data = await getUserDailySessions(record.userId, activeDate);
        setActiveSessions(data);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setLoadingSessions(false);
      }
    }

    loadSessions();
  }, [activeDate, record.userId, selectedDate, record.sessions]);

  // Calendar month helpers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Adjusted to make Monday first day of week:
    // Sunday (0) becomes 6, Monday (1) becomes 0, etc.
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    return { startOffset, totalDays };
  };

  const { startOffset, totalDays } = getDaysInMonth(currentMonth);

  // Generate calendar grid
  const daysGrid = [];
  // Empty slots for offsets
  for (let i = 0; i < startOffset; i++) {
    daysGrid.push(null);
  }
  // Days of month
  for (let d = 1; d <= totalDays; d++) {
    daysGrid.push(d);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDayStatus = (dayNum: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return record.history[dateStr] || null;
  };

  const handleDateClick = (dayNum: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    setActiveDate(`${year}-${month}-${day}`);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={`${styles.modalContent} !max-w-3xl !w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Profile & Interactive Calendar */}
        <div className="flex-1 p-6 border-r border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{record.name}</h2>
              <p className="text-sm text-gray-500">{record.role} • {record.departmentName}</p>
            </div>
            <div className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 font-semibold text-sm">
              {record.attendancePercentage}% Present
            </div>
          </div>

          {/* Calendar Controller */}
          <div className="flex items-center justify-between mb-3 bg-gray-50 p-2 rounded-lg">
            <span className="text-sm font-bold text-gray-700">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <div className="flex space-x-1">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>

          <div className="grid grid-cols-7 gap-1 flex-1 min-h-[200px]">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="p-2"></div>;
              }

              const status = getDayStatus(day);
              const year = currentMonth.getFullYear();
              const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
              const dStr = String(day).padStart(2, '0');
              const dateKey = `${year}-${month}-${dStr}`;
              const isSelected = activeDate === dateKey;

              let statusColor = "bg-transparent text-gray-700 border border-transparent";
              if (status === 'Present') {
                statusColor = "bg-green-50 text-green-700 border border-green-200";
              } else if (status === 'Late') {
                statusColor = "bg-amber-50 text-amber-700 border border-amber-200";
              } else if (status === 'Absent') {
                statusColor = "bg-red-50 text-red-700 border border-red-200";
              }

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => handleDateClick(day)}
                  className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 font-medium relative ${statusColor} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 font-bold' : ''}`}
                >
                  <span>{day}</span>
                  {status && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${
                      status === 'Present' ? 'bg-green-500' :
                      status === 'Late' ? 'bg-amber-500' : 'bg-red-500'
                    }`}></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 mt-4 text-xs font-medium text-gray-500 pt-3 border-t border-gray-100">
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5"></span>Present</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5"></span>Late</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></span>Absent</span>
          </div>
        </div>

        {/* Right Side: Detailed Sessions */}
        <div className="w-full md:w-[320px] bg-gray-50 p-6 flex flex-col border-t md:border-t-0 md:border-l border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
              Day Details
            </h3>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Selected Date</span>
            <span className="text-sm font-bold text-gray-700">
              {new Date(activeDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Sessions History</span>
            
            {loadingSessions ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
                <span className="text-xs">Loading sessions...</span>
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="bg-white border border-gray-100 p-4 rounded-xl text-center flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <span className="text-sm font-semibold text-gray-700">No sessions recorded</span>
                <span className="text-xs text-gray-400 mt-1">This user did not check in on this day.</span>
              </div>
            ) : (
              activeSessions.map((session, index) => (
                <div key={session.session_id || index} className="bg-white border border-gray-100 p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                      Session #{index + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      session.status === 'ACTIVE' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-gray-600 font-medium">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-2 text-green-500" />
                      <span>Check-in: <strong className="text-gray-800">{session.login_time || 'N/A'}</strong></span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-2 text-red-400" />
                      <span>Check-out: <strong className="text-gray-800">{session.logout_time || 'Active'}</strong></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
