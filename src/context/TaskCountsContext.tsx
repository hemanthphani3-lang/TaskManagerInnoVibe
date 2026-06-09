"use client";

// src/context/TaskCountsContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToTaskCounts } from '@/lib/realtime/tasksCountsChannel';

export interface TaskCounts {
  total: number;
  assignedToMe: number;
  assignedByMe: number;
  pending: number;
  completed: number;
  overdue: number;
  highPriority: number;
}

const TaskCountsContext = createContext<TaskCounts | undefined>(undefined);

export const TaskCountsProvider = ({ children }: { children: React.ReactNode }) => {
  const [counts, setCounts] = useState<TaskCounts>({
    total: 0,
    assignedToMe: 0,
    assignedByMe: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    highPriority: 0,
  });

  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/tasks/counts');
      if (!res.ok) {
        throw new Error(`Failed to fetch task counts: ${res.statusText}`);
      }
      const data = await res.json();
      setCounts({
        total: data.total_tasks ?? 0,
        assignedToMe: data.assigned_to_me ?? 0,
        assignedByMe: data.assigned_by_me ?? 0,
        pending: data.pending_tasks ?? 0,
        completed: data.completed_tasks ?? 0,
        overdue: data.overdue_tasks ?? 0,
        highPriority: data.high_priority_tasks ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch task counts', err);
    }
  };

  useEffect(() => {
    fetchCounts();
    subscribeToTaskCounts(() => {
      fetchCounts();
    });
  }, []);

  return <TaskCountsContext.Provider value={counts}>{children}</TaskCountsContext.Provider>;
};

export const useTaskCounts = () => {
  const ctx = useContext(TaskCountsContext);
  if (!ctx) {
    throw new Error('useTaskCounts must be used within a TaskCountsProvider');
  }
  return ctx;
};
