"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface AttendanceChartProps {
  data: {
    date: string
    present: number
    absent: number
  }[]
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-100 shadow-sm h-[400px]">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#0A1A2F]">Attendance Trends</h3>
        <p className="text-sm text-slate-500">7-day workforce presence overview</p>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              allowDecimals={false}
              label={{ value: 'Employees', angle: -90, position: 'insideLeft', offset: 20, style: { fill: '#94A3B8', fontSize: 11 } }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              cursor={{ fill: '#F1F5F9' }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Bar 
              dataKey="present" 
              name="Present"
              fill="#10B981" 
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
            <Bar 
              dataKey="absent" 
              name="Absent"
              fill="#EF4444" 
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
