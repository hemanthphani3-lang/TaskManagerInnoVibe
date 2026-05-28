import { Activity } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="p-8 pb-20 w-full animate-pulse">
      <header className="mb-8 flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-4 bg-slate-200 rounded w-48"></div>
        </div>
        <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/50 border border-slate-100 rounded-2xl p-6 h-32 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-100 rounded w-24"></div>
              <div className="h-6 bg-slate-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-white/50 border border-slate-100 rounded-2xl h-64 p-6">
            <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl"></div>)}
            </div>
          </div>
        </div>
        <div className="col-span-1">
          <div className="bg-white/50 border border-slate-100 rounded-2xl h-[400px] flex items-center justify-center">
            <Activity className="w-8 h-8 text-slate-300 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
