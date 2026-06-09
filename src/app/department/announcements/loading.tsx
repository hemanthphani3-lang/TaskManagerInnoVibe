export default function DepartmentAnnouncementsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
      </div>
      {/* Broadcast form skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-10 w-full bg-slate-100 rounded-xl" />
        <div className="h-24 w-full bg-slate-100 rounded-xl" />
        <div className="h-10 w-32 bg-blue-100 rounded-xl" />
      </div>
      {/* Announcement cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-3.5 w-full bg-slate-100 rounded" />
              <div className="h-3.5 w-4/5 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
