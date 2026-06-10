import React from 'react';
import styles from './attendance.module.css';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function AttendanceStatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <div className={`${styles.glass} ${styles.card} flex flex-row items-center justify-between p-6 rounded-xl hover:shadow-md transition-all duration-300`}>
      <div className="flex flex-col items-start text-left">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</span>
        <span className="text-3xl font-bold text-gray-800">{value}</span>
        {subtitle && <span className="text-xs text-gray-400 mt-1">{subtitle}</span>}
      </div>
      {icon && (
        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
          {icon}
        </div>
      )}
    </div>
  );
}
