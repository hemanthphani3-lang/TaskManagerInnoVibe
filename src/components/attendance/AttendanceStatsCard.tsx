import React from 'react';
import styles from './attendance.module.css';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export default function AttendanceStatsCard({ title, value, subtitle, icon, onClick }: StatsCardProps) {
  const isInteractive = !!onClick;
  return (
    <div 
      onClick={onClick}
      className={`${styles.glass} ${styles.card} flex flex-row items-center justify-between p-6 rounded-xl transition-all duration-300 ${
        isInteractive 
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200/60 border border-transparent' 
          : ''
      }`}
    >
      <div className="flex flex-col items-start text-left">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</span>
        <span className="text-3xl font-bold text-gray-800">{value}</span>
        {subtitle && <span className="text-xs text-gray-400 mt-1">{subtitle}</span>}
      </div>
      {icon && (
        <div className={`p-3 rounded-lg text-indigo-600 ${isInteractive ? 'bg-indigo-50 group-hover:bg-indigo-100' : 'bg-indigo-50'}`}>
          {icon}
        </div>
      )}
    </div>
  );
}
