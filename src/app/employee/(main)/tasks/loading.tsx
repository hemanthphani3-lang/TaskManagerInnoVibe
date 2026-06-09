export default function TasksLoading() {
  return (
    <div className="p-4 sm:p-8 space-y-6 animate-pulse">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-slate-200 rounded" />
          <div className="h-4 w-60 bg-slate-100 rounded" />
        </div>
        <div className="h-10 w-32 bg-blue-100 rounded-xl" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 bg-slate-100 rounded-lg" />
        ))}
      </div>

      {/* Task cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-3/4 bg-slate-200 rounded" />
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-100 rounded" />
              <div className="h-3.5 w-4/5 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
