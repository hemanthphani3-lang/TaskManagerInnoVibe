import AdminAttendanceView from "@/components/attendance/AdminAttendanceView";

export default function AdminAttendancePage() {
  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 font-inter">Attendance Dashboard</h1>
      <AdminAttendanceView />
    </main>
  );
}
