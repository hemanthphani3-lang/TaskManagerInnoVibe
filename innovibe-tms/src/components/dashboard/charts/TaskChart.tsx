"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface TaskChartProps {
  data: {
    name: string
    completed: number
    pending: number
    delayed: number
  }[]
}

export function TaskChart({ data }: TaskChartProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-100 shadow-sm h-[400px]">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#0A1A2F]">Task Completion</h3>
        <p className="text-sm text-slate-500">Department performance breakdown</p>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <Tooltip 
              cursor={{ fill: '#F1F5F9' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            />
            <Legend 
              iconType="circle"
              wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#64748B' }}
            />
            <Bar dataKey="completed" name="Completed" stackId="a" fill="#0066FF" radius={[0, 0, 4, 4]} />
            <Bar dataKey="pending" name="Pending" stackId="a" fill="#94A3B8" />
            <Bar dataKey="delayed" name="Delayed" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
