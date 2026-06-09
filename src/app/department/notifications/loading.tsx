export default function DepartmentNotificationsLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg" />
              <div className="space-y-1.5">
                <div className="h-5 w-32 bg-slate-200 rounded" />
                <div className="h-3.5 w-48 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-9 w-28 bg-slate-100 rounded-lg" />
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 flex gap-4">
                <div className="mt-1 w-5 h-5 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-48 bg-slate-200 rounded" />
                    <div className="h-3.5 w-16 bg-slate-100 rounded" />
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 rounded" />
                  <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
