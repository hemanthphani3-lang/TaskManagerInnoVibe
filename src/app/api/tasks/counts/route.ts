export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getCurrentUserRoleAndProfile } from '@/app/actions/tasks';

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileRes = await getCurrentUserRoleAndProfile();
    if (!profileRes.success) return NextResponse.json({ error: 'Profile fetch error' }, { status: 500 });

    const role = profileRes.role;
    const userId = user.id;
    const deptName = profileRes.profile?.department || '';

    const { searchParams } = new URL(request.url);
    const deptId = searchParams.get('dept_id');

    const adminClient = getSupabaseAdmin();

    // Get task IDs where the user is an assignee (needed for Employee queries)
    const { data: assigneeRecords } = await adminClient
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', userId);
    const userAssignedTaskIds = assigneeRecords?.map((r: { task_id: string }) => r.task_id) || [];

    // Fetch relevant tasks based on role to compute counts
    let query = adminClient
      .from('tasks')
      .select('*, task_assignees(*)');

    if (role === 'ADMIN') {
      if (deptId) {
        query = query.eq('department_id', deptId);
      }
    } else if (role === 'DEPARTMENT') {
      // Fetch all employee IDs in the department
      const { data: emps } = await adminClient
        .from('employees')
        .select('id')
        .eq('department_id', userId);
      const empIds = emps?.map(e => e.id) || [];

      // Fetch task IDs where any employee or department head is assigned
      const { data: deptAssigneeRecords } = await adminClient
        .from('task_assignees')
        .select('task_id')
        .in('user_id', [...empIds, userId]);
      const deptTaskIds = deptAssigneeRecords?.map(r => r.task_id) || [];

      if (deptTaskIds.length > 0) {
        query = query.or(`id.in.(${deptTaskIds.map(id => `"${id}"`).join(',')}),created_by.eq.${userId},department.eq."${deptName}",department_id.eq.${userId}`);
      } else {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId},department.eq."${deptName}",department_id.eq.${userId}`);
      }
    } else if (role === 'EMPLOYEE') {
      if (userAssignedTaskIds.length > 0) {
        query = query.or(`id.in.(${userAssignedTaskIds.map(id => `"${id}"`).join(',')}),created_by.eq.${userId}`);
      } else {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId},assigned_employee_id.eq.${userId}`);
      }
    }

    const { data: tasks, error: queryErr } = await query;
    if (queryErr) {
      return NextResponse.json({ error: queryErr.message }, { status: 500 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let total_tasks = 0;
    let assigned_to_me = 0;
    let assigned_by_me = 0;
    let pending_tasks = 0;
    let completed_tasks = 0;
    let overdue_tasks = 0;
    let high_priority_tasks = 0;

    (tasks || []).forEach(task => {
      const assignees = (task.task_assignees as any[]) || [];
      const userAssignee = assignees.find(a => a.user_id === userId);
      // Prioritize assignee progress status for the user
      const status = userAssignee?.status || task.status || task.task_status || 'PENDING';
      
      const isAssignedToMe = task.assigned_to === userId || assignees.some(a => a.user_id === userId);
      const isAssignedByMe = task.created_by === userId;
      const priority = task.priority || (task as any).priority_level || 'MEDIUM';
      const dueDate = task.deadline || task.due_date || '';

      total_tasks++;
      if (isAssignedToMe) assigned_to_me++;
      if (isAssignedByMe) assigned_by_me++;
      
      if (status === 'COMPLETED') {
        completed_tasks++;
      } else {
        pending_tasks++;
        if (dueDate && dueDate < todayStr) {
          overdue_tasks++;
        }
      }
      if (priority === 'HIGH' || priority === 'CRITICAL') {
        high_priority_tasks++;
      }
    });

    return NextResponse.json({
      total_tasks,
      assigned_to_me,
      assigned_by_me,
      pending_tasks,
      completed_tasks,
      overdue_tasks,
      high_priority_tasks
    });
  } catch (err: any) {
    console.error("CRITICAL ERROR inside /api/tasks/counts:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
