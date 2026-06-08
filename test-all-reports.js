require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testReports() {
  const types = ['ATTENDANCE', 'PRODUCTIVITY', 'TASKS'];
  const formats = ['PDF', 'EXCEL', 'CSV'];
  
  for (const type of types) {
    console.log(`\n--- Fetching Data for ${type} ---`);
    let query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    if (type === 'ATTENDANCE') {
      query = supabase.from('attendance').select('*, employees(employee_name, employee_code), departments(department_name)').gte('created_at', startDate.toISOString());
    } else if (type === 'PRODUCTIVITY') {
      query = supabase.from('productivity_scores').select('*, employees(employee_name, employee_code), departments(department_name)');
    } else if (type === 'TASKS') {
      query = supabase.from('tasks').select('*, employees!assigned_employee_id(employee_name, employee_code), departments!department_id(department_name)').gte('created_at', startDate.toISOString());
    }
    
    const { data: rawData, error } = await query;
    if (error) {
      console.error(`[ERROR] Supabase Error for ${type}:`, error.message);
      continue;
    }
    
    console.log(`Fetched ${rawData.length} rows for ${type}.`);
    
    // Transform Data
    let formattedData = [];
    if (type === 'ATTENDANCE') {
      formattedData = rawData.map(a => ({
        Date: a.created_at.split('T')[0], Employee: a.employees?.employee_name || '-', Code: a.employees?.employee_code || '-',
        Department: a.departments?.department_name || '-', Status: a.attendance_status, WorkStatus: a.work_status, WorkingHours: a.working_hours || '0h 0m'
      }));
    } else if (type === 'PRODUCTIVITY') {
      formattedData = rawData.map(p => ({
        Employee: p.employees?.employee_name || '-', Code: p.employees?.employee_code || '-', Department: p.departments?.department_name || '-',
        Score: p.productivity_score, CompletedTasks: p.completed_tasks, DelayedTasks: p.delayed_tasks, AttendanceRate: p.attendance_percentage + '%'
      }));
    } else if (type === 'TASKS') {
      formattedData = rawData.map(t => ({
        Title: t.task_title, Priority: t.task_priority, Status: t.task_status, AssignedTo: t.employees?.employee_name || '-',
        Department: t.departments?.department_name || '-', DueDate: t.due_date, CompletedAt: t.completed_at ? t.completed_at.split('T')[0] : 'Pending'
      }));
    }
    
    if (formattedData.length === 0) {
      console.log(`Skipping generation, no data for ${type}. (Will show toast in UI)`);
      continue;
    }

    for (const format of formats) {
      console.log(`Generating ${format} for ${type}...`);
      try {
        const filename = `test_${type}.${format.toLowerCase()}`;
        if (format === 'EXCEL' || format === 'CSV') {
          const worksheet = XLSX.utils.json_to_sheet(formattedData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
          // Just verifying it doesn't throw during creation
          if (!worksheet || !workbook) throw new Error("XLSX creation failed");
        } else if (format === 'PDF') {
          const doc = new jsPDF('landscape');
          const headers = Object.keys(formattedData[0]);
          const rows = formattedData.map(obj => Object.values(obj).map(v => String(v)));
          autoTable(doc, { head: [headers], body: rows });
          // Verify it works
          if (!doc) throw new Error("jsPDF creation failed");
        }
        console.log(`[SUCCESS] ${format} generated successfully!`);
      } catch (err) {
        console.error(`[FAILED] ${format} error:`, err);
      }
    }
  }
}

testReports();
