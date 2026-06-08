"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge"
import { PriorityBadge } from "@/components/tasks/PriorityBadge"
import { Calendar, ListTodo, Search, AlertOctagon } from "lucide-react"
import { motion } from "framer-motion"

export interface Employee {
  employee_name: string
  profile_photo: string | null
  departments?: { department_name: string } | null
}

export interface Task {
  id: string
  task_title: string
  task_description: string
  task_status: string
  priority_level: string
  due_date: string
  employees: Employee | null
  is_escalated?: boolean
}

interface TasksTableProps {
  tasks: Task[]
  basePath?: string
}

export function TasksTable({ tasks, basePath = "/department/tasks" }: TasksTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  const filtered = tasks.filter(t =>
    t.task_title.toLowerCase().includes(search.toLowerCase()) ||
    t.task_description?.toLowerCase().includes(search.toLowerCase()) ||
    (t.employees?.employee_name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
        <h3 className="font-bold text-slate-900 dark:text-white">All Tasks</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
              <th className="p-4 font-semibold">Task</th>
              <th className="p-4 font-semibold">Assignee</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Priority</th>
              <th className="p-4 font-semibold">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
            {filtered.length > 0 ? (
              filtered.map((task, idx) => {
                const emp = task.employees
                return (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    key={task.id}
                    onClick={() => router.push(`${basePath}/${task.id}`)}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-[#0066FF] dark:group-hover:text-blue-400 transition-colors">{task.task_title}</p>
                        {task.is_escalated && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 px-2 py-0.5 rounded">
                            <AlertOctagon className="w-3 h-3" />
                            Escalated
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-1 max-w-md">{task.task_description}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {emp?.profile_photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={emp.profile_photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-[#0066FF] dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                            {emp?.employee_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{emp?.employee_name}</span>
                          {emp?.departments?.department_name && (
                            <span className="text-[10px] text-slate-500">{emp.departments.department_name}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <TaskStatusBadge status={task.task_status} />
                    </td>
                    <td className="p-4">
                      <PriorityBadge priority={task.priority_level} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{task.due_date}</span>
                      </div>
                    </td>
                  </motion.tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <ListTodo className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p>{search ? `No tasks match "${search}"` : "No tasks found. Create one to get started."}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
